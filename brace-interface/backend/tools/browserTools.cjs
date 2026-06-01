function browserStatus() {
  return {
    ok: true,
    configured: false,
    message: "Browser automation architecture is present, but a Playwright browser session is not enabled from the UI yet.",
  };
}

module.exports = { browserStatus };
