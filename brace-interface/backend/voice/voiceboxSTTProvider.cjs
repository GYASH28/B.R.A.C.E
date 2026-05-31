/**
 * Voicebox STT (Speech-to-Text) Provider for B.R.A.C.E.
 * Connects to the Voicebox REST API for Whisper-powered transcription.
 * @module voiceboxSTTProvider
 */

const VOICEBOX_BASE_URL = process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";

/**
 * Transcribe audio via Voicebox.
 * @param {Buffer} audioBuffer - Raw audio data (WAV/MP3/WebM)
 * @param {object} [options] - { format }
 * @returns {Promise<{ok: boolean, text?: string, error?: string, provider: string}>}
 */
async function transcribe(audioBuffer, options = {}) {
  try {
    if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
      return { ok: false, error: "No audio buffer provided", provider: "voicebox" };
    }

    const format = options.format || "wav";
    const boundary = `----BRACEBoundary${Date.now()}`;
    const filename = `audio.${format}`;

    // Build multipart/form-data manually
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/${format}\r\n\r\n`));
    parts.push(audioBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const res = await fetch(`${VOICEBOX_BASE_URL}/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return { ok: false, error: `Voicebox /transcribe returned ${res.status}: ${errText}`, provider: "voicebox" };
    }

    const json = await res.json();
    const text = json.text || json.transcription || json.result || "";
    return { ok: true, text: text.trim(), provider: "voicebox" };
  } catch (err) {
    const message = err?.cause?.code === "ECONNREFUSED"
      ? "Voicebox is not running. Start Voicebox and try again."
      : `Voicebox transcribe failed: ${err.message}`;
    return { ok: false, error: message, provider: "voicebox" };
  }
}

module.exports = { transcribe };
