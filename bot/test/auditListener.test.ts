import { AuditLogEvent } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  normalizeAuditEntry,
  type MinimalAuditLogEntry,
} from '../src/auditListener.js';

function entry(overrides: Partial<MinimalAuditLogEntry> = {}): MinimalAuditLogEntry {
  return {
    id: '1',
    guildId: 'guild-1',
    action: AuditLogEvent.ChannelDelete,
    executorId: 'user-1',
    reason: null,
    createdTimestamp: 1_000,
    ...overrides,
  };
}

describe('normalizeAuditEntry', () => {
  it('maps a channel deletion to a channel_delete event', () => {
    const event = normalizeAuditEntry(entry(), () => 'someone#0001');
    expect(event).toEqual({
      id: '1',
      guildId: 'guild-1',
      actorId: 'user-1',
      actorTag: 'someone#0001',
      type: 'channel_delete',
      timestamp: 1_000,
      reason: null,
    });
  });

  it('maps a role deletion', () => {
    const event = normalizeAuditEntry(entry({ action: AuditLogEvent.RoleDelete }), () => 'x');
    expect(event?.type).toBe('role_delete');
  });

  it('maps a ban', () => {
    const event = normalizeAuditEntry(entry({ action: AuditLogEvent.MemberBanAdd }), () => 'x');
    expect(event?.type).toBe('member_ban');
  });

  it('maps a kick', () => {
    const event = normalizeAuditEntry(entry({ action: AuditLogEvent.MemberKick }), () => 'x');
    expect(event?.type).toBe('member_kick');
  });

  it('ignores audit-log actions it does not watch', () => {
    const event = normalizeAuditEntry(entry({ action: AuditLogEvent.ChannelCreate }), () => 'x');
    expect(event).toBeNull();
  });

  it('ignores entries with no executor', () => {
    const event = normalizeAuditEntry(entry({ executorId: null }), () => 'x');
    expect(event).toBeNull();
  });

  it('carries the reason through when present', () => {
    const event = normalizeAuditEntry(entry({ reason: 'server cleanup' }), () => 'x');
    expect(event?.reason).toBe('server cleanup');
  });

  it('resolves the actor tag through the provided lookup', () => {
    const event = normalizeAuditEntry(
      entry({ executorId: 'user-42' }),
      (executorId) => `tag-for-${executorId}`,
    );
    expect(event?.actorTag).toBe('tag-for-user-42');
  });
});
