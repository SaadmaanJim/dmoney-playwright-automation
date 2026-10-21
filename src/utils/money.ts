
export function parseTk(text: string): number {
  const match = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) {
    throw new Error(`Could not parse an amount from "${text}"`);
  }
  return Number(match[0]);
}

/** Matches 2000, 2,000 or ৳2,000.00, but not 12000 or a digit run inside a phone number. */
export function amountPattern(amountTk: number): RegExp {
  const withOptionalCommas = String(amountTk).replace(/\B(?=(\d{3})+(?!\d))/g, ',?');
  return new RegExp(`(?<![\\d,.])${withOptionalCommas}(?!\\d)`);
}