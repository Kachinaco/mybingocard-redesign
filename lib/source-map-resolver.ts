import { TraceMap, originalPositionFor, sourceContentFor } from "@jridgewell/trace-mapping";
import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

type RawFrame = {
  lineText: string;
  generatedFile: string;
  generatedLine: number;
  generatedColumn: number;
};

export type SourceMappedFrame = {
  generatedFile: string;
  generatedLine: number;
  generatedColumn: number;
  source: string;
  line: number;
  column: number;
  name: string | null;
  contextLine: string | null;
};

export type SymbolicatedStack = {
  stack: string | null;
  frames: SourceMappedFrame[];
};

const mapCache = new Map<string, TraceMap | null>();

function clampLine(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 300) : null;
}

function stackFrameRegex() {
  return /((?:https?:\/\/|file:\/\/)[^\s)]+?\.js|(?:\/|\.)?\.next\/[^\s)]+?\.js|\/[^\s)]+?\.js):(\d+):(\d+)/g;
}

function parseStack(stack: string | null | undefined): RawFrame[] {
  if (!stack) return [];
  const frames: RawFrame[] = [];
  for (const lineText of stack.split("\n")) {
    const re = stackFrameRegex();
    const match = re.exec(lineText);
    if (!match) continue;
    const generatedFile = match[1];
    const generatedLine = Number(match[2]);
    const generatedColumn = Number(match[3]);
    if (!generatedFile || !Number.isFinite(generatedLine) || !Number.isFinite(generatedColumn)) continue;
    frames.push({ lineText, generatedFile, generatedLine, generatedColumn });
  }
  return frames.slice(0, 20);
}

function localPathForGeneratedFile(generatedFile: string): string | null {
  let value = generatedFile;

  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      value = url.pathname;
    } else if (/^file:\/\//i.test(value)) {
      value = new URL(value).pathname;
    }
  } catch {
    return null;
  }

  if (value.startsWith("/_next/")) {
    return join(/* turbopackIgnore: true */ process.cwd(), ".next", value.slice("/_next/".length));
  }

  if (value.startsWith("/var/www/mybingocard.com/.next/")) {
    return normalize(value);
  }

  const nextIndex = value.indexOf(".next/");
  if (nextIndex >= 0) {
    return join(/* turbopackIgnore: true */ process.cwd(), value.slice(nextIndex));
  }

  return null;
}

function loadTraceMapForGeneratedFile(generatedFile: string): TraceMap | null {
  const localPath = localPathForGeneratedFile(generatedFile);
  if (!localPath) return null;

  const sourceMapPath = `${localPath}.map`;
  if (mapCache.has(sourceMapPath)) {
    return mapCache.get(sourceMapPath) || null;
  }

  if (!existsSync(sourceMapPath)) {
    mapCache.set(sourceMapPath, null);
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(sourceMapPath, "utf8"));
    const traceMap = new TraceMap(parsed);
    mapCache.set(sourceMapPath, traceMap);
    return traceMap;
  } catch {
    mapCache.set(sourceMapPath, null);
    return null;
  }
}

function mapFrame(frame: RawFrame): SourceMappedFrame | null {
  const traceMap = loadTraceMapForGeneratedFile(frame.generatedFile);
  if (!traceMap) return null;

  const original = originalPositionFor(traceMap, {
    line: frame.generatedLine,
    column: Math.max(0, frame.generatedColumn - 1),
  });

  if (!original.source || !original.line || original.column === null || original.column === undefined) {
    return null;
  }

  let contextLine: string | null = null;
  try {
    const content = sourceContentFor(traceMap, original.source);
    contextLine = clampLine(content?.split(/\r?\n/)[original.line - 1] || null);
  } catch {
    contextLine = null;
  }

  return {
    generatedFile: frame.generatedFile,
    generatedLine: frame.generatedLine,
    generatedColumn: frame.generatedColumn,
    source: original.source,
    line: original.line,
    column: original.column + 1,
    name: original.name || null,
    contextLine,
  };
}

export function symbolicateStack(stack: string | null | undefined): SymbolicatedStack {
  const rawFrames = parseStack(stack);
  const mappedFrames = rawFrames
    .map((frame) => ({ frame, mapped: mapFrame(frame) }))
    .filter((item): item is { frame: RawFrame; mapped: SourceMappedFrame } => Boolean(item.mapped));

  if (!stack || mappedFrames.length === 0) {
    return { stack: null, frames: mappedFrames.map((item) => item.mapped) };
  }

  const output = stack.split("\n").map((lineText) => {
    const found = mappedFrames.find((item) => item.frame.lineText === lineText);
    if (!found) return lineText;
    const mapped = found.mapped;
    const suffix = `${mapped.source}:${mapped.line}:${mapped.column}${mapped.name ? ` ${mapped.name}` : ""}`;
    return `${lineText}\n    -> ${suffix}${mapped.contextLine ? `\n       ${mapped.contextLine}` : ""}`;
  }).join("\n");

  return {
    stack: output.slice(0, 6000),
    frames: mappedFrames.map((item) => item.mapped),
  };
}
