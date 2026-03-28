import { ensureAnonAuth, onUid } from "./firebase.js";
import { $, showScreen, setText, setHtml } from "./dom.js";
import { genRoomCode, safeCopy, formatTime, escapeHtml, toInt, debounce } from "./utils.js";
import { loadName, saveName, loadLast, saveLast, clearLast, loadHostDefaults, saveHostDefaults } from "./storage.js";
import {
  RoomStatus,
  roomExists, getRoom, getMyPublicPlayer,
  createRoom, updateRoomSettings, upsertJoin, leaveRoom,
  subRoom, subPublicPlayers, subMyPrivate, subResults,
  hostStartGame, hostEndGame, hostNewRound
} from "./api.js";
import { SPY_DATA } from "./data.js";
import { buildPool, pickWordAvoidingRecent, pickSpies, pickFirstQuestion } from "./game.js";

const el = {
  // home
  nameInput: $("#nameInput"),
  roomCodeInput: $("#roomCodeInput"),
  btnCreateRoom: $("#btnCreateRoom"),
  btnJoinRoom: $("#btnJoinRoom"),
  homeError: $("#homeError"),

  homeCategoryList: $("#homeCategoryList"),
  homeTargetPlayers: $("#homeTargetPlayers"),
  homeSpiesCount: $("#homeSpiesCount"),
  homeRoundMinutes: $("#homeRoundMinutes"),

  // top
  btnLeave: $("#btnLeave"),

  // lobby
  roomCodeView: $("#roomCodeView"),
  btnCopyCode: $("#btnCopyCode"),
  playersList: $("#playersList"),
  statusPill: $("#statusPill"),
  statusTitle: $("#statusTitle"),
  statusHint: $("#statusHint"),
  metaInfo: $("#metaInfo"),
  saveState: $("#saveState"),
  hostBox: $("#hostBox"),
  btnStart: $("#btnStart"),
  lobbyError: $("#lobbyError"),

  lobbyCategoryList: $("#lobbyCategoryList"),
  lobbyTargetPlayers: $("#lobbyTargetPlayers"),
  lobbySpiesCount: $("#lobbySpiesCount"),
  lobbyRoundMinutes: $("#lobbyRoundMinutes"),

  // card
  cardCover: $("#cardCover"),
  btnRevealCard: $("#btnRevealCard"),
  cardBox: $("#cardBox"),
  btnGoPlay: $("#btnGoPlay"),

  // play
  firstQuestion: $("#firstQuestion"),
  timerValue: $("#timerValue"),
  hostEndBox: $("#hostEndBox"),
  btnEnd: $("#btnEnd"),
  btnTogglePlayCard: $("#btnTogglePlayCard"),
  playCardBox: $("#playCardBox"),

  // end
  resultsBox: $("#resultsBox"),
  hostNewRoundBox: $("#hostNewRoundBox"),
  btnNewRound: $("#btnNewRound"),
};

let uid = null;
let code = null;
let room = null;
let isHost = false;
let players = [];
let uidToName = new Map();

let myPrivateData = null;
let playCardVisible = false;

let unsub = { room: null, players: null, my: null, results: null };
let timerId = null;

boot();

async function boot() {
  el.nameInput.value = loadName();

  const last = loadLast();
  if (last?.code) el.roomCodeInput.value = last.code;

  initHomeDefaultsUI();

  await ensureAnonAuth();
  onUid((id) => { uid = id; });

  wire();

  if (last?.code && last?.name) {
    try {
      await joinFlow(last.code, last.name, true);
      return;
    } catch {}
  }

  showScreen("home");
}

function wire() {
  el.nameInput.addEventListener("input", () => saveName(el.nameInput.value.trim()));

  el.btnCreateRoom.addEventListener("click", async () => {
    setText(el.homeError, "");
    const name = (el.nameInput.value || "").trim();
    if (!name) return setText(el.homeError, "اكتب اسمك أولاً.");

    const settings = readHomeDefaults();
    const newCode = await createRoomFlow(settings);
    await joinFlow(newCode, name, false);
  });

  el.btnJoinRoom.addEventListener("click", async () => {
    setText(el.homeError, "");
    const name = (el.nameInput.value || "").trim();
    const c = (el.roomCodeInput.value || "").trim().toUpperCase();
    if (!name) return setText(el.homeError, "اكتب اسمك أولاً.");
    if (!c) return setText(el.homeError, "اكتب كود الغرفة.");
    await joinFlow(c, name, false);
  });

  el.btnCopyCode.addEventListener("click", () => safeCopy(el.roomCodeView.textContent || ""));

  el.btnLeave.addEventListener("click", async () => {
    await leaveFlow();
    showScreen("home");
  });

  el.btnStart.addEventListener("click", () => startRound());
  el.btnEnd.addEventListener("click", () => endRound());
  el.btnNewRound.addEventListener("click", () => newRound());

  el.btnRevealCard.addEventListener("click", () => {
    el.cardCover.classList.add("hidden");
    el.cardBox.classList.remove("hidden");
  });

  el.btnGoPlay.addEventListener("click", () => {
    showScreen("play");
    renderPlayCard();
  });

  if (el.btnTogglePlayCard) {
    el.btnTogglePlayCard.addEventListener("click", () => {
      playCardVisible = !playCardVisible;
      renderPlayCard();
    });
  }
}

function initHomeDefaultsUI() {
  const def = normalizeSettings(loadHostDefaults() || {
    categories: ["places", "foods", "animals", "objects", "countries"],
    targetPlayers: 0,
    spiesCount: 1,
    roundMinutes: 8,
  });

  renderCategoryChips(el.homeCategoryList, def.categories, (cats) => {
    const next = normalizeSettings({ ...readHomeDefaults(), categories: cats });
    saveHostDefaults(next);
  });

  el.homeTargetPlayers.value = String(def.targetPlayers ?? 0);
  el.homeSpiesCount.value = String(def.spiesCount ?? 1);
  el.homeRoundMinutes.value = String(def.roundMinutes ?? 8);

  const persistDefaults = debounce(() => {
    saveHostDefaults(readHomeDefaults());
  }, 250);

  el.homeTargetPlayers.addEventListener("input", persistDefaults);
  el.homeSpiesCount.addEventListener("input", persistDefaults);
  el.homeRoundMinutes.addEventListener("input", persistDefaults);
}

function readHomeDefaults() {
  const categories = getCheckedCategories(el.homeCategoryList);
  return normalizeSettings({
    categories,
    targetPlayers: toInt(el.homeTargetPlayers.value, 0),
    spiesCount: toInt(el.homeSpiesCount.value, 1),
    roundMinutes: toInt(el.homeRoundMinutes.value, 8),
  });
}

function normalizeSettings(s) {
  const categories = Array.isArray(s.categories) && s.categories.length ? s.categories : ["places"];
  return {
    categories,
    targetPlayers: Math.max(0, toInt(s.targetPlayers, 0)),
    spiesCount: Math.max(0, toInt(s.spiesCount, 1)),
    roundMinutes: Math.max(0, toInt(s.roundMinutes, 8)),
  };
}

function renderCategoryChips(container, selected, onChange) {
  if (!container) return;
  container.innerHTML = "";

  for (const c of SPY_DATA.categories) {
    const id = `${container.id}_${c.key}`;

    const label = document.createElement("label");
    label.className = "chip";
    label.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.value = c.key;
    input.checked = selected.includes(c.key);

    input.addEventListener("change", () => onChange(getCheckedCategories(container)));

    const span = document.createElement("span");
    span.textContent = c.label;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  }
}

function getCheckedCategories(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input[type=checkbox]"))
    .filter((x) => x.checked)
    .map((x) => x.value);
}

async function createRoomFlow(settings) {
  for (let i = 0; i < 14; i++) {
    const c = genRoomCode(6);
    if (!(await roomExists(c))) {
      await createRoom(c, uid, settings);
      return c;
    }
  }
  throw new Error("Failed to create code");
}

async function joinFlow(roomCode, name, isAutoRejoin) {
  const r = await getRoom(roomCode);
  if (!r) {
    setText(el.homeError, "الكود غير صحيح أو الغرفة غير موجودة.");
    throw new Error("Room not found");
  }

  if (r.status === RoomStatus.LOBBY) {
    await upsertJoin(roomCode, uid, name);
  } else {
    const me = await getMyPublicPlayer(roomCode, uid);
    if (!me) {
      setText(el.homeError, "الجولة شغّالة/منتهية. ما في انضمام جديد حالياً.");
      if (!isAutoRejoin) throw new Error("Join denied");
    }
  }

  code = roomCode;
  saveLast({ code, name });

  startSubs(code);
  showScreen("lobby");
}

async function leaveFlow() {
  stopSubs();
  stopTimer();

  if (code && uid) await leaveRoom(code, uid);

  code = null;
  room = null;
  isHost = false;
  players = [];
  uidToName = new Map();
  myPrivateData = null;
  playCardVisible = false;

  clearLast();
}

function startSubs(roomCode) {
  stopSubs();
  setText(el.roomCodeView, roomCode);

  unsub.room = subRoom(roomCode, (x) => {
    room = x;
    isHost = !!room?.hostUid && room.hostUid === uid;

    updateHostUI();
    hydrateLobbySettingsFromRoom();
    renderStatus();
    route();
  });

  unsub.players = subPublicPlayers(roomCode, (list) => {
    players = list;
    uidToName = new Map(list.map((p) => [p.uid, p.name || "بدون اسم"]));
    renderPlayers();
    renderStatus();
    route();
  });

  unsub.my = subMyPrivate(roomCode, uid, (me) => {
    myPrivateData = me;

    el.cardCover.classList.remove("hidden");
    el.cardBox.classList.add("hidden");

    const { html, canPlay } = renderCard(me);
    setHtml(el.cardBox, html);
    el.btnGoPlay.disabled = !canPlay;

    renderPlayCard();

    if (room?.status === RoomStatus.PLAYING) showScreen("card");
  });

  unsub.results = null;

  wireLobbySettingsWrites();
}

function stopSubs() {
  Object.values(unsub).forEach((u) => { try { u?.(); } catch {} });
  unsub = { room: null, players: null, my: null, results: null };
}

function ensureResultsSub() {
  if (!code || unsub.results) return;
  unsub.results = subResults(code, (res) => renderResults(res));
}

function stopResultsSub() {
  try { unsub.results?.(); } catch {}
  unsub.results = null;
}

function updateHostUI() {
  el.hostBox.classList.toggle("hidden", !isHost);
  el.hostEndBox.classList.toggle("hidden", !isHost);
  el.hostNewRoundBox.classList.toggle("hidden", !isHost);
}

function renderPlayers() {
  const lines = players.map((p) => `• ${p.name || "بدون اسم"}`);
  setText(el.playersList, lines.length ? lines.join("\n") : "—");
}

function renderStatus() {
  if (!room) return;

  const st = room.status;
  const n = players.length;

  if (st === RoomStatus.LOBBY) {
    setText(el.statusPill, "Lobby");
    setText(el.statusTitle, "بانتظار…");
    setText(el.statusHint, n >= 2 ? "جاهزين؟ الهوست يضغط ابدأ." : "بدنا لاعبين 2 أو أكثر.");
  } else if (st === RoomStatus.PLAYING) {
    setText(el.statusPill, "Playing");
    setText(el.statusTitle, "الجولة شغّالة");
    setText(el.statusHint, "الهوست يقدر ينهي الجولة.");
  } else {
    setText(el.statusPill, "Ended");
    setText(el.statusTitle, "انتهت الجولة");
    setText(el.statusHint, "تم كشف النتائج للجميع.");
  }

  const s = normalizeSettings(room.settings || {});
  const meta = `لاعبين: ${n} | مطلوب: ${s.targetPlayers || "—"} | جواسيس: ${s.spiesCount} | وقت: ${s.roundMinutes}د | فئات: ${s.categories.length}`;
  setText(el.metaInfo, meta);

  const canStart = isHost && st === RoomStatus.LOBBY && n >= 2 && (s.targetPlayers <= 0 || n === s.targetPlayers);
  el.btnStart.disabled = !canStart;
  setText(el.saveState, isHost ? "✅ الإعدادات محفوظة" : "👀 للعرض فقط");
}

function route() {
  if (!room) return;

  if (room.status === RoomStatus.LOBBY) {
    stopResultsSub();
    stopTimer();
    playCardVisible = false;
    renderPlayCard();
    showScreen("lobby");
    return;
  }

  if (room.status === RoomStatus.PLAYING) {
    stopResultsSub();
    renderFirstQuestion(room.firstQuestion);
    startTimer(room.startedAt, room.roundMinutes ?? normalizeSettings(room.settings || {}).roundMinutes);
    renderPlayCard();
    return;
  }

  if (room.status === RoomStatus.ENDED) {
    ensureResultsSub();
    stopTimer();
    playCardVisible = false;
    renderPlayCard();
    showScreen("end");
  }
}

function wireLobbySettingsWrites() {
  renderCategoryChips(el.lobbyCategoryList, getCheckedCategories(el.homeCategoryList), () => {});

  const saveToRoomDebounced = debounce(async () => {
    if (!isHost || !code || !room || room.status !== RoomStatus.LOBBY) return;

    const settings = normalizeSettings({
      categories: getCheckedCategories(el.lobbyCategoryList),
      targetPlayers: toInt(el.lobbyTargetPlayers.value, 0),
      spiesCount: toInt(el.lobbySpiesCount.value, 0),
      roundMinutes: toInt(el.lobbyRoundMinutes.value, 0),
    });

    if (!settings.categories.length) {
      setText(el.lobbyError, "اختَر فئة واحدة على الأقل.");
      return;
    }

    setText(el.lobbyError, "");
    await updateRoomSettings(code, settings);
  }, 400);

  if (el.lobbyCategoryList.dataset.bound === "1") return;
  el.lobbyCategoryList.dataset.bound = "1";

  el.lobbyCategoryList.addEventListener("change", () => saveToRoomDebounced());
  el.lobbyTargetPlayers.addEventListener("input", () => saveToRoomDebounced());
  el.lobbySpiesCount.addEventListener("input", () => saveToRoomDebounced());
  el.lobbyRoundMinutes.addEventListener("input", () => saveToRoomDebounced());
}

function hydrateLobbySettingsFromRoom() {
  if (!room) return;

  const s = normalizeSettings(room.settings || loadHostDefaults() || {});
  renderCategoryChips(el.lobbyCategoryList, s.categories, () => {});

  const editable = isHost && room.status === RoomStatus.LOBBY;
  el.lobbyTargetPlayers.disabled = !editable;
  el.lobbySpiesCount.disabled = !editable;
  el.lobbyRoundMinutes.disabled = !editable;

  Array.from(el.lobbyCategoryList.querySelectorAll("input[type=checkbox]")).forEach((x) => {
    x.disabled = !editable;
  });

  el.lobbyTargetPlayers.value = String(s.targetPlayers ?? 0);
  el.lobbySpiesCount.value = String(s.spiesCount ?? 0);
  el.lobbyRoundMinutes.value = String(s.roundMinutes ?? 0);
}

async function startRound() {
  setText(el.lobbyError, "");
  if (!isHost || !code || !room) return;

  const n = players.length;
  if (n < 2) return setText(el.lobbyError, "بدنا لاعبين 2 أو أكثر.");

  const s = normalizeSettings(room.settings || {});
  if (s.targetPlayers > 0 && n !== s.targetPlayers) {
    return setText(el.lobbyError, `عدد اللاعبين الحالي ${n} لازم يطابق المطلوب ${s.targetPlayers}.`);
  }

  if (s.spiesCount >= n) {
    return setText(el.lobbyError, "عدد الجواسيس لازم يكون أقل من عدد اللاعبين.");
  }

  const pool = buildPool(s.categories);
  if (!pool.length) return setText(el.lobbyError, "ما في كلمات ضمن الفئات المختارة.");

  const chosen = pickWordAvoidingRecent(pool, 15);
  const spiesUids = pickSpies(players.map((p) => p.uid), s.spiesCount);
  const fq = pickFirstQuestion(players.map((p) => p.uid));

  await hostStartGame({
    code,
    roundMinutes: s.roundMinutes,
    categoryKeys: s.categories,
    spiesCount: s.spiesCount,
    word: chosen.word,
    categoryLabel: chosen.categoryLabel,
    spiesUids,
    firstQuestion: fq,
    players: players.map((p) => ({ uid: p.uid })),
  });
}

async function endRound() {
  if (!isHost || !code) return;
  await hostEndGame(code);
}

async function newRound() {
  if (!isHost || !code) return;
  await hostNewRound(code, players.map((p) => p.uid));
  showScreen("lobby");
}

function renderCard(me) {
  if (!me || room?.status !== RoomStatus.PLAYING) {
    return {
      html: `<div class="big">استنّى…</div><div class="small">ما بلشت الجولة بعد</div>`,
      canPlay: false
    };
  }

  if (me.role === "pending") {
    return {
      html: `<div class="big">عم نجهّز الدور…</div><div class="small">استنّى شوي</div>`,
      canPlay: false
    };
  }

  if (me.role === "spy") {
    return {
      html: `<div class="big">أنت الجاسوس 🕵️</div><div class="small">حاول تعرف الكلمة بدون ما تنكشف.</div>`,
      canPlay: true
    };
  }

  if (me.role === "civilian") {
    return {
      html:
        `<div class="big">الكلمة: ${escapeHtml(me.word || "")}</div>` +
        `<div class="small">التصنيف: ${escapeHtml(me.categoryLabel || "")}</div>`,
      canPlay: true
    };
  }

  return {
    html: `<div class="big">خطأ</div><div class="small">دور غير معروف</div>`,
    canPlay: false
  };
}

function renderPlayCard() {
  if (!el.playCardBox || !el.btnTogglePlayCard) return;

  const canShow =
    room?.status === RoomStatus.PLAYING &&
    myPrivateData &&
    myPrivateData.role &&
    myPrivateData.role !== "pending";

  if (!canShow) {
    playCardVisible = false;
    el.playCardBox.classList.add("hidden");
    el.btnTogglePlayCard.disabled = true;
    setText(el.btnTogglePlayCard, "إظهار بطاقتي");
    return;
  }

  el.btnTogglePlayCard.disabled = false;

  const { html } = renderCard(myPrivateData);
  setHtml(el.playCardBox, html);

  el.playCardBox.classList.toggle("hidden", !playCardVisible);
  setText(el.btnTogglePlayCard, playCardVisible ? "إخفاء بطاقتي" : "إظهار بطاقتي");
}

function renderFirstQuestion(fq) {
  if (!fq?.from || !fq?.to) {
    setText(el.firstQuestion, "ما في أول سؤال عشوائي (بدها شخصين).");
    return;
  }
  const fromName = uidToName.get(fq.from) || "حدا";
  const toName = uidToName.get(fq.to) || "حدا";
  setText(el.firstQuestion, `ابدأوا: ${fromName} يسأل ${toName} أول سؤال.`);
}

function startTimer(startedAt, minutes) {
  stopTimer();

  const mins = Math.max(0, toInt(minutes, 0));
  if (!mins) {
    setText(el.timerValue, "بدون مؤقّت");
    return;
  }

  const startedMs = startedAt?.toMillis ? startedAt.toMillis() : null;
  if (!startedMs) {
    setText(el.timerValue, formatTime(mins * 60));
    return;
  }

  const tick = () => {
    const elapsed = Math.floor((Date.now() - startedMs) / 1000);
    const total = mins * 60;
    const remaining = Math.max(0, total - elapsed);
    setText(el.timerValue, remaining === 0 ? "انتهى الوقت ⏱️" : formatTime(remaining));
  };

  tick();
  timerId = window.setInterval(tick, 1000);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function renderResults(res) {
  if (!res) return;
  const spiesNames = (res.spiesUids || []).map((id) => uidToName.get(id) || id).join("، ");
  const txt =
    `الكلمة: ${res.word || "—"}\n` +
    `التصنيف: ${res.categoryLabel || "—"}\n` +
    `الجواسيس: ${spiesNames || "—"}`;
  setText(el.resultsBox, txt);
}