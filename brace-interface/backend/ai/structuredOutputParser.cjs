function tryParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message, value: null };
  }
}

module.exports = { tryParseJson };
