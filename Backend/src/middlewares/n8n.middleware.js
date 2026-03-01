const n8nAuth = (req, res, next) => {
  const expectedKey = process.env.N8N_API_KEY;
  if (!expectedKey) {
    return res.status(500).json({ message: "N8N_API_KEY is not configured in backend .env" });
  }

  const fromHeader = req.headers["x-api-key"] || req.headers["x-n8n-api-key"];
  const fromBearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
  const provided = fromHeader || fromBearer || req.query.api_key;

  if (!provided || provided !== expectedKey) {
    return res.status(401).json({ message: "Invalid n8n API key" });
  }

  next();
};

module.exports = n8nAuth;

