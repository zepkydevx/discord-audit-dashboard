import { WebSocketServer, type WebSocket } from 'ws';
import type { AuditEvent, ServerMessage } from './types.js';

const AUTH_TIMEOUT_MS = 5000;

/**
 * Runs a WebSocket server and broadcasts audit events to every connected
 * dashboard client. A client must send the dashboard token as its very
 * first message; anything else (wrong token, or silence past the
 * timeout) gets disconnected before it can see a single event.
 */
export class AuditBroadcaster {
  private readonly wss: WebSocketServer;
  private readonly authenticated = new Set<WebSocket>();

  constructor(port: number, dashboardToken: string) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (socket) => {
      this.handleConnection(socket, dashboardToken);
    });
  }

  private handleConnection(socket: WebSocket, dashboardToken: string): void {
    const timeout = setTimeout(() => {
      socket.close(4001, 'Authentication timeout');
    }, AUTH_TIMEOUT_MS);

    socket.once('message', (data) => {
      clearTimeout(timeout);
      const token = data.toString().trim();
      if (token !== dashboardToken) {
        socket.close(4003, 'Invalid token');
        return;
      }
      this.authenticated.add(socket);
      socket.on('close', () => this.authenticated.delete(socket));
      this.send(socket, { kind: 'hello', connectedAt: Date.now() });
    });
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
  }

  /** Sends an event to every authenticated, still-open client. */
  broadcast(event: AuditEvent): void {
    const message: ServerMessage = { kind: 'audit-event', event };
    const payload = JSON.stringify(message);
    for (const socket of this.authenticated) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }

  get clientCount(): number {
    return this.authenticated.size;
  }

  close(): void {
    this.wss.close();
  }
}
