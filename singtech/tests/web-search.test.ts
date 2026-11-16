import { describe, expect, it } from "vitest";
import { parseWikipedia, wikiQuery } from "@/lib/web-search";

const page = (index: number, title: string, extract: string) => ({ index, title, extract, fullurl: `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}` });

describe("online search", () => {
  it("keeps Wikipedia pages that mention the asked-about name, in search order, with their page links", () => {
    const json = { query: { pages: { a: page(2, "Zoho Corporation", "Zoho Corporation is an Indian technology company founded in 1996, with offices in many countries including Singapore and the United States."), b: page(1, "Zoho Office Suite", "Zoho Office Suite is an online office suite from Zoho Corporation that contains word processing, spreadsheets and presentations."), c: page(3, "Unrelated", "A long article about something else entirely that does not mention the company at all, which should be dropped.") } } };
    const docs = parseWikipedia(json, wikiQuery("What does Zoho do in Singapore?"));
    expect(docs.map((d) => d.title)).toEqual(["Zoho Office Suite (Wikipedia)", "Zoho Corporation (Wikipedia)"]);
    expect(docs[0].url).toBe("https://en.wikipedia.org/wiki/Zoho_Office_Suite");
  });

  it("searches Wikipedia for the subject, not the place", () => {
    expect(wikiQuery("What does Zoho do and does it have an office in Singapore?")).toBe("Zoho");
    expect(wikiQuery("Who is the CEO of Freshworks?")).toBe("CEO Freshworks");
  });

  it("returns nothing for empty or malformed responses", () => {
    expect(parseWikipedia(null, "Zoho")).toEqual([]);
    expect(parseWikipedia({ query: { pages: { a: { title: "Zoho", extract: "short", fullurl: "https://x" } } } }, "Zoho")).toEqual([]);
  });
});
