import concurrent.futures
import os
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
keys = []
file = root / "backend-express/.env"
if file.exists():
    keys = re.findall(r"^JWT_SECRET=(.+)$", file.read_text(), re.M)


def redact(text):
    for key in keys:
        text = text.replace(key, "[KEY REDACTED]")
    text = re.sub(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*", "[JWT REDACTED]", text)
    return re.sub(r"\b[a-fA-F0-9]{64}\b", "[HEX REDACTED]", text)


def run(item):
    folder, command = item
    try:
        result = subprocess.run(command, cwd=root / folder, capture_output=True, text=True, timeout=120)
        return folder, command, result.returncode, redact(result.stdout + result.stderr)
    except subprocess.TimeoutExpired:
        return folder, command, 1, "Command timed out; captured output omitted.\n"


items = [
    ("backend-express", ["npm", "test"]),
    ("frontend-react", ["npm", "test"]),
    ("frontend-react", ["npm", "run", "build"]),
]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(run, items))

lines = ["Actor: AI development automation, not student final/manual results.\n"]
for folder, command, code, output in results:
    lines.append(f"\n{folder}: {' '.join(command)}; exit={code}\n{output}")
    print(f"{folder}: {' '.join(command)} -> exit {code}")
    for match in re.findall(r"^.*(?:tests \d+|pass \d+|fail \d+|built in .*).*$", output, re.M):
        print(match)

target = root / "docs/ai-checks"
target.mkdir(parents=True, exist_ok=True)
(target / "development.txt").write_text("".join(lines))
raise SystemExit(0 if all(item[2] == 0 for item in results) else 1)
