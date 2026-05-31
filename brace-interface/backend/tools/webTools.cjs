async function fetchText(url, maxBytes = 150000) {
  if (!/^https?:\/\//i.test(url || "")) throw new Error("Only http/https URLs are supported.");
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  return { ok: true, url: response.url, status: response.status, text: text.slice(0, maxBytes) };
}

module.exports = { fetchText };
