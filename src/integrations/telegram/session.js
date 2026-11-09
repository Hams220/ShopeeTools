import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const sessionPath = resolve(".teleproto-session");
async function loadSession() {
  try {
    return (await readFile(sessionPath, "utf8")).trim();
  } catch {
    return "";
  }
}
async function saveSession(session) {
  await writeFile(sessionPath, session, { encoding: "utf8", mode: 384 });
}
export {
  loadSession,
  saveSession,
  sessionPath
};
