import 'dotenv/config';
import { createApp } from './app.js';
import { createSupabaseClient } from './supabase.js';

const supabase = createSupabaseClient();
const app = createApp({ supabase });
const port = Number.parseInt(process.env.PORT || '3001', 10);

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`The Truth API is listening on port ${port}.`);
});

function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
