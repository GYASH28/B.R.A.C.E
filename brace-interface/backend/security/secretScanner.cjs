const SECRET_PATTERNS = [
  { pattern: /AIza[0-9A-Za-z_-]{20,}/g, replacement: "AIza...redacted" },
  { pattern: /sk-[0-9A-Za-z_-]{12,}/g, replacement: "sk-...redacted" },
  { pattern: /(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"'\s]{8,}/gi, replacement: "$1=...redacted" },
  { pattern: /ghp_[0-9A-Za-z_]{20,}/g, replacement: "ghp_...redacted" },
  { pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/g, replacement: "xox-...redacted" },
];

function redactSecrets(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return SECRET_PATTERNS.reduce((text, item) => text.replace(item.pattern, item.replacement), value);
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactSecrets(child)]));
  }
  return value;
}

module.exports = { redactSecrets };
