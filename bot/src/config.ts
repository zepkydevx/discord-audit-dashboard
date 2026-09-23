import 'dotenv/config';

export class ConfigError extends Error {}

export interface Settings {
  readonly discordToken: string;
  readonly wsPort: number;
  /** Clients must send this token before they receive any events. */
  readonly dashboardToken: string;
  readonly logLevel: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(
      `${name} is not set. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new ConfigError(`WS_PORT must be a valid port number, got "${raw}"`);
  }
  return parsed;
}

export function loadSettings(): Settings {
  return {
    discordToken: requireEnv('DISCORD_TOKEN'),
    dashboardToken: requireEnv('DASHBOARD_TOKEN'),
    wsPort: parsePort(process.env['WS_PORT'], 8080),
    logLevel: process.env['LOG_LEVEL']?.trim().toUpperCase() ?? 'INFO',
  };
}
