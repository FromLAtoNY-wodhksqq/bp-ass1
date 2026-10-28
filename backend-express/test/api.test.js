import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createApp } from "../src/routes.js";
import { postInput } from "../src/input.js";

const dir = mkdtempSync(join(tmpdir(), "review-api-"));
process.env.DB_FILE = join(dir, "board.sqlite");
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.TOKEN_TTL = "90";
process.env.JWT_ISSUER = "webservice-class";
process.env.JWT_AUDIENCE = "board-api";
const { store } = await import("../src/store.js");

async function serve(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return {
    server,
    async call(method, path, body, headers = {}) {
      const res = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, headers: res.headers, text, data: text ? JSON.parse(text) : null };
    },
  };
}

test("public and protected post API contracts", async (t) => {
  const live = await serve(createApp(store));
  async function account(email) {
    const res = await live.call("POST", "/auth/login", { email, password: "Classroom!2026" });
    assert.equal(res.status, 200);
    const token = res.data.accessToken;
    return { call: (method, path, body, headers = {}) => live.call(method, path, body, { Authorization: `Bearer ${token}`, ...headers }) };
  }
  const alice = await account("alice@class.test");
  const bob = await account("bob@class.test");
  let post;
  const input = { title: " 영화 ", content: " 리뷰 " };

  async function error(api, method, path, body, status, code, headers) {
    const res = await api.call(method, path, body, headers);
    assert.equal(res.status, status);
    assert.equal(res.data.code, code);
    assert.equal(typeof res.data.message, "string");
    if (status === 401) assert.equal(res.headers.get("WWW-Authenticate"), "Bearer");
  }

  try {
    await t.test("empty public list and safe ID validation", async () => {
      assert.deepEqual((await live.call("GET", "/posts")).data, []);
      for (const id of ["abc", "0", "-1", "1.5", "01", "9007199254740992"]) {
        await error(live, "GET", `/posts/${id}`, undefined, 400, "BAD_INPUT");
      }
      await error(live, "GET", "/posts/999", undefined, 404, "NOT_FOUND");
    });

    await t.test("missing or invalid tokens cannot write", async () => {
      for (const headers of [{}, { Authorization: "Bearer pretend" }]) {
        for (const [method, path] of [["POST", "/posts"], ["PUT", "/posts/999"], ["DELETE", "/posts/999"]]) {
          await error(live, method, path, method === "DELETE" ? undefined : input, 401, headers.Authorization ? "INVALID_TOKEN" : "TOKEN_REQUIRED", headers);
        }
      }
      assert.deepEqual(store.list(), []);
    });

    await t.test("real Alice login verifies 201 and Location plus public detail", async () => {
      const res = await alice.call("POST", "/posts", input);
      assert.equal(res.status, 201);
      post = res.data;
      assert.equal(res.headers.get("Location"), `/api/posts/${post.id}`);
      assert.equal(post.title, "영화");
      assert.equal(post.content, "리뷰");
      assert.equal(post.authorId, 1);
      const detail = await live.call("GET", `/posts/${post.id}`);
      assert.equal(detail.status, 200);
      assert.deepEqual(detail.data, post);
      assert.deepEqual((await live.call("GET", "/posts")).data, [post]);
    });

    await t.test("missing, non-string, blank, oversized and extra properties are rejected", async () => {
      const bad = [null, [], {}, { title: "x" }, { content: "x" }, { ...input, title: 1 }, { ...input, content: false }, { ...input, title: " \n " }, { ...input, content: "\t" }, { ...input, title: "가".repeat(101) }, { ...input, content: "가".repeat(5001) }];
      for (const key of ["authorId", "userId", "id", "constructor", "toString", "__proto__"]) {
        bad.push(JSON.parse(`{"title":"x","content":"x","${key}":1}`));
      }
      for (const body of bad) {
        await error(alice, "POST", "/posts", body, 400, "BAD_INPUT");
        await error(alice, "PUT", `/posts/${post.id}`, body, 400, "BAD_INPUT");
      }
      assert.deepEqual(store.list(), [post]);
      assert.throws(() => postInput(Object.create({ title: "x", content: "x" })));
      assert.deepEqual(postInput({ title: "😀".repeat(100), content: "가".repeat(5000) }), { title: "😀".repeat(100), content: "가".repeat(5000) });
    });

    await t.test("malformed JSON becomes a JSON 400 error", async () => {
      await error(live, "POST", "/posts", '{"title":', 400, "BAD_INPUT");
      await error(alice, "POST", "/posts", JSON.stringify({ title: "x", content: "x".repeat(70000) }), 400, "BAD_INPUT");
    });

    await t.test("existence and ownership precede body checks with real JWTs", async () => {
      await error(alice, "PUT", "/posts/999", {}, 404, "NOT_FOUND");
      await error(alice, "DELETE", "/posts/999", undefined, 404, "NOT_FOUND");
      await error(bob, "PUT", `/posts/${post.id}`, {}, 403, "FORBIDDEN");
      await error(bob, "DELETE", `/posts/${post.id}`, undefined, 403, "FORBIDDEN");
      await error(live, "PUT", `/posts/${post.id}`, {}, 401, "TOKEN_REQUIRED");
      assert.deepEqual(store.get(post.id), post);
    });

    await t.test("update returns 200 and delete returns 204 without any body", async () => {
      const res = await alice.call("PUT", `/posts/${post.id}`, { title: "수정", content: "수정 내용" });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, "수정");
      assert.equal(res.data.authorId, post.authorId);
      assert.equal(res.data.createdAt, post.createdAt);
      const removed = await alice.call("DELETE", `/posts/${post.id}`);
      assert.equal(removed.status, 204);
      assert.equal(removed.text, "");
      assert.equal(removed.headers.get("Content-Type"), null);
      await error(live, "GET", `/posts/${post.id}`, undefined, 404, "NOT_FOUND");
    });
  } finally {
    await Promise.all([live].map(({ server }) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
    rmSync(dir, { recursive: true, force: true });
  }
});
