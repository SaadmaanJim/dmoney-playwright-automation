import { promises as fs } from 'fs';

const POLL_INTERVAL_MS = 500;
const TIMEOUT_MS = 15_000;
const UTF16_LE_BOM = [0xff, 0xfe];


async function readLog(logPath: string): Promise<string> {
  const buffer = await fs.readFile(logPath);
  const isUtf16 = buffer[0] === UTF16_LE_BOM[0] && buffer[1] === UTF16_LE_BOM[1];
  return buffer.toString(isUtf16 ? 'utf16le' : 'utf8');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findResetLinks(logPath: string, email: string): Promise<string[]> {
  const log = await readLog(logPath);
  const pattern = new RegExp(`Password reset link for ${escapeRegExp(email)}:\\s*(\\S+)`, 'g');
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(log)) !== null) {
    links.push(match[1]);
  }
  return links;
}


export async function countResetLinks(logPath: string, email: string): Promise<number> {
  return (await findResetLinks(logPath, email)).length;
}


export async function waitForNewResetLink(logPath: string, email: string, previousCount: number): Promise<string> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const links = await findResetLinks(logPath, email);
    if (links.length > previousCount) {
      const url = new URL(links[links.length - 1]);
      return `${url.pathname}${url.search}`;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`No reset link for ${email} appeared in ${logPath} within ${TIMEOUT_MS} ms`);
}