/**
 * Voicebox TTS Provider for B.R.A.C.E.
 * Connects to the Voicebox REST API for high-quality local text-to-speech.
 * @module voiceboxProvider
 */

const VOICEBOX_BASE_URL = process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";
const VOICEBOX_DEFAULT_PROFILE = process.env.VOICEBOX_DEFAULT_PROFILE || "";

/**
 * Speak text via Voicebox. Returns audio buffer.
 * @param {string} text - Text to speak
 * @param {object} [options] - { profile, speed, voice }
 * @returns {Promise<{ok: boolean, audio?: Buffer, error?: string, provider: string}>}
 */
async function speak(text, options = {}) {
  try {
    if (!text || typeof text !== "string") {
      return { ok: false, error: "No text provided", provider: "voicebox" };
    }
    const body = JSON.stringify({
      text,
      profile_id: options.profile || VOICEBOX_DEFAULT_PROFILE || undefined,
      speed: options.speed || 1.0,
    });
    const res = await fetch(`${VOICEBOX_BASE_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return { ok: false, error: `Voicebox /speak returned ${res.status}: ${errText}`, provider: "voicebox" };
    }
    const arrayBuf = await res.arrayBuffer();
    return { ok: true, audio: Buffer.from(arrayBuf), provider: "voicebox" };
  } catch (err) {
    const message = err?.cause?.code === "ECONNREFUSED"
      ? "Voicebox is not running. Start Voicebox and try again."
      : `Voicebox speak failed: ${err.message}`;
    return { ok: false, error: message, provider: "voicebox" };
  }
}

/**
 * Generate audio from text via Voicebox (async generation).
 * @param {string} text - Text to generate speech for
 * @param {object} [options] - { profile, speed, voice }
 * @returns {Promise<{ok: boolean, audio?: Buffer, generationId?: string, error?: string, provider: string}>}
 */
async function generate(text, options = {}) {
  try {
    if (!text || typeof text !== "string") {
      return { ok: false, error: "No text provided", provider: "voicebox" };
    }
    const body = JSON.stringify({
      text,
      profile_id: options.profile || VOICEBOX_DEFAULT_PROFILE || undefined,
      speed: options.speed || 1.0,
    });
    const res = await fetch(`${VOICEBOX_BASE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return { ok: false, error: `Voicebox /generate returned ${res.status}: ${errText}`, provider: "voicebox" };
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("audio") || contentType.includes("octet-stream")) {
      const arrayBuf = await res.arrayBuffer();
      return { ok: true, audio: Buffer.from(arrayBuf), provider: "voicebox" };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: true, generationId: json.id || json.generation_id, provider: "voicebox" };
  } catch (err) {
    const message = err?.cause?.code === "ECONNREFUSED"
      ? "Voicebox is not running. Start Voicebox and try again."
      : `Voicebox generate failed: ${err.message}`;
    return { ok: false, error: message, provider: "voicebox" };
  }
}

/**
 * List available voice profiles from Voicebox.
 * @returns {Promise<{ok: boolean, profiles?: Array, error?: string}>}
 */
async function listProfiles() {
  try {
    const res = await fetch(`${VOICEBOX_BASE_URL}/profiles`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `Voicebox /profiles returned ${res.status}` };
    }
    const profiles = await res.json();
    return { ok: true, profiles: Array.isArray(profiles) ? profiles : [] };
  } catch (err) {
    const message = err?.cause?.code === "ECONNREFUSED"
      ? "Voicebox is not running."
      : `Failed to list profiles: ${err.message}`;
    return { ok: false, error: message };
  }
}

/**
 * Check if Voicebox is running and healthy.
 * @returns {Promise<{ok: boolean, status: string, details?: object}>}
 */
async function healthCheck() {
  try {
    const res = await fetch(`${VOICEBOX_BASE_URL}/profiles`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const profiles = await res.json().catch(() => []);
      return {
        ok: true,
        status: "connected",
        details: {
          url: VOICEBOX_BASE_URL,
          profileCount: Array.isArray(profiles) ? profiles.length : 0,
          profiles: Array.isArray(profiles) ? profiles.slice(0, 10) : [],
        },
      };
    }
    return { ok: false, status: "error", details: { httpStatus: res.status } };
  } catch (err) {
    return {
      ok: false,
      status: "offline",
      details: { error: err.message, url: VOICEBOX_BASE_URL },
    };
  }
}

module.exports = { speak, generate, listProfiles, healthCheck, VOICEBOX_BASE_URL };
