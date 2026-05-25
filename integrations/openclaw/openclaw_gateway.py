from __future__ import annotations

import subprocess
from dataclasses import dataclass


@dataclass
class GatewayProcess:
    process: subprocess.Popen | None = None

    def start(self, port: int = 18789) -> str:
        if self.process and self.process.poll() is None:
            return "OpenClaw gateway is already running from B.R.A.C.E."
        try:
            self.process = subprocess.Popen(
                ["openclaw", "gateway", "--port", str(port), "--verbose"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except FileNotFoundError:
            return "OpenClaw CLI not found. Install it first."
        except OSError as e:
            return f"OpenClaw gateway failed to start: {e}"
        return f"OpenClaw gateway starting on port {port}."

    def stop(self) -> str:
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            return "OpenClaw gateway stop requested."
        return "No B.R.A.C.E.-managed OpenClaw gateway process is running."


gateway_process = GatewayProcess()

