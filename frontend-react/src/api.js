let session = { accessToken: "", user: null };
const listeners = new Set();

export const getSession = () => session;
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSession(data) {
  session = data;
  for (const listener of listeners) listener();
}

export function clearSession() {
  setSession({ accessToken: "", user: null });
}

export function authorizationHeaders() {
  return session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function cancelled() {
  return new DOMException("세션이 변경되었습니다.", "AbortError");
}

export async function request(path, options = {}, auth = true) {
  const before = session;
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth ? authorizationHeaders() : {}),
      ...options.headers,
    },
  });
  if (auth && before !== session) throw cancelled();
  let data = null;
  if (res.status !== 204) {
    try { data = await res.json(); } catch { data = null; }
  }
  if (auth && before !== session) throw cancelled();
  if (!res.ok) {
    if (res.status === 401 && before === session) clearSession();
    const error = new Error(data?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.code = data?.code;
    throw error;
  }
  if (res.status !== 204 && data === null) {
    const error = new Error("서버 응답을 확인할 수 없습니다.");
    error.code = "INVALID_RESPONSE";
    throw error;
  }
  return data;
}

export async function login(email, password) {
  const before = session;
  const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false);
  if (before !== session) throw cancelled();
  setSession({ accessToken: data.accessToken, user: data.user });
  return data.user;
}

export function canEdit(post) {
  return Boolean(session.user && post && session.user.id === post.authorId);
}

export const api = {
  list: () => request("/posts", {}, false),
  detail: (id) => request(`/posts/${id}`, {}, false),
  create: (input) => request("/posts", { method: "POST", body: JSON.stringify(input) }),
  update: (id, input) => request(`/posts/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  me: () => request("/me"),
};
