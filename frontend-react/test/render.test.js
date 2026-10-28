import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("React initial guest and logged-in markup", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  const original = globalThis.fetch;
  try {
    const { default: App } = await server.ssrLoadModule("/src/App.jsx");
    const api = await server.ssrLoadModule("/src/api.js");
    const guest = renderToStaticMarkup(React.createElement(App));
    assert.match(guest, /리뷰를 작성하려면 로그인하세요/);
    assert.match(guest, /type="password"/);
    assert.doesNotMatch(guest, />수정<|>삭제</);
    globalThis.fetch = async () => new Response(JSON.stringify({ accessToken: "test-token", user: { id: 1, name: "Alice", email: "alice@class.test" } }));
    await api.login("alice@class.test", "test-password");
    const signed = renderToStaticMarkup(React.createElement(App));
    assert.match(signed, /Alice/);
    assert.match(signed, /로그아웃/);
    assert.match(signed, /<textarea/);
    assert.doesNotMatch(signed, /type="password"/);
    api.clearSession();
    const out = renderToStaticMarkup(React.createElement(App));
    assert.doesNotMatch(out, /Alice|<textarea/);
  } finally {
    globalThis.fetch = original;
    await server.close();
  }
});
