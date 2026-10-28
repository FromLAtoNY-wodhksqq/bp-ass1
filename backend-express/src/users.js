import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const users = ["Alice", "Bob"].map((name, i) => {
  const salt = randomBytes(16);
  return {
    id: i + 1,
    name,
    email: `${name.toLowerCase()}@class.test`,
    salt,
    hash: scryptSync("Classroom!2026", salt, 32),
  };
});

export function findPublic(id) {
  const user = users.find((user) => user.id === id);
  return user ? { id: user.id, name: user.name, email: user.email } : null;
}

export function verifyCredentials(email, password) {
  if (typeof email !== "string" || typeof password !== "string") return null;
  if ([...password].length > 128) return null;
  const user = users.find((user) => user.email === email);
  const ref = user ?? users[0];
  const hash = scryptSync(password, ref.salt, 32);
  const ok = timingSafeEqual(hash, ref.hash);
  return user && ok ? findPublic(user.id) : null;
}
