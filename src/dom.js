export const $ = (s) => document.querySelector(s);

export const screens = {
  home: $("#screenHome"),
  lobby: $("#screenLobby"),
  card: $("#screenCard"),
  play: $("#screenPlay"),
  end: $("#screenEnd"),
};

export function showScreen(name) {
  for (const k of Object.keys(screens)) screens[k].classList.add("hidden");
  screens[name].classList.remove("hidden");
}

export function setText(el, text) {
  if (!el) return;
  el.textContent = text ?? "";
}

export function setHtml(el, html) {
  if (!el) return;
  el.innerHTML = html ?? "";
}