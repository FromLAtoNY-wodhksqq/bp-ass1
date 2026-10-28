import { ApiError } from "./errors.js";

const keys = new Set(["title", "content"]);

export function loginInput(body) {
  const keys = new Set(["email", "password"]);
  if (
    !body || Array.isArray(body) || typeof body !== "object" ||
    Object.keys(body).some((key) => !keys.has(key)) ||
    !Object.hasOwn(body, "email") || !Object.hasOwn(body, "password") ||
    typeof body.email !== "string" || typeof body.password !== "string"
  ) {
    throw new ApiError(400, "BAD_INPUT", "이메일과 비밀번호를 문자열로 입력하세요.");
  }
  const email = body.email.trim();
  const password = body.password;
  if (!email || [...email].length > 254 || !password.trim() || [...password].length > 128) {
    throw new ApiError(400, "BAD_INPUT", "이메일 또는 비밀번호의 길이를 확인하세요.");
  }
  return { email, password };
}

export function postInput(body) {
  if (
    !body ||
    Array.isArray(body) ||
    typeof body !== "object" ||
    Object.keys(body).some((key) => !keys.has(key))
  ) {
    throw new ApiError(400, "BAD_INPUT", "제목과 내용만 보내세요.");
  }
  const input = {};
  for (const [key, max] of [["title", 100], ["content", 5000]]) {
    if (!Object.hasOwn(body, key) || typeof body[key] !== "string") {
      throw new ApiError(400, "BAD_INPUT", "제목과 내용을 문자열로 입력하세요.");
    }
    const value = body[key].trim();
    if (!value || [...value].length > max) {
      throw new ApiError(400, "BAD_INPUT", "제목 또는 내용의 길이를 확인하세요.");
    }
    input[key] = value;
  }
  return input;
}

export function postId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new ApiError(400, "BAD_INPUT", "ID는 양의 정수여야 합니다.");
  }
  return Number(value);
}
