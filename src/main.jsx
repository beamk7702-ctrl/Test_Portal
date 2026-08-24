import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

function storageKey(key, shared) {
  return `sp:${shared ? "shared" : "local"}:${key}`;
}

window.storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(storageKey(key, shared));
    if (raw === null) {
      throw new Error(`Key not found: ${key}`);
    }
    
    // แปลงกลับเป็น Object/Array อัตโนมัติ (ถ้าเป็น JSON string)
    try {
      return { key, value: JSON.parse(raw), shared };
    } catch {
      return { key, value: raw, shared };
    }
  },

  async set(key, value, shared = false) {
    try {
      // แปลง Object/Array เป็น string ก่อนบันทึก
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(storageKey(key, shared), serialized);
      return { key, value, shared };
    } catch (err) {
      if (err.name === "QuotaExceededError") {
        throw new Error("Storage quota exceeded (localStorage limit is ~5MB)");
      }
      throw err;
    }
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
