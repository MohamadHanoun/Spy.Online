import { SPY_DATA } from "./data.js";
import { pickRandom, shuffle } from "./utils.js";
import { loadRecentWords, pushRecentWord } from "./storage.js";

export function buildPool(categoryKeys) {
  const items = [];
  for (const key of categoryKeys) {
    const label = SPY_DATA.categories.find((c) => c.key === key)?.label ?? key;
    const arr = (SPY_DATA.items[key] || []).filter(Boolean);
    for (const w of arr) items.push({ word: w, categoryLabel: label });
  }
  return items;
}

export function buildCustomPool(words, categoryLabel = "مود خاص") {
  const list = Array.isArray(words) ? words : [];
  return list
    .map((word) => String(word || "").trim())
    .filter(Boolean)
    .map((word) => ({ word, categoryLabel }));
}

export function pickWordAvoidingRecent(pool, max = 15) {
  const recent = loadRecentWords().slice(0, max);
  const candidates = pool.filter((x) => !recent.includes(x.word));
  const list = candidates.length ? candidates : pool;
  const chosen = pickRandom(list);
  pushRecentWord(chosen.word, max);
  return chosen;
}

export function pickSpies(playerUids, spiesCount) {
  const a = shuffle([...playerUids]);
  return a.slice(0, Math.max(0, spiesCount));
}

export function pickFirstQuestion(playerUids) {
  if (playerUids.length < 2) return null;
  const from = pickRandom(playerUids);
  let to = pickRandom(playerUids);
  while (to === from) to = pickRandom(playerUids);
  return { from, to };
}
