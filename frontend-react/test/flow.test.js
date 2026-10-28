import test from "node:test";
import assert from "node:assert/strict";
import { errorInfo, runTask } from "../src/flow.js";
import { text } from "../src/text.js";

test("screen error policy and request outcome messages", async (t) => {
  await t.test("400 explains correction and only 404 requests list refresh", () => {
    const info = errorInfo({ status: 400, code: "BAD_INPUT", message: "제목 확인" });
    assert.match(info.message, /입력값을 수정/);
    assert.match(info.message, /제목 확인/);
    assert.equal(info.reload, false);
    assert.deepEqual(errorInfo({ status: 404 }), { message: text.missing, reload: true });
    assert.deepEqual(errorInfo({ status: 403 }), { message: text.forbidden, reload: false });
  });

  await t.test("401 codes have distinct login guidance and unknown codes fall back safely", () => {
    const messages = new Set();
    for (const code of ["INVALID_CREDENTIALS", "TOKEN_REQUIRED", "INVALID_TOKEN", "TOKEN_EXPIRED"]) {
      const info = errorInfo({ status: 401, code });
      assert.match(info.message, /로그인/);
      messages.add(info.message);
    }
    assert.equal(messages.size, 4);
    for (const code of [undefined, "constructor", "toString", "__proto__"]) {
      assert.equal(errorInfo({ status: 401, code }).message, text.unauthorized);
    }
  });

  await t.test("failed operations never announce success and always release busy state", async () => {
    for (const status of [400, 401, 403, 404, 500]) {
      const events = [];
      const error = Object.assign(new Error("failure"), { status });
      await runTask(async () => { throw error; }, "저장 성공", {
        active: () => true,
        success: (message) => events.push(["success", message]),
        error: (actual) => events.push(["error", actual.status]),
        finish: () => events.push(["finish"]),
      });
      assert.deepEqual(events, [["error", status], ["finish"]]);
    }
  });

  await t.test("success follows the awaited operation; cancelled or stale work stays silent", async () => {
    const events = [];
    const hooks = {
      active: () => true,
      success: (message) => events.push(message),
      error: () => events.push("error"),
      finish: () => events.push("finish"),
    };
    await runTask(async () => { events.push("completed"); }, "success", hooks);
    assert.deepEqual(events, ["completed", "success", "finish"]);
    events.length = 0;
    await runTask(async () => { throw new DOMException("cancel", "AbortError"); }, "success", hooks);
    assert.deepEqual(events, ["finish"]);
    events.length = 0;
    await runTask(async () => { throw new Error("late"); }, "success", { ...hooks, active: () => false });
    assert.deepEqual(events, []);
  });

  await t.test("failure in a follow-up refresh does not become a save success message", async () => {
    const events = [];
    await runTask(async () => {
      events.push("write completed");
      throw new TypeError("refresh failed");
    }, "saved", {
      active: () => true,
      success: () => events.push("success"),
      error: () => events.push("error"),
      finish: () => events.push("finish"),
    });
    assert.deepEqual(events, ["write completed", "error", "finish"]);
  });
});
