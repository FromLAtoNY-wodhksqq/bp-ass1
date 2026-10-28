import test from "node:test";
import assert from "node:assert/strict";
import { api, login, getSession, clearSession, subscribe, authorizationHeaders, canEdit } from "../src/api.js";

const original = globalThis.fetch;
const user = { id: 1, name: "Alice", email: "alice@class.test" };
function response(data, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
async function signIn() {
  globalThis.fetch = async () => response({ accessToken: "test-token", user });
  await login(user.email, "test-password");
}

test("memory session and API requests", async (t) => {
  try {
    await t.test("guest has no Authorization; login stores memory and notifies", async () => {
      clearSession();
      assert.deepEqual(authorizationHeaders(), {});
      assert.equal(canEdit({ authorId: 1 }), false);
      let notified = 0;
      const stop = subscribe(() => notified++);
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "/api/auth/login");
        assert.equal(options.method, "POST");
        assert.equal(options.headers.Authorization, undefined);
        assert.deepEqual(JSON.parse(options.body), { email: user.email, password: "test-password" });
        return response({ accessToken: "test-token", user });
      };
      assert.deepEqual(await login(user.email, "test-password"), user);
      assert.deepEqual(getSession(), { accessToken: "test-token", user });
      assert.equal(notified, 1);
      assert.equal(canEdit({ authorId: 1 }), true);
      assert.equal(canEdit({ authorId: 2 }), false);
      stop();
    });

    await t.test("public reads omit token; protected calls send Bearer and JSON", async () => {
      const calls = [];
      globalThis.fetch = async (url, options) => {
        calls.push({ url, ...options });
        return response(url.endsWith("/posts") && !options.method ? [] : { id: 1 });
      };
      await api.list(); await api.detail(1); await api.me();
      await api.create({ title: "x", content: "y" });
      await api.update(1, { title: "new", content: "new" });
      assert.equal(calls[0].headers.Authorization, undefined);
      assert.equal(calls[1].headers.Authorization, undefined);
      for (const item of calls.slice(2)) assert.equal(item.headers.Authorization, "Bearer test-token");
      assert.equal(calls[3].method, "POST");
      assert.equal(calls[4].method, "PUT");
      assert.deepEqual(JSON.parse(calls[3].body), { title: "x", content: "y" });
    });

    await t.test("204 delete does not parse JSON", async () => {
      globalThis.fetch = async (url, options) => {
        assert.equal(options.method, "DELETE");
        return { status: 204, ok: true, json: () => { throw new Error("JSON must not be parsed"); } };
      };
      assert.equal(await api.remove(1), null);
    });

    await t.test("400, 403 and 404 retain session while 401 clears and notifies", async () => {
      for (const [status, code] of [[400, "BAD_INPUT"], [403, "FORBIDDEN"], [404, "NOT_FOUND"]]) {
        globalThis.fetch = async () => response({ code, message: "error" }, status);
        await assert.rejects(api.me(), (error) => error.status === status && error.code === code);
        assert.deepEqual(getSession().user, user);
      }
      for (const code of ["TOKEN_REQUIRED", "INVALID_TOKEN", "TOKEN_EXPIRED", "INVALID_CREDENTIALS"]) {
        await signIn();
        let changed = false;
        const stop = subscribe(() => { changed = true; });
        globalThis.fetch = async () => response({ code, message: "error" }, 401);
        await assert.rejects(api.me(), (error) => error.code === code);
        assert.equal(changed, true);
        assert.deepEqual(getSession(), { accessToken: "", user: null });
        stop();
      }
    });

    await t.test("logout clears permissions and late successful login cannot restore it", async () => {
      await signIn();
      let finish;
      globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
      const pending = login(user.email, "test-password");
      clearSession();
      assert.deepEqual(authorizationHeaders(), {});
      assert.equal(canEdit({ authorId: 1 }), false);
      finish(response({ accessToken: "late", user }));
      await assert.rejects(pending, { name: "AbortError" });
      assert.equal(getSession().user, null);
    });

    await t.test("late 401 for old session cannot log out a new user", async () => {
      await signIn();
      let finish;
      globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
      const pending = api.me();
      clearSession();
      await signIn();
      const current = getSession();
      finish(response({ code: "TOKEN_EXPIRED" }, 401));
      await assert.rejects(pending, { name: "AbortError" });
      assert.equal(getSession(), current);
    });

    await t.test("non-JSON 401 still clears session and malformed success cannot report success", async () => {
      await signIn();
      globalThis.fetch = async () => new Response("not JSON", { status: 401 });
      await assert.rejects(api.me(), (error) => error.status === 401);
      assert.equal(getSession().user, null);
      await signIn();
      globalThis.fetch = async () => new Response("not JSON", { status: 200 });
      await assert.rejects(api.me(), (error) => error.code === "INVALID_RESPONSE");
      assert.deepEqual(getSession().user, user);
    });

    await t.test("network errors propagate without clearing valid memory session", async () => {
      globalThis.fetch = async () => { throw new TypeError("network"); };
      await assert.rejects(api.me(), /network/);
      assert.deepEqual(getSession().user, user);
    });
  } finally {
    globalThis.fetch = original;
    clearSession();
  }
});
