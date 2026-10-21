import { promises as fs } from 'fs';
import path from 'path';

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n') + '\n';
}

export async function writeCsv(filePath: string, headers: string[], rows: string[][]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, toCsv(headers, rows), 'utf8');
}