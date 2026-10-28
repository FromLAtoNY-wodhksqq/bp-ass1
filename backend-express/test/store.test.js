import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { findPublic, verifyCredentials } from "../src/users.js";

const dir = mkdtempSync(join(tmpdir(), "review-store-"));
const file = join(dir, "data", "board.sqlite");
process.env.DB_FILE = file;
const { store } = await import("../src/store.js");
const url = new URL("../src/store.js", import.meta.url).href;

function reload() {
  const code = `import { store } from ${JSON.stringify(url)}; console.log(JSON.stringify(store.list()));`;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    env: { ...process.env, DB_FILE: file },
    encoding: "utf8",
  }));
}

test("SQLite storage and credentials", async (t) => {
  try {
    await t.test("database and table are created without an existing file", () => {
      assert.ok(existsSync(file));
      assert.equal(readFileSync(file).subarray(0, 16).toString(), "SQLite format 3\0");
      assert.deepEqual(store.list(), []);
      assert.equal(store.get(999), null);
    });

    let first;
    let second;
    await t.test("bound values remain literal and public fields match the contract", () => {
      first = store.create({ title: "영화 '); DROP TABLE posts; --", content: "다른 시선\n리뷰" }, 1);
      second = store.create({ title: "Bob의 리뷰", content: "감상" }, 2);
      assert.deepEqual(Object.keys(first).sort(), ["id", "title", "content", "authorId", "authorName", "createdAt", "updatedAt"].sort());
      assert.equal(first.title, "영화 '); DROP TABLE posts; --");
      assert.equal(first.authorId, 1);
      assert.equal(first.authorName, "Alice");
      assert.equal(second.authorName, "Bob");
      assert.equal(new Date(first.createdAt).toISOString(), first.createdAt);
      assert.deepEqual(store.list().map((post) => post.id), [second.id, first.id]);
      assert.equal(store.get("1 OR 1=1"), null);
      assert.deepEqual(reload(), store.list());
    });

    await t.test("updates persist and preserve author and creation time", () => {
      const post = store.update(first.id, { title: "수정", content: "새 내용" });
      assert.equal(post.content, "새 내용");
      assert.equal(post.authorId, first.authorId);
      assert.equal(post.createdAt, first.createdAt);
      assert.equal(new Date(post.updatedAt).toISOString(), post.updatedAt);
      assert.equal(store.update(999, { title: "없음", content: "없음" }), null);
      assert.deepEqual(reload(), store.list());
    });

    await t.test("failed file save restores memory and leaves persisted data unchanged", () => {
      const before = store.list();
      const bytes = readFileSync(file);
      mkdirSync(file + ".tmp");
      assert.throws(() => store.update(first.id, { title: "실패", content: "실패" }));
      assert.deepEqual(store.list(), before);
      assert.deepEqual(readFileSync(file), bytes);
      rmSync(file + ".tmp", { recursive: true });
    });

    await t.test("deletes persist across a new Node process", () => {
      assert.equal(store.remove(second.id), true);
      assert.equal(store.remove(second.id), false);
      assert.equal(store.get(second.id), null);
      assert.deepEqual(reload(), store.list());
      assert.throws(() => store.create({ title: "없는 사용자", content: "본문" }, 99));
    });

    await t.test("Alice and Bob accept only their exact password", () => {
      for (const [id, name] of [[1, "Alice"], [2, "Bob"]]) {
        const email = name.toLowerCase() + "@class.test";
        assert.deepEqual(verifyCredentials(email, "Classroom!2026"), { id, name, email });
        for (const password of ["wrong", "", " Classroom!2026", "Classroom!2026 ", "x".repeat(129), null]) {
          assert.equal(verifyCredentials(email, password), null);
        }
      }
      assert.equal(verifyCredentials("missing@class.test", "Classroom!2026"), null);
      assert.equal(verifyCredentials(null, "Classroom!2026"), null);
    });

    await t.test("public users do not expose hashes and cannot mutate stored accounts", () => {
      const user = findPublic(1);
      assert.deepEqual(Object.keys(user).sort(), ["id", "name", "email"].sort());
      user.name = "Changed";
      assert.equal(findPublic(1).name, "Alice");
      assert.equal(findPublic(99), null);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
