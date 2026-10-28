import "dotenv/config";
import initSqlJs from "sql.js";
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findPublic } from "./users.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const file = resolve(root, process.env.DB_FILE || "data/board.sqlite");
mkdirSync(dirname(file), { recursive: true });
const SQL = await initSqlJs();
let db = new SQL.Database(existsSync(file) ? readFileSync(file) : undefined);
db.run(
  "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, author_id INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
);

function flush() {
  writeFileSync(file + ".tmp", db.export());
  renameSync(file + ".tmp", file);
}

function rows(sql, args = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(args);
    const data = [];
    while (stmt.step()) data.push(stmt.getAsObject());
    return data;
  } finally {
    stmt.free();
  }
}

function shape(post) {
  return post
    ? {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author_id,
        authorName: findPublic(post.author_id)?.name ?? "Unknown",
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }
    : null;
}

function change(action) {
  const saved = db.export();
  try {
    const data = action();
    flush();
    return data;
  } catch (error) {
    db.close();
    db = new SQL.Database(saved);
    throw error;
  }
}

export const store = {
  list: () => rows("SELECT * FROM posts ORDER BY id DESC").map(shape),
  get: (id) => shape(rows("SELECT * FROM posts WHERE id = ?", [id])[0]),
  create(input, author) {
    if (!findPublic(author)) throw new Error("사용자를 확인할 수 없습니다.");
    return change(() => {
      const now = new Date().toISOString();
      db.run(
        "INSERT INTO posts (title, content, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [input.title, input.content, author, now, now],
      );
      const id = rows("SELECT last_insert_rowid() AS id")[0].id;
      return store.get(id);
    });
  },
  update(id, input) {
    if (!store.get(id)) return null;
    return change(() => {
      db.run("UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?", [
        input.title,
        input.content,
        new Date().toISOString(),
        id,
      ]);
      return store.get(id);
    });
  },
  remove(id) {
    if (!store.get(id)) return false;
    return change(() => {
      db.run("DELETE FROM posts WHERE id = ?", [id]);
      return true;
    });
  },
};

flush();
