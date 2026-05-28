// Vercel serverless entry that mounts the existing Express app for all /api/* routes.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const app = require(path.join(__dirname, '..', '..', 'backend', 'app.js'));

export default function handler(req, res) {
  return app(req, res);
}