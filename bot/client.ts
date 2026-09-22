import { Client, GatewayIntentBits } from 'discord.js';

/**
 * Builds a Discord client with only the intents this project needs.
 * Starting from an explicit list (rather than a broad default) follows
 * the principle of least privilege: nothing is received that isn't
 * used somewhere in the codebase.
 */
export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds, // channel/role events
      GatewayIntentBits.GuildModeration, // ban/unban events, audit-log entries
    ],
  });
}
