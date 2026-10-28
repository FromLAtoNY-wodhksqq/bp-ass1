import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const file = new URL("../.env", import.meta.url);
const data = [
  `JWT_SECRET=${randomBytes(32).toString("hex")}`,
  "JWT_ISSUER=webservice-class",
  "JWT_AUDIENCE=board-api",
  "TOKEN_TTL=90",
  "DB_FILE=data/board.sqlite",
  "",
].join("\n");

try {
  writeFileSync(file, data, { flag: "wx", mode: 0o600 });
  console.log("로컬 .env 설정을 생성했습니다.");
} catch (error) {
  console.error(error.code === "EEXIST" ? ".env가 이미 있습니다. 기존 설정을 유지합니다." : ".env 설정을 생성하지 못했습니다.");
  process.exitCode = 1;
}
