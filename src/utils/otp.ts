import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { env } from '../config/env';

const IMAP_HOST = 'imap.gmail.com';
const IMAP_PORT = 993;
const INBOX = 'INBOX';
const OTP_POLL_INTERVAL_MS = 1_000;
const OTP_TIMEOUT_MS = 40_000;
const OTP_PATTERN = /\b(\d{4})\b/;

async function withInbox<T>(work: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: env.gmail.address, pass: env.gmail.appPassword },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock(INBOX);
  try {
    return await work(client);
  } finally {
    lock.release();
    await client.logout();
  }
}

async function uidsSentTo(client: ImapFlow, address: string): Promise<number[]> {
  await client.noop(); // refresh, so mail that just arrived is visible
  const uids = await client.search({ to: address }, { uid: true });
  return uids || [];
}


export async function latestMailUid(address: string): Promise<number> {
  return withInbox(async (client) => Math.max(0, ...(await uidsSentTo(client, address))));
}

export async function waitForOtp(address: string, afterUid: number): Promise<string> {
  return withInbox(async (client) => {
    const deadline = Date.now() + OTP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const newUids = (await uidsSentTo(client, address)).filter((uid) => uid > afterUid);
      if (newUids.length > 0) {
        return extractOtp(client, Math.max(...newUids));
      }
      await new Promise((resolve) => setTimeout(resolve, OTP_POLL_INTERVAL_MS));
    }
    throw new Error(`No OTP email for ${address} arrived within ${OTP_TIMEOUT_MS} ms`);
  });
}

async function extractOtp(client: ImapFlow, uid: number): Promise<string> {
  const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
  if (!message || !message.source) {
    throw new Error(`Could not read the email with uid ${uid}`);
  }
  const parsed = await simpleParser(message.source);
  const match = OTP_PATTERN.exec(parsed.text ?? '');
  if (!match) {
    throw new Error(`No 4-digit OTP found in the email "${parsed.subject}"`);
  }
  return match[1];
}