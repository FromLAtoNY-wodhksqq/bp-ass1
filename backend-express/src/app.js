import "dotenv/config";
import { store } from "./store.js";
import { createApp } from "./routes.js";

const app = createApp(store);
const value = process.env.PORT ?? "8000";
if (!/^\d+$/.test(value) || !Number.isInteger(Number(value)) || Number(value) > 65535) {
  throw new Error("PORT는 0~65535 범위의 정수여야 합니다.");
}

const server = app.listen(Number(value), "127.0.0.1", () => {
  console.log(`API http://127.0.0.1:${server.address().port}`);
});

server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
