// Server-sent events reader shared by the server (gateway stream) and the browser (/api/rag/stream, deal room).
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        const event = block.match(/^event: (.+)$/m)?.[1] ?? "message";
        const data = block.match(/^data: (.+)$/m)?.[1];
        if (data) yield { event, data: JSON.parse(data) };
      }
    }
  } finally {
    reader.releaseLock();
  }
}
