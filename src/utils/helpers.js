const crypto = require("crypto");

function uid(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

module.exports = { uid, todayISO, addDays };
