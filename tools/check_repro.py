import json
import os
import re
import select
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
lines = ["Actor: AI automation. Source: local Git clone, not GitHub clone.\n"]
keys = []


def redact(text):
    for key in keys:
        text = text.replace(key, "[KEY REDACTED]")
    text = re.sub(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*", "[JWT REDACTED]", text)
    return re.sub(r"\b[a-fA-F0-9]{64}\b", "[HEX REDACTED]", text)


def record(text):
    text = redact(text)
    lines.append(text + "\n")
    print(text, flush=True)


def run(command, cwd):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=120)
    lines.append(redact(result.stdout + result.stderr))
    if result.returncode:
        raise RuntimeError("Command failed: " + " ".join(command))
    record("PASS " + " ".join(command))
    return result.stdout.strip()


def start(command, cwd, env, marker, source=None):
    proc = subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.PIPE if source else subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if source:
        proc.stdin.write(source)
        proc.stdin.close()
    try:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            ready, _, _ = select.select([proc.stdout], [], [], 0.2)
            if ready:
                line = os.read(proc.stdout.fileno(), 65536).decode()
                match = re.search(marker + r" (http://127\.0\.0\.1:\d+)", line)
                if match:
                    return proc, match[1]
                lines.append(redact(line))
            if proc.poll() is not None:
                break
        raise RuntimeError("Server startup failed or timed out")
    except BaseException:
        stop(proc)
        raise


def stop(proc):
    if proc is not None and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


def call(base, method, path, token=None, body=None, want=200):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as error:
        res = error
    with res:
        data = res.read()
        if res.status != want:
            raise RuntimeError(f"Unexpected HTTP status for {method} {path}: {res.status}")
        return json.loads(data) if data else None


def check(clone):
    for name in ["backend-express/.env", "backend-express/data/board.sqlite", "backend-express/node_modules", "frontend-react/node_modules", "frontend-react/dist"]:
        if (clone / name).exists():
            raise RuntimeError("Unexpected generated file in fresh clone: " + name)
    record("PASS clean clone excludes settings, database, dependencies and build")
    back = clone / "backend-express"
    front = clone / "frontend-react"
    run(["npm", "ci", "--no-audit", "--no-fund"], back)
    run(["npm", "ci", "--no-audit", "--no-fund"], front)
    run(["npm", "run", "setup"], back)
    secret = re.search(r"^JWT_SECRET=(.+)$", (back / ".env").read_text(), re.M)[1]
    keys.append(secret)
    record("PASS local key generated without logging its value")
    run(["npm", "run", "build"], front)
    run(["npm", "test"], back)
    run(["npm", "test"], front)
    env = {key: value for key, value in os.environ.items() if not key.startswith("JWT_") and key not in ["TOKEN_TTL", "DB_FILE", "PORT"]}
    env["PORT"] = "0"
    server = preview = dev = None
    try:
        server, base = start(["node", "src/app.js"], back, env, "API")
        if call(base, "GET", "/api/health") != {"status": "ok"}:
            raise RuntimeError("Health contract failed")
        login = call(base, "POST", "/api/auth/login", body={"email": "alice@class.test", "password": "Classroom!2026"})
        token = login["accessToken"]
        post = call(base, "POST", "/api/posts", token, {"title": "clone restart check", "content": "AI temporary data"}, 201)
        call(base, "GET", "/api/me", token)
        stop(server)
        server, base = start(["node", "src/app.js"], back, env, "API")
        if call(base, "GET", f"/api/posts/{post['id']}") != post:
            raise RuntimeError("Restart persistence failed")
        record("PASS actual cloned server restart preserves complete post and author")
        env["API_TARGET"] = base
        source = "import {preview} from 'vite'; const s=await preview({preview:{host:'127.0.0.1',port:0,proxy:{'/api':process.env.API_TARGET}}}); console.log('CHECK http://127.0.0.1:'+s.httpServer.address().port);"
        preview, url = start(["node", "--input-type=module"], front, env, "CHECK", source)
        with urllib.request.urlopen(url, timeout=5) as res:
            html = res.read().decode()
            if res.status != 200 or 'id="root"' not in html:
                raise RuntimeError("Preview HTML failed")
        asset = re.search(r'src="(/assets/[^"]+)"', html)[1]
        with urllib.request.urlopen(url + asset, timeout=5) as res:
            if res.status != 200:
                raise RuntimeError("Preview asset failed")
        if call(url, "GET", "/api/health") != {"status": "ok"}:
            raise RuntimeError("Preview proxy failed")
        record("PASS cloned production preview HTML, built asset and API proxy")
        source = "import {createServer} from 'vite'; const s=await createServer({server:{host:'127.0.0.1',port:0,proxy:{'/api':process.env.API_TARGET}}}); await s.listen(); console.log('CHECK http://127.0.0.1:'+s.httpServer.address().port);"
        dev, url = start(["node", "--input-type=module"], front, env, "CHECK", source)
        if call(url, "GET", "/api/health") != {"status": "ok"}:
            raise RuntimeError("Dev proxy failed")
        record("PASS cloned development API proxy")
        call(base, "DELETE", f"/api/posts/{post['id']}", token, want=204)
    finally:
        for proc in [dev, preview, server]:
            stop(proc)


success = False
try:
    sha = run(["git", "rev-parse", "HEAD"], root)
    record("Source commit: " + sha)
    work = root.parent / "work"
    work.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="repro-", dir=work) as name:
        clone = Path(name) / "checkout"
        run(["git", "clone", "--no-local", "--branch", "main", str(root), str(clone)], root)
        check(clone)
    record("PASS reproduction; temporary clone and processes removed")
    success = True
except BaseException as error:
    record("FAIL " + type(error).__name__ + ": " + str(error))
finally:
    target = root / "docs/ai-checks"
    target.mkdir(parents=True, exist_ok=True)
    (target / "reproduction.txt").write_text(redact("".join(lines)))
raise SystemExit(0 if success else 1)
