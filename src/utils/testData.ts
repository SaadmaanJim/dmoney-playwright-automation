export interface AgentAccount {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  nid: string;
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}


export function buildAgent(inboxAddress: string): AgentAccount {
  const [localPart, domain] = inboxAddress.split('@');
  const unique = Date.now();
  return {
    fullName: `Agent ${unique}`,
    email: `${localPart}+agent${unique}@${domain}`,
    password: `Pass${randomDigits(4)}`,
    phone: `01${randomDigits(9)}`, // 
    nid: randomDigits(13),
  };
}
export function buildNewPassword(): string {
  return `Reset${randomDigits(4)}`;
}