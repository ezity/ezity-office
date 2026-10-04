"""Internal-only, allowlisted bridge to the Hermes Antigravity dispatcher."""
from __future__ import annotations

import hmac
import json
import os
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("ANTIGRAVITY_BRIDGE_TOKEN", "")
DISPATCHER = "/opt/data/bin/hermes-dispatch-coder"
MAX_PROMPT_BYTES = 32_000
PROMPT_RE = re.compile(r"\S")


def error(handler: BaseHTTPRequestHandler, status: int, message: str) -> None:
    encoded = json.dumps({"ok": False, "error": message}).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(encoded)))
    handler.end_headers()
    handler.wfile.write(encoded)


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "EZityAntigravityBridge/1.0"

    def log_message(self, format: str, *args: object) -> None:
        # Do not log prompts or authorization headers.
        print("bridge", self.address_string(), format % args, flush=True)

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        error(self, 404, "Not found")

    def do_POST(self) -> None:
        if self.path != "/v1/dispatch":
            error(self, 404, "Not found")
            return
        if not TOKEN:
            error(self, 503, "Bridge is not configured")
            return
        supplied = self.headers.get("X-Bridge-Token", "")
        if not hmac.compare_digest(supplied, TOKEN):
            error(self, 401, "Unauthorized")
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0] != "application/json":
            error(self, 415, "Content-Type must be application/json")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            error(self, 400, "Invalid Content-Length")
            return
        if length <= 0 or length > MAX_PROMPT_BYTES + 1000:
            error(self, 413, "Request is too large")
            return
        try:
            body = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError):
            error(self, 400, "Invalid JSON")
            return
        mode = body.get("mode") if isinstance(body, dict) else None
        prompt = body.get("prompt") if isinstance(body, dict) else None
        if mode not in ("plan", "code") or not isinstance(prompt, str):
            error(self, 400, "mode must be plan or code and prompt must be a string")
            return
        if len(prompt.encode()) > MAX_PROMPT_BYTES or not PROMPT_RE.search(prompt):
            error(self, 400, "Prompt must be non-empty and at most 32000 bytes")
            return
        # No shell: the only callable is the existing dispatcher, with fixed project.
        try:
            completed = subprocess.run(
                [DISPATCHER, "ezity-office", mode, prompt],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=660,
                check=False,
            )
        except subprocess.TimeoutExpired:
            error(self, 504, "Dispatcher timed out")
            return
        except OSError:
            error(self, 503, "Dispatcher is unavailable")
            return
        result = json.dumps({
            "ok": completed.returncode == 0,
            "mode": mode,
            "output": completed.stdout[-256_000:],
            "exitCode": completed.returncode,
        }).encode()
        self.send_response(200 if completed.returncode == 0 else 502)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(result)))
        self.end_headers()
        self.wfile.write(result)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8787), BridgeHandler).serve_forever()
