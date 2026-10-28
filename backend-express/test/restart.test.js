import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("actual server process restart preserves SQLite data and authors", async () => {
  const dir = mkdtempSync(join(tmpdir(), "review-restart-"));
  const file = join(dir, "data", "board.sqlite");
  const env = {
    ...process.env,
    PORT: "0",
    DB_FILE: file,
    JWT_SECRET: randomBytes(32).toString("hex"),
    TOKEN_TTL: "90",
    JWT_ISSUER: "webservice-class",
    JWT_AUDIENCE: "board-api",
  };
  let child;
  let base;
  async function start() {
    child = spawn(process.execPath, [new URL("../src/app.js", import.meta.url).pathname], { env, stdio: ["ignore", "pipe", "pipe"] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Server startup timeout")); }, 5000);
      child.once("error", () => { clearTimeout(timer); reject(new Error("Server startup failed")); });
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Server exited before readiness")); });
      let text = "";
      child.stdout.on("data", (data) => {
        text += data;
        const match = text.match(/API (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) { base = match[1]; clearTimeout(timer); resolve(); }
      });
      child.stderr.on("data", () => {});
    });
  }
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
      child.kill("SIGTERM");
    });
  }
  async function call(method, path, token, body) {
    const res = await fetch(base + "/api" + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, data: res.status === 204 ? null : await res.json() };
  }
  try {
    await start();
    const firstPid = child.pid;
    const login = await call("POST", "/auth/login", null, { email: "alice@class.test", password: "Classroom!2026" });
    assert.equal(login.status, 200);
    const token = login.data.accessToken;
    const made = await call("POST", "/posts", token, { title: "재시작 검사", content: "파일 저장 확인" });
    assert.equal(made.status, 201);
    const saved = readFileSync(file);
    await stop();
    await start();
    assert.notEqual(child.pid, firstPid);
    assert.deepEqual(readFileSync(file), saved);
    const detail = await call("GET", `/posts/${made.data.id}`);
    assert.equal(detail.status, 200);
    assert.deepEqual(detail.data, made.data);
    const me = await call("GET", "/me", token);
    assert.equal(me.status, 200);
    assert.equal(me.data.id, made.data.authorId);
    const edited = await call("PUT", `/posts/${made.data.id}`, token, { title: "재시작 후 수정", content: "수정 유지" });
    assert.equal(edited.status, 200);
    await stop();
    await start();
    assert.deepEqual((await call("GET", `/posts/${made.data.id}`)).data, edited.data);
    assert.equal((await call("DELETE", `/posts/${made.data.id}`, token)).status, 204);
    await stop();
    await start();
    assert.deepEqual((await call("GET", "/posts")).data, []);
    assert.equal((await call("GET", `/posts/${made.data.id}`)).status, 404);
  } finally {
    await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
