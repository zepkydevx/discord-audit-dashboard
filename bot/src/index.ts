import { registerAuditListener } from './auditListener.js';
import { AuditBroadcaster } from './broadcaster.js';
import { createClient } from './client.js';
import { ConfigError, loadSettings } from './config.js';

function log(level: string, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} | ${level.padEnd(8)} | ${message}`);
}

async function main(): Promise<void> {
  let settings;
  try {
    settings = loadSettings();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Configuration error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const broadcaster = new AuditBroadcaster(settings.wsPort, settings.dashboardToken);
  log('INFO', `WebSocket server listening on port ${settings.wsPort}`);

  const client = createClient();
  registerAuditListener(client, broadcaster);

  client.once('clientReady', (readyClient) => {
    log(
      'INFO',
      `Logged in as ${readyClient.user.tag} (ID: ${readyClient.user.id})`,
    );
  });

  await client.login(settings.discordToken);
}

main().catch((error: unknown) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
