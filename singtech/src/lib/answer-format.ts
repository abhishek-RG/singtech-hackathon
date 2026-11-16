import { sourceHref } from "./source-links";
// The gateway answers as "SUMMARY: ... ACTIONS: - ...". These helpers turn that into the blocks the UI and Chatter render.
// They also work on a partial answer while tokens stream in.

export interface ParsedAnswer {
  summary: string;
  actions: string[];
}

export function parseAnswer(text: string): ParsedAnswer {
  const [head, tail = ""] = text.split(/\s*\bACTIONS:\s*/i);
  const summary = head.replace(/^\s*SUMMARY:\s*/i, "").trim();
  const actions = tail
    .split(/\n+|(?:^|\s)-\s(?=[A-Z])/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    // "No further actions are specified" is not an action.
    .filter((line) => line && !/^(no|none)\b.*\b(actions?|steps?)\b/i.test(line) && !/^(none|n\/a)\.?$/i.test(line));
  return { summary, actions };
}

// Problems (bill IDs, incidents, disputes, risk) get a "Root Cause" heading; everything else is a plain "Answer".
export const summaryHeading = (question: string) =>
  /SGT-INV-|INC-\d|dispute|why\b|issue|fail|reject|overdue|escalat|outage|churn|risk|late|delay|problem/i.test(question) ? "Root Cause" : "Answer";

export interface AnswerBlock {
  heading: string;
  lines: string[];
  isList?: boolean;
}

const isWeb = (url: string) => /^https:\/\//.test(url);

// appOrigin (the public SingTech AI address) lets a cited SingTech record link to its page in the app from Chatter.
export function answerBlocks(question: string, answer: string, citations: { id?: string; title: string; source: string }[], appOrigin?: string): AnswerBlock[] {
  const { summary, actions } = parseAnswer(answer);
  const blocks: AnswerBlock[] = [{ heading: summaryHeading(question), lines: [summary || "No answer was found."] }];
  if (actions.length) blocks.push({ heading: "Next Actions", lines: actions, isList: true });
  if (citations.length) {
    // Several passages from one record share a line: "[1, 2] Orchid Bay Medical Group: account history".
    const groups = new Map<string, { nums: number[]; title: string; source: string; href?: string }>();
    // The web UI exposes every citation on demand. Chatter is a hand-off surface, so keep its evidence section to the
    // three passages that substantiate the answer instead of letting links overwhelm the decision and next action.
    // Keep the sources that the answer actually cites first. Slicing the first three citations and then renumbering
    // them would make a valid [4] marker point at the wrong record in Chatter.
    const referenced = [...new Set(Array.from(answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)).flatMap((match) => match[1].match(/\d+/g) ?? []).map(Number).filter((n) => n >= 1 && n <= citations.length))];
    const indexes = [...referenced.map((n) => n - 1), ...citations.map((_, index) => index).filter((index) => !referenced.includes(index + 1))].slice(0, 3);
    indexes.forEach((index) => {
      const c = citations[index];
      const key = `${c.title}|${c.source}`;
      const path = appOrigin && c.id ? sourceHref(c.id) : undefined;
      const g = groups.get(key) ?? { nums: [], title: c.title, source: c.source, href: path && `${appOrigin}${path}` };
      groups.set(key, { ...g, nums: [...g.nums, index + 1] });
    });
    blocks.push({
      heading: "Sources",
      lines: [...groups.values()].map((g) => `[${g.nums.join(", ")}] ${g.title}${isWeb(g.source) ? ` (${g.source.slice(0, 200)})` : g.href ? ` (SingTech record, sample data: ${g.href})` : " (SingTech records, sample data)"}`),
      isList: true,
    });
  }
  return blocks;
}

export const blocksToText = (blocks: AnswerBlock[]) => blocks.map((b) => [b.heading, ...b.lines.map((l) => (b.isList ? `- ${l}` : l))].join("\n")).join("\n\n");
