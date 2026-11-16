import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const files = walk(SRC).filter((f) => /\.(tsx?|json|css)$/.test(f));

const offending = (pattern: RegExp, paths = files) =>
  paths.flatMap((path) =>
    readFileSync(path, "utf8")
      .split("\n")
      .flatMap((line, i) => (pattern.test(line) ? [`${relative(SRC, path)}:${i + 1}: ${line.trim()}`] : [])),
  );

const stringValues = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(stringValues)
      : value && typeof value === "object"
        ? Object.values(value).flatMap(stringValues)
        : [];

// UI-facing code (not API routes or lib) and seed data shown to reps.
const uiFiles = files.filter((f) => /[/\\](components|app)[/\\]/.test(f) && !/[/\\]app[/\\]api[/\\]/.test(f));
const BANNED = /\b(New logo|Whitespace|Simulated|Farming|Hunting|Offline|API key|Privacy Audit|Demo account|Claude)\b|\bsimulated\b(?!-telemetry)|\boffline\b|\bnew logo\b|(?<!-)\bwhitespace\b(?!-)|\bdemo account\b/;
// Case-sensitive on purpose: internal enum values such as mode "farming" never render as text.

describe("copy guard (CLAUDE.md section 1 and 2)", () => {
  it("scans the source tree", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("has no em dashes or en dashes", () => {
    expect(offending(/[\u2014\u2013]/)).toEqual([]);
  });

  it("has no emoji", () => {
    expect(offending(/[\p{Extended_Pictographic}\u{FE0F}]/u)).toEqual([]);
  });

  it("has no purple, violet, indigo, or fuchsia Tailwind colours", () => {
    expect(offending(/\b(?:purple|violet|indigo|fuchsia)-\d{2,3}\b/)).toEqual([]);
  });

  it("has no exclamation marks in seed copy", () => {
    const hits = files
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => stringValues(JSON.parse(readFileSync(f, "utf8"))).filter((s) => s.includes("!")).map((s) => `${relative(SRC, f)}: ${s}`));
    expect(hits).toEqual([]);
  });

  it("keeps developer jargon out of the rep-facing UI and seed copy (STARTHere.md 1.1)", () => {
    expect(uiFiles.length).toBeGreaterThan(10);
    expect(offending(BANNED, uiFiles.filter((f) => !f.endsWith(".json")))).toEqual([]);
    const hits = files
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) =>
        stringValues(JSON.parse(readFileSync(f, "utf8")))
          .filter((v) => v !== "simulated-telemetry" && BANNED.test(v))
          .map((v) => `${relative(SRC, f)}: ${v}`),
      );
    expect(hits).toEqual([]);
  });
});
