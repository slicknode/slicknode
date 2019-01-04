/**
 * Slicknode Runtime Handler for Google Cloud Functions
 */
const runtime = require('./runtime').default;

/**
 * Process request
 */
exports.function = async (req, res) => {
  const result = await runtime.execute(JSON.stringify(req.body), req.headers);
  res.json(result);
};
