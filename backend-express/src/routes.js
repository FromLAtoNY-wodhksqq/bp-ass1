import express from "express";
import { ApiError } from "./errors.js";
import { postInput, postId, loginInput } from "./input.js";
import { verifyCredentials, findPublic } from "./users.js";
import { readConfig, issueToken, currentUserId, assertOwner } from "./auth.js";

export function createApp(store, config = readConfig()) {
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  function getPost(id) {
    const post = store.get(id);
    if (!post) throw new ApiError(404, "NOT_FOUND", "게시글이 없습니다.");
    return post;
  }

  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.post("/api/auth/login", (req, res) => {
    const input = loginInput(req.body);
    const user = verifyCredentials(input.email, input.password);
    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호를 확인하세요.");
    }
    const accessToken = issueToken(user, config);
    res.status(200).json({ accessToken, expiresIn: config.ttl, user });
  });

  app.get("/api/me", (req, res) => {
    res.status(200).json(findPublic(currentUserId(req, config)));
  });

  app.get("/api/posts", (req, res) => {
    res.status(200).json(store.list());
  });

  app.get("/api/posts/:id", (req, res) => {
    res.status(200).json(getPost(postId(req.params.id)));
  });

  app.post("/api/posts", (req, res) => {
    const user = currentUserId(req, config);
    const post = store.create(postInput(req.body), user);
    res.status(201).location(`/api/posts/${post.id}`).json(post);
  });

  app.put("/api/posts/:id", (req, res) => {
    const user = currentUserId(req, config);
    const id = postId(req.params.id);
    const post = getPost(id);
    assertOwner(user, post.authorId);
    res.status(200).json(store.update(id, postInput(req.body)));
  });

  app.delete("/api/posts/:id", (req, res) => {
    const user = currentUserId(req, config);
    const id = postId(req.params.id);
    const post = getPost(id);
    assertOwner(user, post.authorId);
    store.remove(id);
    res.status(204).end();
  });

  app.use((req, res) => {
    res.status(404).json({ code: "NOT_FOUND", message: "API가 없습니다." });
  });

  app.use((error, req, res, next) => {
    const bad = ["entity.parse.failed", "entity.too.large"].includes(error.type);
    const status = error instanceof ApiError ? error.status : bad ? 400 : 500;
    if (status === 401) res.set("WWW-Authenticate", "Bearer");
    res.status(status).json({
      code: error instanceof ApiError ? error.code : bad ? "BAD_INPUT" : "INTERNAL_ERROR",
      message: error instanceof ApiError ? error.message : bad ? "JSON 입력을 확인하세요." : "서버 오류가 발생했습니다.",
    });
  });

  return app;
}
