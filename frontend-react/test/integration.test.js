import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createApp } from "../../backend-express/src/routes.js";
import { readConfig } from "../../backend-express/src/auth.js";
import { api, login, getSession, clearSession, canEdit } from "../src/api.js";

test("frontend API connects to real Express with an isolated SQLite file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "review-web-"));
  process.env.DB_FILE = join(dir, "board.sqlite");
  const { store } = await import("../../backend-express/src/store.js");
  const config = readConfig({ JWT_SECRET: randomBytes(32).toString("hex") });
  const server = createApp(store, config).listen(0, "127.0.0.1");
  await once(server, "listening");
  const original = globalThis.fetch;
  globalThis.fetch = (url, options) => original(`http://127.0.0.1:${server.address().port}${url}`, options);
  try {
    assert.deepEqual(await api.list(), []);
    assert.equal((await login("alice@class.test", "Classroom!2026")).name, "Alice");
    assert.equal((await api.me()).id, 1);
    const made = await api.create({ title: "개발 검사", content: "임시 리뷰" });
    assert.equal(canEdit(made), true);
    assert.equal((await api.detail(made.id)).title, made.title);
    assert.equal((await api.update(made.id, { title: "수정", content: "수정" })).title, "수정");
    clearSession();
    assert.equal(canEdit(made), false);
    assert.equal((await api.list()).length, 1);
    await login("bob@class.test", "Classroom!2026");
    assert.equal(canEdit(made), false);
    await assert.rejects(api.remove(made.id), (error) => error.status === 403);
    assert.equal(getSession().user.name, "Bob");
    clearSession();
    await login("alice@class.test", "Classroom!2026");
    assert.equal(await api.remove(made.id), null);
    assert.deepEqual(await api.list(), []);
    clearSession();
    await assert.rejects(api.me(), (error) => error.status === 401 && error.code === "TOKEN_REQUIRED");
    assert.equal(getSession().user, null);
  } finally {
    globalThis.fetch = original;
    clearSession();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
});
