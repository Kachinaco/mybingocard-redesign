import net from "node:net";
import tls from "node:tls";

export type SmtpMail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  inReplyTo?: string;
  references?: string;
};

export type SmtpSendResult = {
  messageId: string;
};

const SMTP_TIMEOUT_MS = 30_000;

function getConfig() {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT) || 587;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration");
  }

  return { host, port, user, pass, secure: port === 465 };
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return match?.[1] || value.trim();
}

function encodeHeader(value: string): string {
  return /^[\x00-\x7f]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function dotStuff(value: string): string {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function generateMessageId(from: string): string {
  const domain = extractEmailAddress(from).split("@")[1] || "mybingocard.com";
  const random = Math.random().toString(36).slice(2);
  return `<${Date.now().toString(36)}.${random}@${domain}>`;
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";
  private pending:
    | {
        resolve: (value: { code: number; message: string }) => void;
        reject: (error: Error) => void;
        lines: string[];
      }
    | null = null;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.socket.setTimeout(SMTP_TIMEOUT_MS);
    this.socket.on("data", (chunk) => this.onData(chunk.toString("utf8")));
    this.socket.on("error", (error) => this.pending?.reject(error));
    this.socket.on("timeout", () => {
      this.pending?.reject(new Error("SMTP connection timed out"));
      this.socket.destroy();
    });
  }

  private onData(data: string) {
    this.buffer += data;
    let index: number;
    while ((index = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      this.handleLine(line);
    }
  }

  private handleLine(line: string) {
    if (!this.pending) return;
    this.pending.lines.push(line);
    if (/^\d{3} /.test(line)) {
      const code = Number(line.slice(0, 3));
      const message = this.pending.lines.join("\n");
      const pending = this.pending;
      this.pending = null;
      if (code >= 400) {
        pending.reject(new Error(`SMTP ${code}: ${message}`));
      } else {
        pending.resolve({ code, message });
      }
    }
  }

  read(): Promise<{ code: number; message: string }> {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, lines: [] };
    });
  }

  async command(command: string) {
    this.socket.write(`${command}\r\n`);
    return this.read();
  }

  async upgradeToTls(host: string) {
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.socket.setTimeout(SMTP_TIMEOUT_MS);
    this.socket.on("data", (chunk) => this.onData(chunk.toString("utf8")));
    this.socket.on("error", (error) => this.pending?.reject(error));
    this.socket.on("timeout", () => {
      this.pending?.reject(new Error("SMTP connection timed out"));
      this.socket.destroy();
    });
    await new Promise<void>((resolve, reject) => {
      this.socket.once("secureConnect", resolve);
      this.socket.once("error", reject);
    });
  }

  end() {
    this.socket.end();
  }
}

function connect(host: string, port: number, secure: boolean): Promise<SmtpConnection> {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    const cleanup = () => {
      socket.off("error", onError);
      socket.off("connect", onConnect);
      socket.off("secureConnect", onConnect);
    };
    const onError = (error: Error) => {
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

function buildMessage(mail: SmtpMail): { messageId: string; data: string } {
  const boundary = `mbc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const messageId = mail.headers?.["Message-ID"] || generateMessageId(mail.from);
  const headers: Record<string, string> = {
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

  const headerText = Object.entries(headers)
    .map(([key, value]) => `${key}: ${sanitizeHeader(value)}`)
    .join("\r\n");

  return {
    messageId,
    data: [
      headerText,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      mail.text,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      mail.html,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  };
}

export async function sendSmtpMail(mail: SmtpMail): Promise<SmtpSendResult> {
  const config = getConfig();
  const connection = await connect(config.host, config.port, config.secure);
  const message = buildMessage(mail);

  try {
    await connection.read();
    await connection.command(`EHLO ${config.host}`);
    if (!config.secure) {
      await connection.command("STARTTLS");
      await connection.upgradeToTls(config.host);
      await connection.command(`EHLO ${config.host}`);
    }
    const auth = Buffer.from(`\0${config.user}\0${config.pass}`, "utf8").toString("base64");
    await connection.command(`AUTH PLAIN ${auth}`);
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
