import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), ".data");

// shortcut: whole-file JSON read/write with no locking; fine for one local server process, move to SQLite if the app is ever scaled out.
export async function readRecords<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await readFile(join(DIR, file), "utf8")) as T[];
  } catch {
    return [];
  }
}

export async function appendRecord<T>(file: string, record: T, keep = 500): Promise<void> {
  const list = [record, ...(await readRecords<T>(file))].slice(0, keep);
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, file), JSON.stringify(list, null, 2));
}
