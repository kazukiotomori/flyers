import { ROOT } from './lib/flyers.js';
import { startServer } from './lib/server.js';

const port = Number(process.env.PORT) || 4173;
const server = await startServer(ROOT, port);
console.log(`${server.origin} で待ち受け中です。Ctrl+C で終了します。`);
