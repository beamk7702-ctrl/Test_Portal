import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// ------------------------------------------------------------------
// Polyfill for window.storage (the persistent key-value API that only
// exists inside Claude.ai artifacts). This makes App.jsx run unchanged
// outside Claude by backing the same get/set/delete/list API with the
// browser's localStorage instead.
//
// NOTE: localStorage is per-browser only (not shared between devices
// or users). Once the Supabase integration is finished, App.jsx will
// talk to Supabase directly instead of window.storage, and this
// polyfill can be deleted.
// ------------------------------------------------------------------
function storageKey(key, shared) {
  return `sp:${shared ? "shared" : "local"}:${key}`;
}

window.storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(storageKey(key, shared));
    if (raw === null) {
      throw new Error(`Key not found: ${key}`);
    }
    return { key, value: raw, shared };
  },
  async set(key, value, shared = false) {
    localStorage.setItem(storageKey(key, shared), value);
    return { key, value, shared };
  },
  async delete(key, shared = false) {
    const k = storageKey(key, shared);
    const existed = localStorage.getItem(k) !== null;
    localStorage.removeItem(k);
    if (!existed) throw new Error(`Key not found: ${key}`);
    return { key, deleted: true, shared };
  },
  async list(prefix = "", shared = false) {
    const ns = `sp:${shared ? "shared" : "local"}:`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ns + prefix)) keys.push(k.slice(ns.length));
    }
    return { keys, prefix, shared };
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
