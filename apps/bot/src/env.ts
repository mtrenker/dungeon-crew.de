export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function requiredDiscordId(name: string): string {
  const value = requiredEnv(name);
  if (!/^[0-9]{17,20}$/.test(value)) {
    throw new Error(`${name} must be a numeric Discord ID, not a public key or invite link.`);
  }
  return value;
}
