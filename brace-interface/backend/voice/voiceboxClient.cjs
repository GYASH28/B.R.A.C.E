/**
 * Low-level API Client wrapper for Voicebox REST API.
 * Handles HTTP requests, response normalization, and error handling.
 * @module voiceboxClient
 */

const dns = require("node:dns");

class VoiceboxClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";
    this.defaultProfile = config.defaultProfile || process.env.VOICEBOX_DEFAULT_PROFILE || "";
  }

  /**
   * Normalize any error into a clean message structure.
   */
  normalizeError(err) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return { ok: false, error: "Connection timed out. Voicebox is unresponsive.", code: "TIMEOUT" };
    }
    if (err.cause?.code === "ECONNREFUSED" || err.message.includes("fetch failed")) {
      return { ok: false, error: "Voicebox is not running. Please start the Voicebox application.", code: "CONN_REFUSED" };
    }
    return { ok: false, error: err.message || "Unknown communication error with Voicebox.", code: "ERROR" };
  }

  /**
   * Normalize voicebox audio response format.
   * Handles:
   * - Raw audio buffers
   * - JSON with audio_url
   * - JSON with local file paths
   * - JSON with base64 audio data
   */
  async normalizeAudioResponse(res) {
    try {
      const contentType = res.headers.get("content-type") || "";

      // 1. If it's a raw audio binary stream (wav, mp3, ogg, etc.)
      if (contentType.includes("audio/") || contentType.includes("octet-stream")) {
        const arrayBuf = await res.arrayBuffer();
        return { ok: true, format: "buffer", audio: Buffer.from(arrayBuf) };
      }

      // 2. If it is JSON
      if (contentType.includes("application/json")) {
        const json = await res.json();
        
        if (json.error || json.message && !json.audio && !json.audio_url && !json.filePath) {
          return { ok: false, error: json.error || json.message || "Voicebox returned an error." };
        }

        // Base64 audio payload
        const base64Data = json.audio || json.audio_base64 || json.base64;
        if (base64Data && typeof base64Data === "string") {
          return { ok: true, format: "base64", audio: base64Data };
        }

        // HTTP URL to audio resource
        const audioUrl = json.audio_url || json.url;
        if (audioUrl && typeof audioUrl === "string") {
          return { ok: true, format: "url", url: audioUrl };
        }

        // Local file path
        const filePath = json.file_path || json.filePath || json.path;
        if (filePath && typeof filePath === "string") {
          return { ok: true, format: "file", filePath: filePath };
        }

        return { ok: false, error: "Unrecognized JSON response schema from Voicebox.", details: json };
      }

      // Fallback: assume raw buffer if unknown type but HTTP 200
      const arrayBuf = await res.arrayBuffer();
      return { ok: true, format: "buffer", audio: Buffer.from(arrayBuf) };
    } catch (err) {
      return { ok: false, error: `Failed to parse Voicebox response: ${err.message}` };
    }
  }

  /**
   * Verify Voicebox API is reachable.
   */
  async status() {
    try {
      const res = await fetch(`${this.baseUrl}/profiles`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return { ok: true, status: "connected" };
      }
      return { ok: false, status: "error", code: res.status };
    } catch (err) {
      return { ok: false, status: "offline", ...this.normalizeError(err) };
    }
  }

  /**
   * Fetch available voice profiles.
   */
  async profiles() {
    try {
      const res = await fetch(`${this.baseUrl}/profiles`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) {
        return { ok: false, error: `Voicebox returned status ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, profiles: Array.isArray(data) ? data : [] };
    } catch (err) {
      return this.normalizeError(err);
    }
  }

  /**
   * Request Text-to-Speech (TTS) generation.
   */
  async speak(text, options = {}) {
    try {
      const body = JSON.stringify({
        text,
        profile_id: options.profile || this.defaultProfile || undefined,
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0
      });
      
      const res = await fetch(`${this.baseUrl}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(20000)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        return { ok: false, error: `Voicebox returned status ${res.status}: ${errText}` };
      }

      return await this.normalizeAudioResponse(res);
    } catch (err) {
      return this.normalizeError(err);
    }
  }

  /**
   * Transcribe an audio buffer (STT).
   */
  async transcribe(audioBuffer, options = {}) {
    try {
      if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
        return { ok: false, error: "Invalid audio buffer provided." };
      }

      const format = options.format || "wav";
      const boundary = `----BRACEBoundary${Date.now()}`;
      const filename = `audio.${format}`;

      const parts = [];
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/${format}\r\n\r\n`));
      parts.push(audioBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      const body = Buffer.concat(parts);

      const res = await fetch(`${this.baseUrl}/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body,
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        return { ok: false, error: `Voicebox STT returned status ${res.status}: ${errText}` };
      }

      const json = await res.json();
      const text = json.text || json.transcription || json.result || "";
      return { ok: true, text: text.trim() };
    } catch (err) {
      return this.normalizeError(err);
    }
  }

  /**
   * Test client integration with a dummy synthesis request.
   */
  async test() {
    const status = await this.status();
    if (!status.ok) return status;
    const testText = "Voice link established.";
    return this.speak(testText);
  }
}

module.exports = { VoiceboxClient };
