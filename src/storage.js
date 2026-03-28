const KEY = {
  name: "spy_mp_name",
  last: "spy_mp_last",
  hostDefaults: "spy_mp_host_defaults",
  recent: "spy_mp_recent_words",
};

export function loadName() { return localStorage.getItem(KEY.name) || ""; }
export function saveName(name) { localStorage.setItem(KEY.name, String(name || "")); }

export function loadLast() {
  try { return JSON.parse(localStorage.getItem(KEY.last) || "null"); } catch { return null; }
}
export function saveLast(x) { localStorage.setItem(KEY.last, JSON.stringify(x)); }
export function clearLast() { localStorage.removeItem(KEY.last); }

export function loadHostDefaults() {
  try { return JSON.parse(localStorage.getItem(KEY.hostDefaults) || "null"); } catch { return null; }
}
export function saveHostDefaults(x) { localStorage.setItem(KEY.hostDefaults, JSON.stringify(x)); }

export function loadRecentWords() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY.recent) || "[]");
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}
export function pushRecentWord(word, max = 15) {
  const w = String(word || "").trim();
  if (!w) return;
  const list = loadRecentWords().filter((x) => x !== w);
  list.unshift(w);
  localStorage.setItem(KEY.recent, JSON.stringify(list.slice(0, max)));
}