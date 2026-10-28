import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, login, subscribe, getSession, clearSession, canEdit } from "./api.js";
import { text } from "./text.js";
import { errorInfo, runTask } from "./flow.js";

export default function App() {
  const { user } = useSyncExternalStore(subscribe, getSession, getSession);
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(text.loading);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  function reset() {
    setTitle("");
    setContent("");
    setEditing(null);
  }

  useEffect(() => { reset(); setPassword(""); }, [user]);

  useEffect(() => {
    let active = true;
    const id = seq.current;
    api.list().then((data) => {
      if (active) { setPosts(data); if (id === seq.current) setMessage(text.ready); }
    }).catch((error) => { if (active && id === seq.current) setMessage(errorInfo(error).message); });
    return () => { active = false; seq.current += 1; };
  }, []);

  async function run(action, success) {
    const id = ++seq.current;
    setBusy(true);
    await runTask(action, success, {
      active: () => id === seq.current,
      success: setMessage,
      finish: () => setBusy(false),
      error: async (error) => {
        const info = errorInfo(error);
        setMessage(info.message);
        if (info.reload) {
          setSelected(null);
          reset();
          try {
            const data = await api.list();
            if (id === seq.current) setPosts(data);
          } catch {
            if (id === seq.current) setMessage(`${info.message} ${text.refreshFailed}`);
          }
        }
      },
    });
  }

  async function signIn(e) {
    e.preventDefault();
    await run(async (active) => {
      await login(email, password);
      if (active()) { setPassword(""); setSelected(null); reset(); }
    }, text.loggedIn);
  }

  function logout() {
    seq.current += 1;
    clearSession();
    reset();
    setSelected(null);
    setEmail("");
    setPassword("");
    setBusy(false);
    setMessage(text.loggedOut);
  }

  async function save(e) {
    e.preventDefault();
    if (!user) { setMessage(text.writeGuide); return; }
    if (!title.trim() || !content.trim()) { setMessage(text.required); return; }
    if ([...title.trim()].length > 100 || [...content.trim()].length > 5000) {
      setMessage(text.tooLong); return;
    }
    await run(async (active) => {
      const post = editing ? await api.update(editing, { title, content }) : await api.create({ title, content });
      if (!active()) return;
      setSelected(post);
      reset();
      const data = await api.list();
      if (active()) setPosts(data);
    }, text.saved);
  }

  async function remove() {
    if (!window.confirm(text.confirmDelete)) return;
    await run(async (active) => {
      await api.remove(selected.id);
      if (!active()) return;
      setSelected(null);
      reset();
      const data = await api.list();
      if (active()) setPosts(data);
    }, text.removed);
  }

  return (
    <main>
      <header><h1>{text.title}</h1><p>{text.intro}</p></header>
      <p className="message" role="status" aria-live="polite">{message}</p>
      <section aria-labelledby="login-title">
        <h2 id="login-title">{text.login}</h2>
        {user ? <>
          <p>{user.name} ({user.email})</p>
          <div className="actions">
            <button type="button" onClick={logout}>{text.logout}</button>
            <button type="button" disabled={busy} onClick={() => run(async (active) => {
              const me = await api.me();
              if (active()) setMessage(`${me.name} (${me.email})`);
            })}>{text.me}</button>
          </div>
        </> : <>
          <p>{text.guest}</p>
          <form onSubmit={signIn}>
            <label>{text.email}<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} /></label>
            <label>{text.password}<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} /></label>
            <button disabled={busy}>{text.login}</button>
          </form>
        </>}
      </section>
      <div className="grid">
        <div>
          <section aria-labelledby="list-title">
            <h2 id="list-title">{text.list} ({posts.length})</h2>
            <button type="button" disabled={busy} onClick={() => run(async (active) => {
              const data = await api.list();
              if (active()) setPosts(data);
            }, text.ready)}>{text.refresh}</button>
            {posts.length ? <ul>{posts.map((post) => <li key={post.id}>
              <button className="post-title" type="button" disabled={busy} onClick={() => run(async (active) => {
                const data = await api.detail(post.id);
                if (active()) { setSelected(data); reset(); }
              })}>{post.title}</button>
              <small>{post.authorName} · {new Date(post.createdAt).toLocaleString()}</small>
            </li>)}</ul> : <p>{text.empty}</p>}
          </section>
          <section aria-labelledby="detail-title">
            <h2 id="detail-title">{text.detail}</h2>
            {selected ? <>
              <h3>{selected.title}</h3>
              <p>{selected.authorName} · {new Date(selected.createdAt).toLocaleString()}</p>
              <p className="content">{selected.content}</p>
              {canEdit(selected) && <div className="actions">
                <button type="button" disabled={busy} onClick={() => {
                  setEditing(selected.id); setTitle(selected.title); setContent(selected.content);
                }}>{text.edit}</button>
                <button type="button" className="danger" disabled={busy} onClick={remove}>{text.remove}</button>
              </div>}
            </> : <p>{text.select}</p>}
          </section>
        </div>
        <section aria-labelledby="form-title">
          <h2 id="form-title">{editing ? text.editPost : text.newPost}</h2>
          {user ? <form onSubmit={save}>
            <label>{text.postTitle}<input required value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} /></label>
            <label>{text.content}<textarea required rows={10} value={content} onChange={(e) => setContent(e.target.value)} disabled={busy} /></label>
            <div className="actions">
              <button disabled={busy}>{editing ? text.save : text.create}</button>
              <button type="button" disabled={busy} onClick={reset}>{text.cancel}</button>
            </div>
          </form> : <p>{text.writeGuide}</p>}
        </section>
      </div>
    </main>
  );
}
