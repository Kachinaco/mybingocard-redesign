const net = require("node:net");
const tls = require("node:tls");

const SMTP_TIMEOUT_MS = 30000;

function extractEmailAddress(value) {
  const match = String(value).match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return match?.[1] || String(value).trim();
}

function encodeHeader(value) {
  value = String(value || "");
  return /^[\x00-\x7f]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function sanitizeHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function dotStuff(value) {
  return String(value).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function generateMessageId(from) {
  const domain = extractEmailAddress(from).split("@")[1] || "mybingocard.com";
  const random = Math.random().toString(36).slice(2);
  return `<${Date.now().toString(36)}.${random}@${domain}>`;
}

class SmtpConnection {
  constructor(socket) {
    this.socket = socket;
    this.buffer = "";
    this.pending = null;
    this.attach();
  }

  attach() {
    this.socket.setTimeout(SMTP_TIMEOUT_MS);
    this.socket.on("data", (chunk) => this.onData(chunk.toString("utf8")));
    this.socket.on("error", (error) => this.pending?.reject(error));
    this.socket.on("timeout", () => {
      this.pending?.reject(new Error("SMTP connection timed out"));
      this.socket.destroy();
    });
  }

  onData(data) {
    this.buffer += data;
    let index;
    while ((index = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      this.handleLine(line);
    }
  }

  handleLine(line) {
    if (!this.pending) return;
    this.pending.lines.push(line);
    if (/^\d{3} /.test(line)) {
      const code = Number(line.slice(0, 3));
      const message = this.pending.lines.join("\n");
      const pending = this.pending;
      this.pending = null;
      if (code >= 400) pending.reject(new Error(`SMTP ${code}: ${message}`));
      else pending.resolve({ code, message });
    }
  }

  read() {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, lines: [] };
    });
  }

  command(command) {
    this.socket.write(`${command}\r\n`);
    return this.read();
  }

  async upgradeToTls(host) {
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.attach();
    await new Promise((resolve, reject) => {
      this.socket.once("secureConnect", resolve);
      this.socket.once("error", reject);
    });
  }

  end() {
    this.socket.end();
  }
}

function connect(host, port, secure) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    const cleanup = () => {
      socket.off("error", onError);
      socket.off("connect", onConnect);
      socket.off("secureConnect", onConnect);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onConnect = () => {
      cleanup();
      resolve(new SmtpConnection(socket));
    };
    socket.once("error", onError);
    socket.once(secure ? "secureConnect" : "connect", onConnect);
  });
}

function buildMessage(mail) {
  const boundary = `mbc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const messageId = mail.messageId || generateMessageId(mail.from);
  const headers = {
    From: mail.from,
    To: mail.to,
    Subject: encodeHeader(mail.subject),
    Date: new Date().toUTCString(),
    "Message-ID": messageId,
    "MIME-Version": "1.0",
    "Content-Type": `multipart/alternative; boundary="${boundary}"`,
    ...(mail.inReplyTo ? { "In-Reply-To": mail.inReplyTo } : {}),
    ...(mail.references ? { References: mail.references } : {}),
    ...(mail.headers || {}),
  };

  return {
    messageId,
    data: [
      Object.entries(headers).map(([key, value]) => `${key}: ${sanitizeHeader(value)}`).join("\r\n"),
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      mail.text || "",
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      mail.html || "",
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  };
}

async function sendMail(config, mail) {
  const host = config.host;
  const port = Number(config.port) || 587;
  const user = config.auth?.user;
  const pass = config.auth?.pass;
  if (!host || !user || !pass) throw new Error("Missing SMTP configuration");

  const connection = await connect(host, port, Boolean(config.secure || port === 465));
  const message = buildMessage(mail);
  try {
    await connection.read();
    await connection.command(`EHLO ${host}`);
    if (!(config.secure || port === 465)) {
      await connection.command("STARTTLS");
      await connection.upgradeToTls(host);
      await connection.command(`EHLO ${host}`);
    }
    await connection.command(`AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`, "utf8").toString("base64")}`);
    await connection.command(`MAIL FROM:<${extractEmailAddress(mail.from)}>`);
    await connection.command(`RCPT TO:<${extractEmailAddress(mail.to)}>`);
    await connection.command("DATA");
    await connection.command(`${dotStuff(message.data)}\r\n.`);
    await connection.command("QUIT");
    return { messageId: message.messageId };
  } finally {
    connection.end();
  }
}

module.exports = {
  createTransport(config) {
    return {
      sendMail(mail) {
        return sendMail(config, mail);
      },
    };
  },
};
