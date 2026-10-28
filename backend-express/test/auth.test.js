import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import jwt from "jsonwebtoken";
import { readConfig, issueToken } from "../src/auth.js";
import { loginInput } from "../src/input.js";
import { createApp } from "../src/routes.js";

const secret = randomBytes(32).toString("hex");

test("JWT issuance and configuration", async (t) => {
  await t.test("hex is decoded to 32 bytes and default claims verify", () => {
    const config = readConfig({ JWT_SECRET: secret });
    assert.equal(config.key.length, 32);
    assert.equal(config.ttl, 90);
    const token = issueToken({ id: 1, password: "private", hash: "private" }, config);
    const data = jwt.verify(token, config.key, { algorithms: ["HS256"], issuer: "webservice-class", audience: "board-api" });
    assert.equal(jwt.decode(token, { complete: true }).header.alg, "HS256");
    assert.equal(data.sub, "1");
    assert.equal(data.exp - data.iat, 90);
    assert.deepEqual(Object.keys(data).sort(), ["sub", "iat", "exp", "iss", "aud"].sort());
    assert.throws(() => jwt.verify(token, Buffer.from(secret), { algorithms: ["HS256"] }));
  });

  await t.test("empty, malformed, placeholder and simple example keys are refused", () => {
    for (const value of [undefined, "", " ", "a".repeat(63), "g".repeat(64), "0".repeat(64), "A".repeat(64), "REPLACE_WITH_RANDOM_64_HEX_CHARACTERS", "0123456789abcdef".repeat(4), "abcdef0123456789".repeat(4)]) {
      assert.throws(() => readConfig({ JWT_SECRET: value }), /JWT_SECRET/);
    }
  });

  await t.test("TTL is strict and custom TTL is used in exp", () => {
    for (const value of ["", "0", "-1", "1.5", "NaN", "Infinity", "3s", " 3", "3 ", "01", "1e3", "2147483648"]) {
      assert.throws(() => readConfig({ JWT_SECRET: secret, TOKEN_TTL: value }), /TOKEN_TTL/);
    }
    const config = readConfig({ JWT_SECRET: secret, TOKEN_TTL: "3" });
    const data = jwt.verify(issueToken({ id: 2 }, config), config.key);
    assert.equal(data.exp - data.iat, 3);
    assert.throws(() => readConfig({ JWT_SECRET: secret, JWT_ISSUER: "wrong" }));
    assert.throws(() => readConfig({ JWT_SECRET: secret, JWT_AUDIENCE: "wrong" }));
  });

  await t.test("login input requires exactly email and original password", () => {
    for (const body of [null, [], {}, { email: "x" }, { email: 1, password: "x" }, { email: "x", password: " " }, { email: "x".repeat(255), password: "x" }, { email: "x", password: "x".repeat(129) }]) {
      assert.throws(() => loginInput(body), (error) => error.status === 400 && error.code === "BAD_INPUT");
    }
    for (const key of ["constructor", "toString", "__proto__", "id"]) {
      assert.throws(() => loginInput(JSON.parse(`{"email":"x","password":"x","${key}":1}`)));
    }
    assert.deepEqual(loginInput({ email: " x ", password: " x " }), { email: "x", password: " x " });
  });

  await t.test("HTTP login issues only for valid accounts and authenticates me", async () => {
    const config = readConfig({ JWT_SECRET: secret, TOKEN_TTL: "3" });
    const server = createApp({}, config).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function login(body) {
      const res = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { status: res.status, data: await res.json() };
    }
    try {
      for (const [id, email] of [[1, "alice@class.test"], [2, "bob@class.test"]]) {
        const { status, data } = await login({ email, password: "Classroom!2026" });
        assert.equal(status, 200);
        assert.deepEqual(Object.keys(data).sort(), ["accessToken", "expiresIn", "user"].sort());
        assert.deepEqual(Object.keys(data.user).sort(), ["id", "name", "email"].sort());
        assert.equal(data.user.id, id);
        assert.equal(data.expiresIn, 3);
        assert.equal(jwt.verify(data.accessToken, config.key, { algorithms: ["HS256"], issuer: config.issuer, audience: config.audience }).sub, String(id));
        const me = await fetch(base + "/me", { headers: { Authorization: `Bearer ${data.accessToken}` } });
        assert.equal(me.status, 200);
        assert.deepEqual(await me.json(), data.user);
      }
      for (const [email, password] of [["alice@class.test", "wrong"], ["missing@class.test", "Classroom!2026"], ["alice@class.test", " Classroom!2026"], ["alice@class.test", "Classroom!2026 "]]) {
        const { status, data } = await login({ email, password });
        assert.equal(status, 401);
        assert.equal(data.code, "INVALID_CREDENTIALS");
        assert.equal(Object.hasOwn(data, "accessToken"), false);
      }
      const bad = await login({ email: "alice@class.test", password: null });
      assert.equal(bad.status, 400);
      assert.equal(bad.data.code, "BAD_INPUT");
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  await t.test("invalid configuration prevents the actual server from starting", () => {
    const dir = mkdtempSync(join(tmpdir(), "review-start-"));
    try {
      for (const values of [{ JWT_SECRET: "" }, { JWT_SECRET: "REPLACE_WITH_RANDOM_64_HEX_CHARACTERS" }, { TOKEN_TTL: "0" }]) {
        const res = spawnSync(process.execPath, [new URL("../src/app.js", import.meta.url).pathname], {
          env: { ...process.env, JWT_SECRET: secret, TOKEN_TTL: "90", JWT_ISSUER: "webservice-class", JWT_AUDIENCE: "board-api", DB_FILE: join(dir, "board.sqlite"), ...values },
          encoding: "utf8",
          timeout: 5000,
        });
        assert.equal(res.status, 1);
        assert.equal((res.stdout + res.stderr).includes(secret), false);
        assert.equal(res.stdout.includes("API http"), false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test("setup creates private settings without printing secrets or overwriting", () => {
    const dir = mkdtempSync(join(tmpdir(), "review-env-"));
    try {
      mkdirSync(join(dir, "scripts"));
      const script = join(dir, "scripts", "setup-env.mjs");
      copyFileSync(new URL("../scripts/setup-env.js", import.meta.url), script);
      const first = spawnSync(process.execPath, [script], { encoding: "utf8" });
      assert.equal(first.status, 0);
      const file = join(dir, ".env");
      const text = readFileSync(file, "utf8");
      const value = text.match(/^JWT_SECRET=([a-f0-9]{64})$/m)[1];
      assert.equal((first.stdout + first.stderr).includes(value), false);
      if (process.platform !== "win32") assert.equal(statSync(file).mode & 0o777, 0o600);
      const second = spawnSync(process.execPath, [script], { encoding: "utf8" });
      assert.equal(second.status, 1);
      assert.equal(readFileSync(file, "utf8"), text);
      assert.equal((second.stdout + second.stderr).includes(value), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
