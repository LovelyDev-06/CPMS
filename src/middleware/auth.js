const { users } = require("../data/store");

// Demo-grade "token" — just the userId, base64-encoded. Good enough to wire
// the frontend up and understand the request flow. Swap for real JWTs
// (jsonwebtoken) + hashed passwords (bcrypt) before this touches real users.
function decodeToken(token) {
  try {
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function issueToken(userId) {
  return Buffer.from(userId).toString("base64");
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token && decodeToken(token);
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, issueToken };
