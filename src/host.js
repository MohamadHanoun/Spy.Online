// /src/host.js
import { SPY_DATA } from "./data.js";
import { clampInt, pickRandom, shuffle } from "./utils.js";
import { loadRecentWords, pushRecentWord } from "./storage.js";

export function renderCategoryChips(container, selectedKeys, onChange) {
  container.innerHTML = "";
  for (const c of SPY_DATA.categories) {
    const id = `cat_${c.key}`;
    const label = document.createElement("label");
    label.className = "chip";
    label.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.value = c.key;
    input.checked = selectedKeys.includes(c.key);
    input.addEventListener("change", () => onChange(getSelected(container)));

    const span = document.createElement("span");
    span.textContent = c.label;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  }

  function getSelected(root) {
    return Array.from(root.querySelectorAll("input[type=checkbox]"))
      .filter((x) => x.checked)
      .map((x) => x.value);
  }
}

export function buildPool(categoryKeys) {
  const items = [];
  for (const key of categoryKeys) {
    const label = SPY_DATA.categories.find((c) => c.key === key)?.label ?? key;
    const arr = (SPY_DATA.items[key] || []).filter(Boolean);
    for (const word of arr) items.push({ word, categoryLabel: label });
  }
  return items;
}

export function pickWordAvoidingRecent(pool, historyMax = 15) {
  const recent = loadRecentWords().slice(0, historyMax);
  const candidates = pool.filter((x) => !recent.includes(x.word));
  const list = candidates.length ? candidates : pool;
  const chosen = pickRandom(list);
  pushRecentWord(chosen.word, historyMax);
  return chosen;
}

export function pickSpiesUids(playerUids, spiesCount) {
  const maxSpies = Math.max(0, playerUids.length - 1);
  const k = clampInt(spiesCount, 0, Math.min(10, maxSpies));
  const shuffled = shuffle([...playerUids]);
  return shuffled.slice(0, k);
}

export function pickFirstQuestionPair(playerUids) {
  if (playerUids.length < 2) return null;
  const from = pickRandom(playerUids);
  let to = pickRandom(playerUids);
  while (to === from) to = pickRandom(playerUids);
  return { from, to };
}