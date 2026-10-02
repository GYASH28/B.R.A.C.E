#!/usr/bin/env python3
import importlib.util
import json
import os
import sys
import tempfile
import time
from pathlib import Path

_whisper_model = None
_pipelines = {}


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def module_available(name):
    return importlib.util.find_spec(name) is not None


def dependency_status():
    return {
        "python": True,
        "fasterWhisper": module_available("faster_whisper"),
        "kokoro": module_available("kokoro"),
        "soundfile": module_available("soundfile"),
        "numpy": module_available("numpy"),
    }


def load_whisper():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    from faster_whisper import WhisperModel

    model_name = os.environ.get("BRACE_WHISPER_MODEL", "base.en")
    started = time.perf_counter()
    _whisper_model = WhisperModel(model_name, device="cpu", compute_type="int8")
    emit({
        "type": "event",
        "event": "stt.ready",
        "model": model_name,
        "loadMs": round((time.perf_counter() - started) * 1000),
    })
    return _whisper_model


def transcribe(audio_path, language="en"):
    started = time.perf_counter()
    model = load_whisper()
    segments, info = model.transcribe(
        audio_path,
        language=language if language else None,
        beam_size=2,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 350},
        condition_on_previous_text=False,
    )
    text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
    return {
        "text": text,
        "language": getattr(info, "language", language),
        "languageProbability": getattr(info, "language_probability", None),
        "latencyMs": round((time.perf_counter() - started) * 1000),
    }


def pipeline_for_voice(voice):
    language_code = voice[0] if voice else "b"
    if language_code not in _pipelines:
        from kokoro import KPipeline
        started = time.perf_counter()
        _pipelines[language_code] = KPipeline(lang_code=language_code)
        emit({
            "type": "event",
            "event": "tts.ready",
            "language": language_code,
            "loadMs": round((time.perf_counter() - started) * 1000),
        })
    return _pipelines[language_code]


def synthesize(text, voice="bm_george", speed=1.0, output_path=None):
    import numpy as np
    import soundfile as sf

    clean = str(text or "").strip()
    if not clean:
        raise ValueError("Text is empty.")

    started = time.perf_counter()
    pipeline = pipeline_for_voice(voice)
    chunks = []
    for _graphemes, _phonemes, audio in pipeline(clean, voice=voice, speed=float(speed)):
        chunks.append(np.asarray(audio, dtype=np.float32))

    if not chunks:
        raise RuntimeError("Kokoro produced no audio.")

    waveform = np.concatenate(chunks)
    if not output_path:
        handle, output_path = tempfile.mkstemp(prefix="brace-tts-", suffix=".wav")
        os.close(handle)

    sf.write(output_path, waveform, 24000)
    return {
        "path": str(output_path),
        "sampleRate": 24000,
        "samples": int(waveform.shape[0]),
        "latencyMs": round((time.perf_counter() - started) * 1000),
        "voice": voice,
    }


def handle(request):
    method = request.get("method")
    params = request.get("params") or {}

    if method == "status":
        return {"dependencies": dependency_status()}

    if method == "warm":
        result = {"dependencies": dependency_status()}
        if result["dependencies"]["fasterWhisper"]:
            load_whisper()
            result["stt"] = "ready"
        if result["dependencies"]["kokoro"] and result["dependencies"]["soundfile"] and result["dependencies"]["numpy"]:
            pipeline_for_voice(params.get("voice", "bm_george"))
            result["tts"] = "ready"
        return result

    if method == "transcribe":
        audio_path = str(params.get("path") or "")
        if not audio_path or not Path(audio_path).is_file():
            raise ValueError("Audio file does not exist.")
        return transcribe(audio_path, params.get("language", "en"))

    if method == "synthesize":
        return synthesize(
            params.get("text", ""),
            params.get("voice", "bm_george"),
            params.get("speed", 1.0),
            params.get("outputPath"),
        )

    raise ValueError(f"Unsupported voice method: {method}")


def main():
    emit({"type": "ready", "dependencies": dependency_status()})
    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        request_id = None
        try:
            request = json.loads(line)
            request_id = request.get("id")
            result = handle(request)
            emit({"id": request_id, "result": result})
        except Exception as exc:
            emit({"id": request_id, "error": str(exc)})


if __name__ == "__main__":
    main()
