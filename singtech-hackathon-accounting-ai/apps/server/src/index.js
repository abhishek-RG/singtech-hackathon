import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_API_PORT, SERVICE_NAME } from '@singtech/shared';

// Load the repo-root .env if present (Node >= 20.12 built-in, no dotenv needed).
const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);

// Import the app after env is loaded so modules can read process.env at import time.
const { createApp } = await import('./app.js');

const port = Number(process.env.PORT) || DEFAULT_API_PORT;

createApp().listen(port, (err) => {
  if (err) {
    console.error(`[${SERVICE_NAME}] failed to start:`, err.message);
    process.exit(1);
  }
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${port}`);
});
