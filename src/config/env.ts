import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}. Add it to your .env file.`);
  }
  return value;
}

export interface Credentials {
  email: string;
  password: string;
}

export const env = {
  admin: { email: required('ADMIN_EMAIL'), password: required('ADMIN_PASSWORD') } as Credentials,
  system: { email: required('SYSTEM_EMAIL'), password: required('SYSTEM_PASSWORD') } as Credentials,
  customerPhone: required('CUSTOMER_PHONE'),
  gmail: {
    address: required('GMAIL_ADDRESS'),
    appPassword: required('GMAIL_APP_PASSWORD').replace(/\s/g, ''),
  },
  apiLogPath: required('API_LOG_PATH'),
};