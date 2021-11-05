/**
 * Slicknode Runtime Handler for Google Cloud Functions
 */
import runtime from './runtime.js';

/**
 * Process request
 */
export async function handler(req, res) {
  const result = await runtime.execute(JSON.stringify(req.body), req.headers);
  res.json(result);
}
