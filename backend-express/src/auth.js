import jwt from "jsonwebtoken";
import { ApiError } from "./errors.js";
import { findPublic } from "./users.js";

export function readConfig(env = process.env) {
  const secret = env.JWT_SECRET;
  if (
    typeof secret !== "string" ||
    !/^[a-fA-F0-9]{64}$/.test(secret) ||
    /^([a-fA-F0-9])\1{63}$/i.test(secret) ||
    ["0123456789abcdef".repeat(4), "abcdef0123456789".repeat(4)].includes(secret.toLowerCase())
  ) {
    throw new Error("JWT_SECRET에 새로 생성한 64자리 hex 난수 키를 설정하세요.");
  }
  const value = env.TOKEN_TTL ?? "90";
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw new Error("TOKEN_TTL은 1~2147483647 범위의 정수 초여야 합니다.");
  }
  if (
    (env.JWT_ISSUER !== undefined && env.JWT_ISSUER !== "webservice-class") ||
    (env.JWT_AUDIENCE !== undefined && env.JWT_AUDIENCE !== "board-api")
  ) {
    throw new Error("JWT 발급자와 사용 대상 설정을 확인하세요.");
  }
  return {
    key: Buffer.from(secret, "hex"),
    ttl: Number(value),
    issuer: "webservice-class",
    audience: "board-api",
  };
}

export function issueToken(user, config) {
  return jwt.sign({}, config.key, {
    algorithm: "HS256",
    subject: String(user.id),
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: config.ttl,
  });
}

export function currentUserId(req, config) {
  const header = req.headers.authorization;
  const match = typeof header === "string" && /^Bearer[ \t]+(\S+)$/i.exec(header);
  if (!match) {
    throw new ApiError(401, "TOKEN_REQUIRED", "로그인이 필요합니다.");
  }
  try {
    const data = jwt.verify(match[1], config.key, {
      algorithms: ["HS256"],
      issuer: config.issuer,
      audience: config.audience,
      ignoreExpiration: true,
    });
    if (
      !data || typeof data !== "object" || Array.isArray(data) ||
      !["exp", "iss", "aud", "sub"].every((key) => Object.hasOwn(data, key)) ||
      !Number.isSafeInteger(data.exp) || data.exp <= 0 ||
      data.iss !== config.issuer || data.aud !== config.audience ||
      typeof data.sub !== "string" || !/^[1-9]\d*$/.test(data.sub) ||
      !Number.isSafeInteger(Number(data.sub)) || !findPublic(Number(data.sub))
    ) {
      throw new Error("Invalid claims");
    }
    if (data.exp <= Math.floor(Date.now() / 1000)) {
      throw new ApiError(401, "TOKEN_EXPIRED", "로그인 시간이 만료되었습니다. 다시 로그인하세요.");
    }
    return Number(data.sub);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "INVALID_TOKEN", "토큰을 확인할 수 없습니다.");
  }
}

export function assertOwner(user, author) {
  if (user !== author) {
    throw new ApiError(403, "FORBIDDEN", "본인이 작성한 글만 변경할 수 있습니다.");
  }
}
