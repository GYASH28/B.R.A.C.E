const fs = require("node:fs");
const path = require("node:path");

function createSecretStore({ userDataPath, safeStorage }) {
  const secretsPath = path.join(userDataPath, "brace-secrets.json");

  function readRaw() {
    try {
      return JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    } catch {
      return {};
    }
  }

  function writeRaw(value) {
    fs.mkdirSync(path.dirname(secretsPath), { recursive: true });
    fs.writeFileSync(secretsPath, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
    try {
      fs.chmodSync(secretsPath, 0o600);
    } catch {
      // Best effort on filesystems that do not support POSIX permissions.
    }
  }

  function encryptionAvailable() {
    try {
      return Boolean(safeStorage?.isEncryptionAvailable?.());
    } catch {
      return false;
    }
  }

  function encode(value) {
    if (encryptionAvailable()) {
      return {
        mode: "safeStorage",
        value: safeStorage.encryptString(value).toString("base64"),
      };
    }
    return { mode: "restricted-file", value };
  }

  function decode(record) {
    if (!record?.value) return "";
    if (record.mode === "safeStorage") {
      if (!encryptionAvailable()) throw new Error("Encrypted BRACE secrets are unavailable in the current desktop keychain session.");
      return safeStorage.decryptString(Buffer.from(record.value, "base64"));
    }
    return String(record.value || "");
  }

  function set(key, value) {
    const next = readRaw();
    const trimmed = String(value || "").trim();
    if (!trimmed) delete next[key];
    else next[key] = encode(trimmed);
    writeRaw(next);
    return { ok: true, encrypted: next[key]?.mode === "safeStorage" };
  }

  function get(key) {
    const record = readRaw()[key];
    return record ? decode(record) : "";
  }

  function has(key) {
    return Boolean(readRaw()[key]?.value);
  }

  function clearAll() {
    try {
      fs.rmSync(secretsPath, { force: true });
    } catch {
      writeRaw({});
    }
  }

  function securityMode() {
    return encryptionAvailable() ? "safeStorage" : "restricted-file";
  }

  return { clearAll, get, has, securityMode, set, secretsPath };
}

module.exports = { createSecretStore };
