// @ts-check
//
// Type-checked with JSDoc + tsc instead of a bundler build step, so this
// file can be opened straight in a browser with zero tooling. See
// dashboard/jsconfig.json for the type-checking configuration.

/** @typedef {'channel_delete' | 'role_delete' | 'member_ban' | 'member_kick'} AuditEventType */

/**
 * @typedef {object} AuditEvent
 * @property {string} id
 * @property {string} guildId
 * @property {string} actorId
 * @property {string} actorTag
 * @property {AuditEventType} type
 * @property {number} timestamp
 * @property {string | null} reason
 */

/**
 * @typedef {
 *   | { kind: 'audit-event'; event: AuditEvent }
 *   | { kind: 'hello'; connectedAt: number }
 * } ServerMessage
 */

/** @type {Record<AuditEventType, { label: string; severity: 'structural' | 'medium' | 'high' }>} */
const EVENT_INFO = {
  channel_delete: { label: 'Channel deleted', severity: 'structural' },
  role_delete: { label: 'Role deleted', severity: 'structural' },
  member_kick: { label: 'Member kicked', severity: 'medium' },
  member_ban: { label: 'Member banned', severity: 'high' },
};

const MAX_RENDERED_ROWS = 200;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

const form = /** @type {HTMLFormElement} */ (document.getElementById('connect-form'));
const urlInput = /** @type {HTMLInputElement} */ (document.getElementById('ws-url'));
const tokenInput = /** @type {HTMLInputElement} */ (document.getElementById('ws-token'));
const statusEl = /** @type {HTMLElement} */ (document.getElementById('status'));
const logEl = /** @type {HTMLUListElement} */ (document.getElementById('event-log'));
const emptyStateEl = document.getElementById('empty-state');

/** @type {WebSocket | null} */
let socket = null;
let reconnectAttempt = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let reconnectTimer = null;
let manuallyDisconnected = false;

/** @param {'disconnected' | 'connecting' | 'connected' | 'error'} state */
function setStatus(state) {
  statusEl.dataset['state'] = state;
  statusEl.textContent = {
    disconnected: 'Disconnected',
    connecting: 'Connecting…',
    connected: 'Connected',
    error: 'Connection error',
  }[state];
}

/** @param {AuditEvent} event */
function renderEvent(event) {
  emptyStateEl?.remove();

  const info = EVENT_INFO[event.type];
  const row = document.createElement('li');
  row.className = 'event-row is-new';
  row.dataset['severity'] = info.severity;

  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = new Date(event.timestamp).toLocaleTimeString();

  const body = document.createElement('div');
  body.className = 'body';

  const headline = document.createElement('div');
  headline.className = 'headline';
  const actor = document.createElement('strong');
  actor.textContent = event.actorTag;
  headline.append(actor, ` — ${info.label}`);
  body.append(headline);

  if (event.reason) {
    const reason = document.createElement('div');
    reason.className = 'reason';
    reason.textContent = event.reason;
    body.append(reason);
  }

  row.append(time, body);
  logEl.prepend(row);

  // Cap how many rows stay in the DOM so a long session doesn't grow forever.
  while (logEl.children.length > MAX_RENDERED_ROWS) {
    logEl.lastElementChild?.remove();
  }
}

/**
 * @param {string} url
 * @param {string} token
 */
function connect(url, token) {
  manuallyDisconnected = false;
  reconnectAttempt = 0;
  openSocket(url, token);
}

/**
 * @param {string} url
 * @param {string} token
 */
function openSocket(url, token) {
  setStatus('connecting');
  const ws = new WebSocket(url);
  socket = ws;

  ws.addEventListener('open', () => {
    ws.send(token);
    setStatus('connected');
    reconnectAttempt = 0;
  });

  ws.addEventListener('message', (messageEvent) => {
    /** @type {ServerMessage} */
    const message = JSON.parse(String(messageEvent.data));
    if (message.kind === 'audit-event') {
      renderEvent(message.event);
    }
  });

  ws.addEventListener('error', () => {
    setStatus('error');
  });

  ws.addEventListener('close', () => {
    socket = null;
    if (manuallyDisconnected) {
      setStatus('disconnected');
      return;
    }
    setStatus('connecting');
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    );
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => openSocket(url, token), delay);
  });
}

form.addEventListener('submit', (submitEvent) => {
  submitEvent.preventDefault();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  socket?.close();
  connect(urlInput.value.trim(), tokenInput.value);
});
