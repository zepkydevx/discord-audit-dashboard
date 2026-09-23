/** Destructive/notable actions the bot watches for. */
export type AuditEventType =
  | 'channel_delete'
  | 'role_delete'
  | 'member_ban'
  | 'member_kick';

/**
 * A single moderation event, already normalized into the shape the
 * dashboard understands. This is the only type that crosses the
 * WebSocket boundary, so Discord.js types never leak into the frontend.
 */
export interface AuditEvent {
  readonly id: string;
  readonly guildId: string;
  readonly actorId: string;
  readonly actorTag: string;
  readonly type: AuditEventType;
  /** Unix milliseconds, taken from the audit-log entry itself. */
  readonly timestamp: number;
  readonly reason: string | null;
}

/** Envelope every WebSocket message is wrapped in, so the client can
 * distinguish message kinds without guessing from the payload shape. */
export type ServerMessage =
  | { readonly kind: 'audit-event'; readonly event: AuditEvent }
  | { readonly kind: 'hello'; readonly connectedAt: number };
