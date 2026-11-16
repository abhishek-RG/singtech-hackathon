// Legal suffixes and filler words that do not tell two companies apart.
const NOISE = /\b(pte|ltd|limited|private|pvt|inc|corp|corporation|co|company|group|holdings|the|sg|singapore|india)\b/g;

export const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();

// Same core name, or one name containing the other as whole words ("Tata Electronics" vs "Tata Electronics Pvt Ltd").
export function findDuplicate<T extends { name: string }>(input: string, existing: T[]): T | undefined {
  const q = normalizeName(input);
  if (q.length < 3) return undefined;
  return existing.find((e) => {
    const n = normalizeName(e.name);
    return n === q || ` ${n} `.includes(` ${q} `) || ` ${q} `.includes(` ${n} `);
  });
}
