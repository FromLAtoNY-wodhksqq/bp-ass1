import { text } from "./text.js";

export function errorInfo(error) {
  if (error.status === 400) {
    return { message: `${text.badInput}${error.message ? ` ${error.message}` : ""}`, reload: false };
  }
  if (error.status === 401) {
    const message = Object.hasOwn(text.loginErrors, error.code) ? text.loginErrors[error.code] : text.unauthorized;
    return { message, reload: false };
  }
  if (error.status === 403) return { message: text.forbidden, reload: false };
  if (error.status === 404) return { message: text.missing, reload: true };
  return { message: error.status >= 500 ? text.serverError : text.network, reload: false };
}

export async function runTask(action, success, hooks) {
  try {
    await action(hooks.active);
    if (hooks.active() && success) hooks.success(success);
  } catch (error) {
    if (hooks.active() && error.name !== "AbortError") await hooks.error(error);
  } finally {
    if (hooks.active()) hooks.finish();
  }
}
