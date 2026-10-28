import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import jwt from "jsonwebtoken";
import { createApp } from "../src/routes.js";
import { readConfig, issueToken } from "../src/auth.js";

const dir = mkdtempSync(join(tmpdir(), "review-auth-"));
const file = join(dir, "board.sqlite");
process.env.DB_FILE = file;
const { store } = await import("../src/store.js");
const config = readConfig({ JWT_SECRET: randomBytes(32).toString("hex") });

test("JWT protection and ownership with unchanged data on failures", async (t) => {
  const server = createApp(store, config).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(method, path, token, body, header) {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(header !== undefined ? { Authorization: header } : token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text, data: text ? JSON.parse(text) : null };
  }
  async function fail(method, path, token, body, code, header) {
    const before = readFileSync(file);
    const posts = store.list();
    const res = await call(method, path, token, body, header);
    assert.equal(res.status, code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "BAD_INPUT" ? 400 : 401);
    assert.equal(res.data.code, code);
    if (res.status === 401) assert.equal(res.headers.get("WWW-Authenticate"), "Bearer");
    assert.deepEqual(store.list(), posts);
    assert.deepEqual(readFileSync(file), before);
  }
  const input = { title: "리뷰", content: "여러 시선" };
  let alice;
  let bob;
  let post;
  try {
    await t.test("two accounts login, me is public data and author comes from JWT", async () => {
      for (const id of [1, 2]) {
        const email = id === 1 ? "alice@class.test" : "bob@class.test";
        const res = await call("POST", "/auth/login", null, { email, password: "Classroom!2026" });
        assert.equal(res.status, 200);
        if (id === 1) alice = res.data.accessToken;
        else bob = res.data.accessToken;
        const me = await call("GET", "/me", res.data.accessToken);
        assert.equal(me.status, 200);
        assert.deepEqual(me.data, res.data.user);
        assert.deepEqual(Object.keys(me.data).sort(), ["id", "name", "email"].sort());
      }
      const res = await call("POST", "/posts", alice, input);
      assert.equal(res.status, 201);
      post = res.data;
      assert.equal(post.authorId, 1);
      assert.equal(res.headers.get("Location"), `/api/posts/${post.id}`);
    });

    await t.test("all four protected APIs require a well-formed Bearer header", async () => {
      for (const header of ["", "Basic abc", "Bearer", "Bearer a b"]) {
        for (const [method, path] of [["GET", "/me"], ["POST", "/posts"], ["PUT", `/posts/${post.id}`], ["DELETE", `/posts/${post.id}`]]) {
          await fail(method, path, null, method === "POST" || method === "PUT" ? input : undefined, "TOKEN_REQUIRED", header);
        }
      }
      await fail("GET", "/me", null, undefined, "TOKEN_REQUIRED");
    });

    await t.test("signed invalid claims, signatures and algorithms fail on every protected API", async () => {
      const valid = { sub: "1", exp: Math.floor(Date.now() / 1000) + 90, iss: config.issuer, aud: config.audience };
      const bad = [];
      for (const key of ["sub", "exp", "iss", "aud"]) {
        const data = { ...valid };
        delete data[key];
        bad.push(data);
      }
      for (const [key, values] of Object.entries({ sub: [1, "0", "01", "-1", "1.5", "9007199254740992", "99", null], exp: ["123", null, 1.5, 0], iss: ["wrong", 1], aud: ["wrong", 1, [config.audience]] })) {
        for (const value of values) bad.push({ ...valid, [key]: value });
      }
      bad.push({ ...valid, exp: 1, iss: "wrong" });
      const tokens = bad.map((data) => jwt.sign(JSON.stringify(data), config.key, { algorithm: "HS256" }));
      tokens.push(jwt.sign(valid, randomBytes(32), { algorithm: "HS256" }));
      tokens.push(jwt.sign(valid, config.key, { algorithm: "HS384" }));
      tokens.push(jwt.sign(valid, "", { algorithm: "none" }));
      tokens.push("not-a-jwt");
      const parts = alice.split(".");
      parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
      tokens.push(parts.join("."));
      for (const token of tokens) {
        for (const [method, path] of [["GET", "/me"], ["POST", "/posts"], ["PUT", `/posts/${post.id}`], ["DELETE", `/posts/${post.id}`]]) {
          await fail(method, path, token, method === "POST" || method === "PUT" ? input : undefined, "INVALID_TOKEN");
        }
      }
    });

    await t.test("authentication, existence, owner and input precedence is preserved", async () => {
      await fail("PUT", "/posts/999", null, {}, "TOKEN_REQUIRED");
      await fail("DELETE", "/posts/999", null, undefined, "TOKEN_REQUIRED");
      await fail("PUT", "/posts/999", alice, {}, "NOT_FOUND");
      await fail("DELETE", "/posts/999", alice, undefined, "NOT_FOUND");
      await fail("PUT", `/posts/${post.id}`, bob, { title: " ", content: " " }, "FORBIDDEN");
      await fail("DELETE", `/posts/${post.id}`, bob, undefined, "FORBIDDEN");
      await fail("PUT", `/posts/${post.id}`, alice, { title: " ", content: " " }, "BAD_INPUT");
      for (const key of ["authorId", "userId", "id"]) {
        await fail("POST", "/posts", bob, { ...input, [key]: 1 }, "BAD_INPUT");
      }
    });

    await t.test("unexpected fields and malformed data never change persisted posts", async () => {
      for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty", "__defineGetter__", "prototype", "authorId", "userId", "id"]) {
        const body = JSON.parse(`{"title":"x","content":"y","${key}":1}`);
        await fail("POST", "/posts", bob, body, "BAD_INPUT");
        await fail("PUT", `/posts/${post.id}`, alice, body, "BAD_INPUT");
        await fail("PUT", `/posts/${post.id}`, bob, body, "FORBIDDEN");
      }
      for (const body of [{ title: null, content: "x" }, { title: "x", content: [] }, { title: {}, content: "x" }, { title: "x", content: 12 }]) {
        await fail("POST", "/posts", alice, body, "BAD_INPUT");
        await fail("PUT", `/posts/${post.id}`, alice, body, "BAD_INPUT");
      }
      const malformed = { sub: "1", exp: Math.floor(Date.now() / 1000) + 90, iss: config.issuer, aud: config.audience, nbf: Math.floor(Date.now() / 1000) + 3600 };
      const token = jwt.sign(malformed, config.key, { algorithm: "HS256" });
      await fail("GET", "/me", token, undefined, "INVALID_TOKEN");
    });

    await t.test("actual expiration is TOKEN_EXPIRED on every protected API", async () => {
      const token = issueToken({ id: 2 }, { ...config, ttl: 1 });
      const data = jwt.verify(token, config.key);
      await setTimeout(Math.max(0, data.exp * 1000 - Date.now() + 40));
      for (const [method, path] of [["GET", "/me"], ["POST", "/posts"], ["PUT", `/posts/${post.id}`], ["DELETE", `/posts/${post.id}`]]) {
        await fail(method, path, token, method === "POST" || method === "PUT" ? input : undefined, "TOKEN_EXPIRED");
      }
    });

    await t.test("both owners can update and delete their own posts", async () => {
      const made = await call("POST", "/posts", bob, input);
      assert.equal(made.status, 201);
      assert.equal(made.data.authorId, 2);
      for (const [token, item] of [[alice, post], [bob, made.data]]) {
        const res = await call("PUT", `/posts/${item.id}`, token, { title: "수정", content: "수정" });
        assert.equal(res.status, 200);
        assert.equal(res.data.createdAt, item.createdAt);
        assert.equal(res.data.authorId, item.authorId);
        const removed = await call("DELETE", `/posts/${item.id}`, token);
        assert.equal(removed.status, 204);
        assert.equal(removed.text, "");
      }
      const list = await call("GET", "/posts");
      assert.equal(list.status, 200);
      assert.deepEqual(list.data, []);
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
});
