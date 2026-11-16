import { describe, expect, it } from "vitest";
import { isWrappedLink, parseFeed, unwrapLink } from "@/lib/signals/rss";

describe("news links", () => {
  it("returns the article address hidden in aggregator redirects", () => {
    expect(unwrapLink("http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&url=https%3a%2f%2fwww.marketing-interactive.com%2fsingtel-consolidates&c=1&mkt=en-sg")).toBe(
      "https://www.marketing-interactive.com/singtel-consolidates",
    );
    expect(unwrapLink("https://www.google.com/url?rct=j&sa=t&url=https://www.straitstimes.com/business/a-story&ct=ga")).toBe("https://www.straitstimes.com/business/a-story");
    expect(unwrapLink("https://www.google.com/url?q=http://e27.co/x")).toBe("https://e27.co/x");
  });

  it("leaves direct links alone and never unwraps to a non-web scheme", () => {
    expect(unwrapLink("https://www.businesstimes.com.sg/technology/x")).toBe("https://www.businesstimes.com.sg/technology/x");
    expect(unwrapLink("https://www.google.com/url?q=javascript:alert(1)")).toBe("https://www.google.com/url?q=javascript:alert(1)");
    expect(unwrapLink("not a url")).toBe("not a url");
  });

  it("flags links that still hide their address", () => {
    expect(isWrappedLink("https://news.google.com/rss/articles/CBMiwAFBVV95cUxQ?oc=5")).toBe(true);
    expect(isWrappedLink("https://www.straitstimes.com/business/x")).toBe(false);
  });

  it("parses Bing items into the publisher's own address and name", () => {
    const xml = `<rss><channel><item><title>Singtel reorganises enterprise</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fwww.theedgesingapore.com%2fnews%2fsingtel&amp;c=1</link><description>Body</description><pubDate>Sun, 15 Nov 2026 03:00:00 GMT</pubDate><News:Source>The Edge Singapore</News:Source></item></channel></rss>`;
    expect(parseFeed(xml)[0]).toMatchObject({ link: "https://www.theedgesingapore.com/news/singtel", source: "The Edge Singapore", title: "Singtel reorganises enterprise" });
  });
});
