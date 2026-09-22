import { AuditLogEvent, type Client } from 'discord.js';
import type { AuditBroadcaster } from './broadcaster.js';
import type { AuditEvent, AuditEventType } from './types.js';

/** Audit-log actions we care about, mapped to our own event types. */
const WATCHED_ACTIONS: ReadonlyMap<AuditLogEvent, AuditEventType> = new Map([
  [AuditLogEvent.ChannelDelete, 'channel_delete'],
  [AuditLogEvent.RoleDelete, 'role_delete'],
  [AuditLogEvent.MemberBanAdd, 'member_ban'],
  [AuditLogEvent.MemberKick, 'member_kick'],
]);

/**
 * The subset of a discord.js audit-log entry this module actually reads,
 * kept as its own interface instead of importing the real class. That
 * lets `normalizeAuditEntry` be unit tested with plain objects — no
 * Discord connection needed, the same way the Python project's scorer
 * is tested without a live bot.
 */
export interface MinimalAuditLogEntry {
  readonly id: string;
  readonly guildId: string;
  readonly action: AuditLogEvent;
  readonly executorId: string | null;
  readonly reason: string | null;
  readonly createdTimestamp: number;
}

/** Resolves a user ID to a display tag; swappable so tests don't need a real guild. */
export type ExecutorTagLookup = (executorId: string) => string;

/** Pure normalization logic: Discord's shape in, our own AuditEvent out (or null to skip). */
export function normalizeAuditEntry(
  entry: MinimalAuditLogEntry,
  resolveTag: ExecutorTagLookup,
): AuditEvent | null {
  const type = WATCHED_ACTIONS.get(entry.action);
  if (type === undefined || entry.executorId === null) {
    return null;
  }
  return {
    id: entry.id,
    guildId: entry.guildId,
    actorId: entry.executorId,
    actorTag: resolveTag(entry.executorId),
    type,
    timestamp: entry.createdTimestamp,
    reason: entry.reason,
  };
}

/** Wires the normalizer up to discord.js's live gateway event. */
export function registerAuditListener(
  client: Client,
  broadcaster: AuditBroadcaster,
): void {
  client.on('guildAuditLogEntryCreate', (entry, guild) => {
    if (client.user && entry.executorId === client.user.id) {
      return; // ignore the bot's own actions
    }

    const event = normalizeAuditEntry(
      {
        id: entry.id,
        guildId: guild.id,
        action: entry.action,
        executorId: entry.executorId,
        reason: entry.reason,
        createdTimestamp: entry.createdTimestamp,
      },
      (executorId) => guild.members.cache.get(executorId)?.user.tag ?? executorId,
    );

    if (event) {
      broadcaster.broadcast(event);
    }
  });
}
