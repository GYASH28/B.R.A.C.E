from __future__ import annotations

import subprocess

from integrations.openclaw.openclaw_detector import OpenClawStatus, detect
from integrations.openclaw.openclaw_gateway import gateway_process
from services.logging_service import BraceLog, redact
from services.settings_service import env, env_int


class OpenClawService:
    def __init__(self):
        self.gateway_url = env("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789")
        self.port = env_int("OPENCLAW_PORT", 18789)

    def detect(self) -> OpenClawStatus:
        status = detect(self.gateway_url)
        BraceLog.info("openclaw", status)
        return status

    def run_doctor(self) -> str:
        return self._run(["openclaw", "doctor"], timeout=120)

    def onboard(self) -> str:
        return self._run(["openclaw", "onboard", "--install-daemon"], timeout=600)

    def start_gateway(self) -> str:
        try:
            result = gateway_process.start(self.port)
            BraceLog.info("openclaw", result)
            return result
        except Exception as exc:
            BraceLog.error("openclaw", exc)
            return f"Could not start gateway: {exc}"

    def stop_gateway(self) -> str:
        result = gateway_process.stop()
        BraceLog.info("openclaw", result)
        return result

    def _run(self, cmd: list[str], timeout: int) -> str:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
            output = redact(output[-2500:] if output else f"Exit code {result.returncode}")
            BraceLog.info("openclaw", output)
            return output
        except FileNotFoundError:
            return "OpenClaw is not installed. Use the setup guide before running this action."
        except Exception as exc:
            BraceLog.error("openclaw", exc)
            return f"OpenClaw command failed: {exc}"

