import { ensureAnonAuth, onUid } from "./firebase.js";
import { $, showScreen, setText, setHtml } from "./dom.js";
import { genRoomCode, safeCopy, formatTime, escapeHtml, toInt, debounce } from "./utils.js";
import { loadName, saveName, loadLast, saveLast, clearLast, loadHostDefaults, saveHostDefaults } from "./storage.js";
import {
  RoomStatus,
  roomExists, getRoom, getMyPublicPlayer,
  createRoom, updateRoomSettings, upsertJoin, leaveRoom,
<<<<<<< HEAD
  subRoom, subPublicPlayers, subMyPrivate, subResults, subVotes, subHostSecret, subActivity,
=======
  subRoom, subPublicPlayers, subMyPrivate, subResults, subVotes, subHostSecret, subActivity, subRoundHistory,
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
  hostStartGame, hostEndGame, hostNewRound, hostKickPlayer,
  setMyVotes, clearMyVotes, hostResolveVoteTarget, hostSyncRoundState, addActivityEvent, getEndReasonLabel,
} from "./api.js";
import { SPY_DATA } from "./data.js";
import { buildPool, buildCustomPool, pickWordAvoidingRecent, pickSpies, pickFirstQuestion } from "./game.js";
import { GAME_MODES, CUSTOM_MODE_KEY, LOL_MODE_KEY, getModeDefinition, getModeLabel, pickRandomLolSkinRound } from "./lol.js";

const DEFAULT_CLASSIC_CATEGORIES = ["places", "foods", "animals", "objects", "countries", "video_games"];

const el = {
  // home
  nameInput: $("#nameInput"),
  roomCodeInput: $("#roomCodeInput"),
  btnOpenCreateRoom: $("#btnOpenCreateRoom"),
  btnJoinRoom: $("#btnJoinRoom"),
  homeError: $("#homeError"),

  // create room
  btnBackHome: $("#btnBackHome"),
  btnCreateRoomConfirm: $("#btnCreateRoomConfirm"),
  createError: $("#createError"),
  createModeList: $("#createModeList"),
  createModeHint: $("#createModeHint"),
  createClassicFields: $("#createClassicFields"),
  createCustomFields: $("#createCustomFields"),
  createCustomTitle: $("#createCustomTitle"),
  createCustomWords: $("#createCustomWords"),
  createCategoryList: $("#createCategoryList"),
  createTargetPlayers: $("#createTargetPlayers"),
  createSpiesCount: $("#createSpiesCount"),
  createRoundMinutes: $("#createRoundMinutes"),
  createSpyTeammatesVisible: $("#createSpyTeammatesVisible"),

  // top
  btnLeave: $("#btnLeave"),
  connectionPill: $("#connectionPill"),

  // lobby
  roomCodeView: $("#roomCodeView"),
  btnCopyCode: $("#btnCopyCode"),
  playersList: $("#playersList"),
  statusPill: $("#statusPill"),
  statusTitle: $("#statusTitle"),
  statusHint: $("#statusHint"),
  metaInfo: $("#metaInfo"),
  saveState: $("#saveState"),
  lobbyHostPanel: $("#lobbyHostPanel"),
  hostBox: $("#hostBox"),
  btnStart: $("#btnStart"),
  lobbyError: $("#lobbyError"),
  lobbyModeList: $("#lobbyModeList"),
  lobbyModeHint: $("#lobbyModeHint"),
  lobbyClassicFields: $("#lobbyClassicFields"),
  lobbyCustomFields: $("#lobbyCustomFields"),
  lobbyCustomTitle: $("#lobbyCustomTitle"),
  lobbyCustomWords: $("#lobbyCustomWords"),
  lobbyCategoryList: $("#lobbyCategoryList"),
  lobbyTargetPlayers: $("#lobbyTargetPlayers"),
  lobbySpiesCount: $("#lobbySpiesCount"),
  lobbyRoundMinutes: $("#lobbyRoundMinutes"),
  lobbySpyTeammatesVisible: $("#lobbySpyTeammatesVisible"),
  publicModeView: $("#publicModeView"),
  publicPlayersView: $("#publicPlayersView"),
  publicSpiesView: $("#publicSpiesView"),
  publicTimeView: $("#publicTimeView"),
  publicCategoriesView: $("#publicCategoriesView"),

  // card
  roundModeBadge: $("#roundModeBadge"),
  cardCover: $("#cardCover"),
  btnRevealCard: $("#btnRevealCard"),
  cardBox: $("#cardBox"),
  btnGoPlay: $("#btnGoPlay"),

  // play
  playHint: $("#playHint"),
  firstQuestion: $("#firstQuestion"),
  timerValue: $("#timerValue"),
  hostEndBox: $("#hostEndBox"),
  btnEnd: $("#btnEnd"),
  btnTogglePlayCard: $("#btnTogglePlayCard"),
  playCardBox: $("#playCardBox"),
  playPlayersList: $("#playPlayersList"),
  playNotice: $("#playNotice"),
  playError: $("#playError"),
  voteSummaryPill: $("#voteSummaryPill"),
  voteBanner: $("#voteBanner"),
  activityLogList: $("#activityLogList"),
  activityLogEmpty: $("#activityLogEmpty"),
  confirmModal: $("#confirmModal"),
  confirmTitle: $("#confirmTitle"),
  confirmText: $("#confirmText"),
  btnConfirmAction: $("#btnConfirmAction"),
  btnCancelAction: $("#btnCancelAction"),

  // end
  resultsBox: $("#resultsBox"),
  roundHistoryList: $("#roundHistoryList"),
  roundHistoryEmpty: $("#roundHistoryEmpty"),
  hostNewRoundBox: $("#hostNewRoundBox"),
  btnNewRound: $("#btnNewRound"),
};

let uid = null;
let code = null;
let room = null;
let isHost = false;
let players = [];
let votes = [];
let hostSecret = null;
let uidToName = new Map();
let myPrivateData = null;
let playCardVisible = false;
let timerId = null;
let wasMemberSeen = false;
let resolvingVote = false;
let activities = [];
let currentResults = null;
<<<<<<< HEAD
=======
let roundHistory = [];
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
let playNoticeTimer = null;
let confirmResolver = null;
let lastFocusedBeforeConfirm = null;
let autoEndingRound = false;
<<<<<<< HEAD
=======
let connectionState = navigator.onLine ? "online" : "offline";
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
const actionLocks = new Map();

let unsub = {
  room: null,
  players: null,
  my: null,
  results: null,
  votes: null,
  secret: null,
  activity: null,
<<<<<<< HEAD
=======
  history: null,
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
};

boot();

async function ensureUidReady() {
  if (uid) return uid;

  const user = await ensureAnonAuth();
  uid = user?.uid ?? null;

  if (!uid) throw new Error("Anonymous auth is not ready yet");
  return uid;
}

<<<<<<< HEAD
=======

function setConnectionState(state = "online") {
  connectionState = state;
  if (!el.connectionPill) return;

  const labels = {
    online: "متصل",
    syncing: "جاري المزامنة",
    reconnecting: "إعادة اتصال",
    offline: "غير متصل",
  };

  el.connectionPill.dataset.state = state;
  setText(el.connectionPill, labels[state] || labels.online);
}

function markConnectionHealthy() {
  if (!navigator.onLine) {
    setConnectionState("offline");
    return;
  }
  setConnectionState("online");
}

function markConnectionRecovering() {
  if (!navigator.onLine) {
    setConnectionState("offline");
    return;
  }
  setConnectionState(code ? "reconnecting" : "online");
}

function initConnectionIndicator() {
  setConnectionState(navigator.onLine ? "online" : "offline");

  window.addEventListener("online", () => {
    setConnectionState(code ? "syncing" : "online");
  });

  window.addEventListener("offline", () => {
    setConnectionState("offline");
  });
}

function normalizeCustomWords(words) {
  const raw = Array.isArray(words)
    ? words
    : String(words || "").split(/\r?\n/g);

  const list = [];
  const seen = new Set();

  for (const item of raw) {
    const value = String(item || "").trim();
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    list.push(value);
  }

  return list.slice(0, 300);
}

function wordsToTextarea(words = []) {
  return normalizeCustomWords(words).join("\n");
}

function getSettingsModeLabel(settings = {}) {
  if (settings.modeKey === CUSTOM_MODE_KEY) {
    return String(settings.customTitle || "").trim() || "مود خاص";
  }
  return getModeLabel(settings.modeKey);
}

function getModeSummaryText(settings = {}) {
  if (settings.modeKey === CUSTOM_MODE_KEY) {
    const wordsCount = Array.isArray(settings.customWords) ? settings.customWords.length : 0;
    return `${getSettingsModeLabel(settings)} — ${wordsCount} كلمة`;
  }
  if (settings.modeKey === LOL_MODE_KEY) {
    return "League of Legends — جولة صور سكنات";
  }
  const labels = (settings.categories || [])
    .map((key) => SPY_DATA.categories.find((c) => c.key === key)?.label || key)
    .join("، ");
  return labels || "—";
}

function getRoundModeDisplay(result = {}) {
  if (result.roundMode === CUSTOM_MODE_KEY) {
    return String(result.customTitle || result.categoryLabel || "مود خاص").trim() || "مود خاص";
  }
  return result.roundMode === LOL_MODE_KEY ? "League of Legends" : "كلاسيكي";
}

function shouldForceExitOnError(err) {
  const codeValue = String(err?.code || "").toLowerCase();
  return codeValue.includes("permission") || codeValue.includes("not-found") || codeValue.includes("failed-precondition");
}

function renderRoundHistory() {
  if (!el.roundHistoryList || !el.roundHistoryEmpty) return;

  if (!roundHistory.length) {
    setHtml(el.roundHistoryList, "");
    el.roundHistoryEmpty.classList.remove("hidden");
    return;
  }

  el.roundHistoryEmpty.classList.add("hidden");
  const html = roundHistory.map((item) => {
    const winnerText = item.roundWinner === "civilians"
      ? "المدنيون"
      : item.roundWinner === "spies"
        ? "الجواسيس"
        : "—";
    const winnerClass = item.roundWinner === "civilians"
      ? "civilians"
      : item.roundWinner === "spies"
        ? "spies"
        : "neutral";
    const title = item.roundNumber ? `الجولة #${item.roundNumber}` : "جولة";
    const modeText = getRoundModeDisplay(item);
    return `
      <div class="roundHistoryItem ${winnerClass}">
        <div class="roundHistoryTop">
          <div class="roundHistoryTitle">${escapeHtml(title)}</div>
          <div class="roundHistoryWinner ${winnerClass}">${escapeHtml(winnerText)}</div>
        </div>
        <div class="roundHistoryMeta">${escapeHtml(modeText)} — ${escapeHtml(item.endReasonLabel || getEndReasonLabel(item.endReason || "") || "—")}</div>
        <div class="roundHistoryPreview">${escapeHtml(item.preview || item.finalMessage || "—")}</div>
      </div>
    `;
  }).join("");

  setHtml(el.roundHistoryList, html);
}

>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
async function boot() {
  el.nameInput.value = loadName();

  const last = loadLast();
  if (last?.code) el.roomCodeInput.value = last.code;

  initCreateDefaultsUI();
  wire();
  bindLolImageProtection();
  initConnectionIndicator();
  applyLeaveButtonState();

  const user = await ensureAnonAuth();
  uid = user?.uid ?? null;

  onUid((id) => {
    uid = id;
  });

  if (last?.code && last?.name) {
    try {
      await ensureUidReady();
      await joinFlow(last.code, last.name, true);
      return;
    } catch {
      // ignore broken auto-rejoin and continue to home
    }
  }

  showScreen("home");
}

function wire() {
  el.nameInput.addEventListener("input", () => saveName(el.nameInput.value.trim()));

  el.btnOpenCreateRoom.addEventListener("click", () => {
    setText(el.homeError, "");
    const name = (el.nameInput.value || "").trim();
    if (!name) return setText(el.homeError, "اكتب اسمك أولًا.");
    showScreen("create");
  });

  el.btnBackHome.addEventListener("click", () => {
    setText(el.createError, "");
    showScreen("home");
  });

  el.btnCreateRoomConfirm.addEventListener("click", async () => {
    try {
      setText(el.createError, "");
      const name = (el.nameInput.value || "").trim();
      if (!name) return setText(el.createError, "اكتب اسمك أولًا.");

      await ensureUidReady();

      const settings = readCreateDefaults();
      const newCode = await createRoomFlow(settings);
      await joinFlow(newCode, name, false);
    } catch (err) {
      setText(el.createError, "تعذر إنشاء الغرفة الآن.");
      console.error(err);
    }
  });

  el.btnJoinRoom.addEventListener("click", async () => {
    try {
      setText(el.homeError, "");
      const name = (el.nameInput.value || "").trim();
      const c = (el.roomCodeInput.value || "").trim().toUpperCase();
      if (!name) return setText(el.homeError, "اكتب اسمك أولًا.");
      if (!c) return setText(el.homeError, "اكتب كود الغرفة.");

      await ensureUidReady();
      await joinFlow(c, name, false);
    } catch (err) {
      if (!el.homeError.textContent) setText(el.homeError, "تعذر الانضمام الآن.");
      console.error(err);
    }
  });

  el.btnCopyCode.addEventListener("click", () => safeCopy(el.roomCodeView.textContent || ""));

  el.btnLeave.addEventListener("click", async () => {
    try {
      const confirmed = await openConfirmModal({
        title: "تأكيد المغادرة",
        text: "هل أنت متأكد أنك تريد مغادرة الغرفة؟ سيتم خروجك من الجولة الحالية.",
        confirmText: "مغادرة",
        cancelText: "إلغاء",
        confirmVariant: "danger",
      });
      if (!confirmed) return;

      await leaveFlow();
      applyLeaveButtonState();
      showScreen("home");
    } catch (err) {
      console.error(err);
    }
  });

  el.btnStart.addEventListener("click", () => startRound());
  el.btnEnd.addEventListener("click", () => endRound());
  el.btnNewRound.addEventListener("click", () => newRound());
  el.btnCancelAction?.addEventListener("click", () => closeConfirmModal(false));
  el.btnConfirmAction?.addEventListener("click", () => closeConfirmModal(true));
  el.confirmModal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.closeConfirm === "1") closeConfirmModal(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && confirmResolver) closeConfirmModal(false);
  });

  el.btnRevealCard.addEventListener("click", () => {
    el.cardCover.classList.add("hidden");
    el.cardBox.classList.remove("hidden");
  });

  el.btnGoPlay.addEventListener("click", () => {
    showScreen("play");
    renderPlayCard();
    renderPlayPlayers();
  });

  el.btnTogglePlayCard?.addEventListener("click", () => {
    playCardVisible = !playCardVisible;
    renderPlayCard();
  });

  el.playersList?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-kick-uid]");
    if (!btn || !isHost || !code) return;
    const targetUid = btn.dataset.kickUid;
    if (!targetUid || targetUid === uid) return;
    await requestKickConfirmation(targetUid, "lobby");
  });

  el.playPlayersList?.addEventListener("click", async (e) => {
    const askBtn = e.target.closest("button[data-ask-target]");
    if (askBtn) {
      const targetUid = askBtn.dataset.askTarget;
      if (targetUid) await requestQuestionConfirmation(targetUid);
      return;
    }

    const kickBtn = e.target.closest("button[data-play-kick-uid]");
    if (kickBtn && isHost && code) {
      const targetUid = kickBtn.dataset.playKickUid;
      if (!targetUid || targetUid === uid) return;
      await requestKickConfirmation(targetUid, "play");
      return;
    }

    const voteBtn = e.target.closest("button[data-vote-target]");
    if (!voteBtn) return;
    const targetUid = voteBtn.dataset.voteTarget;
    if (!targetUid) return;
    await toggleVoteForTarget(targetUid);
  });
}

function bindLolImageProtection() {
  const isInsideProtectedLolImage = (target) => {
    return target instanceof Element && !!target.closest(".lolProtected");
  };

  document.addEventListener("contextmenu", (e) => {
    if (isInsideProtectedLolImage(e.target)) {
      e.preventDefault();
    }
  });

  document.addEventListener("dragstart", (e) => {
    if (isInsideProtectedLolImage(e.target)) {
      e.preventDefault();
    }
  });

  document.addEventListener("selectstart", (e) => {
    if (isInsideProtectedLolImage(e.target)) {
      e.preventDefault();
    }
  });
}

function openConfirmModal({
  title = "تأكيد",
  text = "هل أنت متأكد؟",
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  confirmVariant = "danger",
} = {}) {
  if (!el.confirmModal || !el.btnConfirmAction || !el.btnCancelAction) {
    return Promise.resolve(window.confirm(text));
  }

  if (confirmResolver) {
    closeConfirmModal(false);
  }

  lastFocusedBeforeConfirm = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

  setText(el.confirmTitle, title);
  setText(el.confirmText, text);
  setText(el.btnConfirmAction, confirmText);
  setText(el.btnCancelAction, cancelText);

  el.btnConfirmAction.classList.remove("btn-danger", "btn-primary", "btn-secondary", "btn-ghost");
  el.btnConfirmAction.classList.add(confirmVariant === "primary" ? "btn-primary" : "btn-danger");

  el.confirmModal.classList.remove("hidden");
  el.confirmModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modalOpen");

  window.setTimeout(() => {
    el.btnCancelAction?.focus();
  }, 0);

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function closeConfirmModal(confirmed) {
  if (!el.confirmModal) return;

  const active = document.activeElement;
  if (active instanceof HTMLElement && el.confirmModal.contains(active)) {
    active.blur();
  }

  el.confirmModal.classList.add("hidden");
  el.confirmModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modalOpen");

  const restoreTarget = lastFocusedBeforeConfirm;
  lastFocusedBeforeConfirm = null;

  if (restoreTarget instanceof HTMLElement && document.contains(restoreTarget)) {
    window.setTimeout(() => {
      restoreTarget.focus();
    }, 0);
  }

  const resolver = confirmResolver;
  confirmResolver = null;
  resolver?.(!!confirmed);
}

function showPlayNotice(message, type = "success") {
  if (!el.playNotice) return;
  if (playNoticeTimer) window.clearTimeout(playNoticeTimer);

  el.playNotice.dataset.type = type;
  setText(el.playNotice, message || "");
  el.playNotice.classList.toggle("hidden", !message);

  if (!message) return;
  playNoticeTimer = window.setTimeout(() => {
    el.playNotice.classList.add("hidden");
    el.playNotice.dataset.type = "";
    setText(el.playNotice, "");
  }, 2200);
}

function clearPlayNotice() {
  if (playNoticeTimer) window.clearTimeout(playNoticeTimer);
  playNoticeTimer = null;
  if (!el.playNotice) return;
  el.playNotice.classList.add("hidden");
  el.playNotice.dataset.type = "";
  setText(el.playNotice, "");
}

function lockAction(key, ms = 1500) {
  const until = Date.now() + ms;
  actionLocks.set(key, until);
  window.setTimeout(() => {
    if ((actionLocks.get(key) || 0) <= Date.now()) {
      actionLocks.delete(key);
      renderLobbyPlayers();
      renderPlayPlayers();
    }
  }, ms + 30);
}

function isActionLocked(key) {
  const until = actionLocks.get(key) || 0;
  if (!until) return false;
  if (until <= Date.now()) {
    actionLocks.delete(key);
    return false;
  }
  return true;
}

function hashString(value) {
  const str = String(value || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getPlayerColor(playerUid) {
  const hue = hashString(playerUid) % 360;
  return `hsl(${hue} 82% 66%)`;
}

function getPlayerName(playerUid) {
  return uidToName.get(playerUid) || "بدون اسم";
}

function getQuestionEvents() {
  return activities.filter((item) => item.type === "question" && item.targetUid);
}

function getQuestionStatsMap() {
  const map = new Map();
  for (const event of getQuestionEvents()) {
    const current = map.get(event.targetUid) || { count: 0, actorUids: [] };
    current.count += 1;
    current.actorUids.push(event.actorUid || "");
    map.set(event.targetUid, current);
  }
  return map;
}

function getOrderedPlayPlayers(questionData) {
  return [...players].sort((a, b) => {
    const aRevealed = getRevealedSet().has(a.uid) ? 1 : 0;
    const bRevealed = getRevealedSet().has(b.uid) ? 1 : 0;
    if (aRevealed !== bRevealed) return aRevealed - bRevealed;

    const aCount = questionData.get(a.uid)?.count || 0;
    const bCount = questionData.get(b.uid)?.count || 0;
    if (bCount !== aCount) return bCount - aCount;

    const aJoined = Number(a.joinedAtMs || 0);
    const bJoined = Number(b.joinedAtMs || 0);
    if (aJoined !== bJoined) return aJoined - bJoined;

    return String(a.name || "").localeCompare(String(b.name || ""), "ar");
  });
}

function renderQuestionMarks(actorUids = []) {
  if (!actorUids.length) return "";
  const visible = actorUids.slice(0, 10);
  const extra = Math.max(0, actorUids.length - visible.length);
  return `
    <div class="questionMarks" aria-label="من سأل هذا اللاعب">
      ${visible.map((actorUid) => `
        <span
          class="questionMark"
          style="--mark-color:${escapeHtml(getPlayerColor(actorUid || 'x'))}"
          title="${escapeHtml(getPlayerName(actorUid))}"
        ></span>
      `).join("")}
      ${extra ? `<span class="questionMore">+${extra}</span>` : ""}
    </div>
  `;
}

function renderActivityLog() {
  if (!el.activityLogList || !el.activityLogEmpty) return;

  if (!activities.length) {
    setHtml(el.activityLogList, "");
    el.activityLogEmpty.classList.remove("hidden");
    return;
  }

  el.activityLogEmpty.classList.add("hidden");
  const html = activities.map((item) => `
    <div class="activityItem" data-type="${escapeHtml(item.type || 'info')}">
      <div class="activityText">${escapeHtml(item.text || '—')}</div>
    </div>
  `).join("");

  setHtml(el.activityLogList, html);
}

function canCurrentUserAskTarget(targetUid) {
  if (!uid || !targetUid || targetUid === uid) return false;
  if (room?.status !== RoomStatus.PLAYING || room?.voteStopped) return false;
  if (!myPrivateData || myPrivateData.role === "pending") return false;
  const revealedSet = getRevealedSet();
  if (revealedSet.has(uid) || revealedSet.has(targetUid)) return false;
  return true;
}

async function requestQuestionConfirmation(targetUid) {
  try {
    setText(el.playError, "");
    if (!code || !canCurrentUserAskTarget(targetUid)) return;

    const actionKey = `ask:${targetUid}`;
    if (isActionLocked(actionKey)) return;

    const targetName = getPlayerName(targetUid);
    const confirmed = await openConfirmModal({
      title: "تأكيد السؤال",
      text: `هل أنت متأكد أنك سألت ${targetName}؟ لا يمكن التراجع بعد الضغط على تأكيد.`,
      confirmText: "تأكيد",
      cancelText: "إلغاء",
      confirmVariant: "primary",
    });
    if (!confirmed) return;

    lockAction(actionKey, 1600);
    await addActivityEvent(code, {
      type: "question",
      text: `${getPlayerName(uid)} سأل ${targetName}.`,
      actorUid: uid,
      actorName: getPlayerName(uid),
      targetUid,
      targetName,
    });
    showPlayNotice("تم تسجيل السؤال.");
  } catch (err) {
    setText(el.playError, "تعذر تسجيل السؤال الآن.");
    console.error(err);
  }
}

async function requestKickConfirmation(targetUid, context = "play") {
  try {
    const errorEl = context === "lobby" ? el.lobbyError : el.playError;
    setText(errorEl, "");
    if (!isHost || !code || !targetUid || targetUid === uid) return;

    const actionKey = `kick:${targetUid}`;
    if (isActionLocked(actionKey)) return;

    const targetName = getPlayerName(targetUid);
    const confirmed = await openConfirmModal({
      title: "تأكيد الطرد",
      text: `هل أنت متأكد أنك تريد طرد ${targetName} من الغرفة؟ لا يمكن التراجع بعد الضغط على تأكيد.`,
      confirmText: "تأكيد",
      cancelText: "إلغاء",
      confirmVariant: "danger",
    });
    if (!confirmed) return;

    lockAction(actionKey, 1800);
    await hostKickPlayer(code, targetUid);

    if (room?.status === RoomStatus.PLAYING) {
      await addActivityEvent(code, {
        type: "kick",
        text: `تم طرد اللاعب ${targetName} من الغرفة.`,
        actorUid: uid,
        actorName: getPlayerName(uid),
        targetUid,
        targetName,
      });
      showPlayNotice(`تم طرد ${targetName}.`, "info");
    }
  } catch (err) {
    const errorEl = context === "lobby" ? el.lobbyError : el.playError;
    setText(errorEl, "تعذر طرد اللاعب الآن.");
    console.error(err);
  }
}

function initCreateDefaultsUI() {
  const def = normalizeSettings(loadHostDefaults() || {
    modeKey: "classic",
    categories: DEFAULT_CLASSIC_CATEGORIES,
    customTitle: "",
    customWords: [],
    targetPlayers: 0,
    spiesCount: 1,
    roundMinutes: 8,
    spyTeammatesVisible: false,
  });

  renderModeChoices(el.createModeList, def.modeKey, (modeKey) => {
    toggleCreateModeSections(modeKey);
    setText(el.createModeHint, getModeDefinition(modeKey).description || "");
    saveHostDefaults(normalizeSettings({ ...readCreateDefaults(), modeKey }));
  });

  renderCategoryChips(el.createCategoryList, def.categories, (cats) => {
    const next = normalizeSettings({ ...readCreateDefaults(), categories: cats });
    saveHostDefaults(next);
  });

  el.createTargetPlayers.value = String(def.targetPlayers ?? 0);
  el.createSpiesCount.value = String(def.spiesCount ?? 1);
  el.createRoundMinutes.value = String(def.roundMinutes ?? 8);
  el.createSpyTeammatesVisible.checked = !!def.spyTeammatesVisible;
  if (el.createCustomTitle) el.createCustomTitle.value = def.customTitle || "";
  if (el.createCustomWords) el.createCustomWords.value = wordsToTextarea(def.customWords || []);

  toggleCreateModeSections(def.modeKey);
  setText(el.createModeHint, getModeDefinition(def.modeKey).description || "");

  const persistDefaults = debounce(() => {
    saveHostDefaults(readCreateDefaults());
  }, 250);

  el.createTargetPlayers.addEventListener("input", persistDefaults);
  el.createSpiesCount.addEventListener("input", persistDefaults);
  el.createRoundMinutes.addEventListener("input", persistDefaults);
  el.createSpyTeammatesVisible.addEventListener("change", persistDefaults);
  el.createCustomTitle?.addEventListener("input", persistDefaults);
  el.createCustomWords?.addEventListener("input", persistDefaults);
}

function readCreateDefaults() {
  const modeKey = getSelectedMode(el.createModeList) || "classic";
  const categories = getCheckedCategories(el.createCategoryList);
  return normalizeSettings({
    modeKey,
    categories,
    customTitle: el.createCustomTitle?.value || "",
    customWords: normalizeCustomWords(el.createCustomWords?.value || ""),
    targetPlayers: toInt(el.createTargetPlayers.value, 0),
    spiesCount: toInt(el.createSpiesCount.value, 1),
    roundMinutes: toInt(el.createRoundMinutes.value, 8),
    spyTeammatesVisible: !!el.createSpyTeammatesVisible.checked,
  });
}

function normalizeSettings(s) {
  const modeKey = s?.modeKey === LOL_MODE_KEY
    ? LOL_MODE_KEY
    : s?.modeKey === CUSTOM_MODE_KEY
      ? CUSTOM_MODE_KEY
      : "classic";
  const categories = Array.isArray(s?.categories) ? s.categories.filter(Boolean) : DEFAULT_CLASSIC_CATEGORIES;
  return {
    modeKey,
    categories,
    customTitle: String(s?.customTitle || "").trim(),
    customWords: normalizeCustomWords(s?.customWords || []),
    targetPlayers: Math.max(0, toInt(s?.targetPlayers, 0)),
    spiesCount: Math.max(0, toInt(s?.spiesCount, 1)),
    roundMinutes: Math.max(0, toInt(s?.roundMinutes, 8)),
    spyTeammatesVisible: !!s?.spyTeammatesVisible,
  };
}

function renderModeChoices(container, selected, onChange) {
  if (!container) return;
  container.innerHTML = "";

  for (const mode of GAME_MODES) {
    const id = `${container.id}_${mode.key}`;
    const wrap = document.createElement("label");
    wrap.className = "modeOption";
    wrap.setAttribute("for", id);

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `${container.id}_group`;
    input.id = id;
    input.value = mode.key;
    input.checked = mode.key === selected;
    input.addEventListener("change", () => {
      if (input.checked) onChange(mode.key);
    });

    const card = document.createElement("span");
    card.className = "modeCard";
    card.innerHTML = `
      <span class="modeCardTitle">${escapeHtml(mode.label)}</span>
      <span class="modeCardDesc">${escapeHtml(mode.description)}</span>
    `;

    wrap.appendChild(input);
    wrap.appendChild(card);
    container.appendChild(wrap);
  }
}

function getSelectedMode(container) {
  return container?.querySelector('input[type="radio"]:checked')?.value || "classic";
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
  return Array.from(container.querySelectorAll('input[type="checkbox"]'))
    .filter((x) => x.checked)
    .map((x) => x.value);
}

function toggleCreateModeSections(modeKey) {
  el.createClassicFields?.classList.toggle("hidden", modeKey !== "classic");
  el.createCustomFields?.classList.toggle("hidden", modeKey !== CUSTOM_MODE_KEY);
}

function toggleLobbyModeSections(modeKey) {
  el.lobbyClassicFields?.classList.toggle("hidden", modeKey !== "classic");
  el.lobbyCustomFields?.classList.toggle("hidden", modeKey !== CUSTOM_MODE_KEY);
}

function applyLeaveButtonState() {
  el.btnLeave?.classList.toggle("hidden", !code);
}

async function createRoomFlow(settings) {
  for (let i = 0; i < 14; i += 1) {
    const c = genRoomCode(6);
    if (!(await roomExists(c))) {
      await createRoom(c, uid, settings);
      return c;
    }
  }
  throw new Error("Failed to create room code");
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
      setText(el.homeError, "الجولة شغّالة أو منتهية، وما في انضمام جديد حاليًا.");
      if (!isAutoRejoin) throw new Error("Join denied");
    }
  }

  code = roomCode;
  saveLast({ code, name });
  applyLeaveButtonState();
  startSubs(code);
  showScreen("lobby");
}

async function leaveFlow() {
  stopSubs();
  stopTimer();

  const oldCode = code;
  const oldUid = uid;

  code = null;
  room = null;
  isHost = false;
  players = [];
  votes = [];
  hostSecret = null;
  activities = [];
  currentResults = null;
<<<<<<< HEAD
=======
  roundHistory = [];
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
  uidToName = new Map();
  myPrivateData = null;
  playCardVisible = false;
  wasMemberSeen = false;
  resolvingVote = false;
  autoEndingRound = false;
  actionLocks.clear();
  clearPlayNotice();

  if (oldCode && oldUid) {
    try {
      await leaveRoom(oldCode, oldUid);
    } catch (err) {
      console.error(err);
    }
  }

  clearLast();
  applyLeaveButtonState();
  renderRoundHistory();
  setConnectionState(navigator.onLine ? "online" : "offline");
}

function startSubs(roomCode) {
  stopSubs();
  activities = [];
  currentResults = null;
<<<<<<< HEAD
=======
  roundHistory = [];
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
  wasMemberSeen = false;
  autoEndingRound = false;
  applyLeaveButtonState();
  setConnectionState(navigator.onLine ? "syncing" : "offline");
  setText(el.roomCodeView, roomCode);
  setText(el.playError, "");
  setText(el.lobbyError, "");
  clearPlayNotice();
  renderActivityLog();
<<<<<<< HEAD
=======
  renderRoundHistory();
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)

  unsub.room = subRoom(
    roomCode,
    (x) => {
      markConnectionHealthy();
      room = x;
      isHost = !!room?.hostUid && room.hostUid === uid;
      syncHostSecretSub();
      updateHostUI();
      hydrateLobbySettingsFromRoom();
      renderStatus();
      renderVoteMeta();
      route();
      maybeSyncRoundStateFromPlayers();
      maybeResolveVotes();
    },
    (err) => {
      markConnectionRecovering();
      if (shouldForceExitOnError(err)) {
        handleForcedExit("تم فقدان الوصول إلى الغرفة.");
      }
    }
  );

  unsub.players = subPublicPlayers(
    roomCode,
    (list) => {
      markConnectionHealthy();
      players = list;
      uidToName = new Map(list.map((p) => [p.uid, p.name || "بدون اسم"]));

      if (uid && list.some((p) => p.uid === uid)) {
        wasMemberSeen = true;
      } else if (uid && wasMemberSeen) {
        handleForcedExit("تم إخراجك من الغرفة.");
        return;
      }

      renderLobbyPlayers();
      renderPlayPlayers();
      renderStatus();
      renderVoteMeta();
      renderResults(currentResults);
      route();
      maybeSyncRoundStateFromPlayers();
      maybeResolveVotes();
    },
    (err) => {
      markConnectionRecovering();
      if (shouldForceExitOnError(err) && code) handleForcedExit("تم إخراجك من الغرفة.");
    }
  );

  unsub.my = subMyPrivate(
    roomCode,
    uid,
    (me) => {
      markConnectionHealthy();
      myPrivateData = me;
      el.cardCover.classList.remove("hidden");
      el.cardBox.classList.add("hidden");

      const { html, canPlay } = renderCard(me);
      setHtml(el.cardBox, html);
      el.btnGoPlay.disabled = !canPlay;

      renderPlayCard();
      renderPlayPlayers();
      renderVoteMeta();

      if (room?.status === RoomStatus.PLAYING) showScreen("card");
    },
    (err) => {
      markConnectionRecovering();
      if (shouldForceExitOnError(err) && code && wasMemberSeen) handleForcedExit("تم إخراجك من الغرفة.");
    }
  );

  unsub.votes = subVotes(
    roomCode,
    (list) => {
      markConnectionHealthy();
      votes = list;
      renderPlayPlayers();
      renderVoteMeta();
      maybeSyncRoundStateFromPlayers();
      maybeResolveVotes();
    },
    () => {
      markConnectionRecovering();
      votes = [];
      renderPlayPlayers();
      renderVoteMeta();
    }
  );

  unsub.activity = subActivity(
    roomCode,
    (list) => {
<<<<<<< HEAD
=======
      markConnectionHealthy();
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
      activities = list;
      renderPlayPlayers();
      renderActivityLog();
      renderResults(currentResults);
    },
    () => {
<<<<<<< HEAD
=======
      markConnectionRecovering();
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
      activities = [];
      renderActivityLog();
      renderResults(currentResults);
    }
  );

<<<<<<< HEAD
=======
  unsub.history = subRoundHistory(
    roomCode,
    (list) => {
      markConnectionHealthy();
      roundHistory = list;
      renderRoundHistory();
    },
    () => {
      markConnectionRecovering();
      roundHistory = [];
      renderRoundHistory();
    }
  );

>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
  unsub.results = null;
  wireLobbySettingsWrites();
}

function stopSubs() {
  Object.values(unsub).forEach((u) => {
    try {
      u?.();
    } catch {}
  });
<<<<<<< HEAD
  unsub = { room: null, players: null, my: null, results: null, votes: null, secret: null, activity: null };
=======
  unsub = { room: null, players: null, my: null, results: null, votes: null, secret: null, activity: null, history: null };
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
}

function syncHostSecretSub() {
  if (!code) return;
  if (isHost && !unsub.secret) {
    unsub.secret = subHostSecret(
      code,
      (secret) => {
        hostSecret = secret;
        maybeResolveVotes();
      },
      () => {
        hostSecret = null;
      }
    );
    return;
  }

  if (!isHost && unsub.secret) {
    try {
      unsub.secret();
    } catch {}
    unsub.secret = null;
    hostSecret = null;
  }
}

function ensureResultsSub() {
  if (!code || unsub.results) return;
<<<<<<< HEAD
  unsub.results = subResults(code, (res) => {
    currentResults = res;
    renderResults(currentResults);
  });
=======
  unsub.results = subResults(
    code,
    (res) => {
      markConnectionHealthy();
      currentResults = res;
      renderResults(currentResults);
    },
    () => {
      markConnectionRecovering();
      currentResults = null;
      renderResults(currentResults);
    }
  );
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
}

function stopResultsSub() {
  try {
    unsub.results?.();
  } catch {}
  unsub.results = null;
  currentResults = null;
}

function updateHostUI() {
  el.lobbyHostPanel.classList.toggle("hidden", !isHost);
  el.hostBox.classList.toggle("hidden", !isHost);
  el.hostEndBox.classList.toggle("hidden", !isHost);
  el.hostNewRoundBox.classList.toggle("hidden", !isHost);
}

function renderLobbyPlayers() {
  const html = players.length
    ? players.map((p) => {
        const badges = [];
        if (room?.hostUid === p.uid) badges.push('<span class="playerBadge">هوست</span>');
        if (p.uid === uid) badges.push('<span class="playerBadge self">أنت</span>');
        const lockKey = `kick:${p.uid}`;
        const kickBtn = isHost && p.uid !== uid
          ? `<button class="btn btn-danger btn-small" type="button" data-kick-uid="${escapeHtml(p.uid)}" ${isActionLocked(lockKey) ? "disabled" : ""}>طرد</button>`
          : "";
        return `
          <div class="playerRow" style="--player-accent:${escapeHtml(getPlayerColor(p.uid))}">
            <div class="playerInfo grow">
              <div class="playerNameLine">
                <span class="playerNameAccent" aria-hidden="true"></span>
                <span class="playerName">${escapeHtml(p.name || "بدون اسم")}</span>
                ${badges.join(" ")}
              </div>
            </div>
            <div class="playerActionsInline">${kickBtn}</div>
          </div>
        `;
      }).join("")
    : '<div class="hint">لا يوجد لاعبون بعد.</div>';

  setHtml(el.playersList, html);
}

function renderPlayPlayers() {
  if (!el.playPlayersList) return;

  const revealedSet = getRevealedSet();
  const myTargets = getMyTargets();
  const myVoteSlots = getVoteSlots();
  const voteData = getVoteCountMap();
  const questionData = getQuestionStatsMap();
  const votingOpen = canCurrentUserVote();

  const orderedPlayers = getOrderedPlayPlayers(questionData);

  const html = orderedPlayers.length
    ? orderedPlayers.map((p) => {
        const isRevealed = revealedSet.has(p.uid);
        const isSelf = p.uid === uid;
        const rowVotes = voteData.get(p.uid) || { count: 0, voterNames: [] };
        const questionInfo = questionData.get(p.uid) || { count: 0, actorUids: [] };
        const selected = myTargets.includes(p.uid);
        const canToggle = !isSelf && !isRevealed && votingOpen;
        const canAsk = canCurrentUserAskTarget(p.uid);
        const voteBtn = canToggle
          ? `<button class="btn ${selected ? "btn-danger" : "btn-secondary"} btn-small" type="button" data-vote-target="${escapeHtml(p.uid)}">${selected ? "إلغاء الصوت" : "تصويت"}</button>`
          : "";
        const askBtn = canAsk
          ? `<button class="btn btn-primary btn-small" type="button" data-ask-target="${escapeHtml(p.uid)}" ${isActionLocked(`ask:${p.uid}`) ? "disabled" : ""}>سألته</button>`
          : "";
        const kickBtn = isHost && !isSelf && room?.status === RoomStatus.PLAYING && !room?.voteStopped
          ? `<button class="btn btn-ghost btn-small" type="button" data-play-kick-uid="${escapeHtml(p.uid)}" ${isActionLocked(`kick:${p.uid}`) ? "disabled" : ""}>طرد</button>`
          : "";
        const badges = [];
        if (isSelf) badges.push('<span class="playerBadge self">أنت</span>');
        if (room?.hostUid === p.uid) badges.push('<span class="playerBadge">هوست</span>');
        if (isRevealed) badges.push('<span class="playerBadge spyX">X</span>');

        return `
          <div class="playerRow boardRow ${isRevealed ? "is-revealed" : ""}" style="--player-accent:${escapeHtml(getPlayerColor(p.uid))}">
            <div class="playerInfo grow">
              <div class="playerNameLine">
                <span class="playerNameAccent" aria-hidden="true"></span>
                <span class="playerName">${escapeHtml(p.name || "بدون اسم")}</span>
                ${badges.join(" ")}
              </div>
              <div class="playerSub">
                ${isRevealed ? "تم كشفه كجاسوس" : `الأصوات عليه: <strong>${rowVotes.count}</strong>`}
                ${rowVotes.voterNames.length ? ` — ${escapeHtml(rowVotes.voterNames.join("، "))}` : ""}
              </div>
              <div class="playerQuestionMeta">
                <span class="playerStatPill">انسأل: ${questionInfo.count}</span>
                ${renderQuestionMarks(questionInfo.actorUids)}
              </div>
            </div>
            <div class="playerActionsInline">
              ${voteBtn}
              ${askBtn}
              ${kickBtn}
            </div>
          </div>
        `;
      }).join("")
    : '<div class="hint">لا يوجد لاعبون.</div>';

  setHtml(el.playPlayersList, html);

  if (room?.status === RoomStatus.PLAYING) {
    const summary = `أصواتك: ${myTargets.length}/${myVoteSlots || 0} | المطلوب لكشف لاعب: ${getRequiredVotes() || 0}`;
    setText(el.voteSummaryPill, summary);
  } else {
    setText(el.voteSummaryPill, "—");
  }
}

function renderLobbyPublicSummary(settings) {
  const n = players.length;
  setText(el.publicModeView, getSettingsModeLabel(settings));
  setText(el.publicPlayersView, settings.targetPlayers > 0 ? `${n} / ${settings.targetPlayers}` : `${n}`);
  setText(el.publicSpiesView, String(settings.spiesCount || 0));
  setText(el.publicTimeView, settings.roundMinutes > 0 ? `${settings.roundMinutes} دقيقة` : "بدون مؤقت");
  setText(el.publicCategoriesView, getModeSummaryText(settings));
}

function renderStatus() {
  if (!room) return;

  const st = room.status;
  const n = players.length;
  const s = normalizeSettings(room.settings || {});
  const modeLabel = getSettingsModeLabel(s);

  if (st === RoomStatus.LOBBY) {
    setText(el.statusPill, "Lobby");
    setText(el.statusTitle, "بانتظار بدء الجولة");
    setText(el.statusHint, n >= 2 ? `المود الحالي: ${modeLabel}. الهوست يضغط ابدأ عندما تكتمل المجموعة.` : "نحتاج لاعبين 2 أو أكثر.");
  } else if (st === RoomStatus.PLAYING) {
    setText(el.statusPill, "Playing");
    setText(el.statusTitle, "الجولة شغالة");
    setText(el.statusHint, `المود الحالي: ${modeLabel}. الأسماء والتصويت ظاهرون للجميع أثناء الجولة.`);
  } else {
    setText(el.statusPill, "Ended");
    setText(el.statusTitle, "انتهت الجولة");
    setText(el.statusHint, `تم كشف النتائج النهائية لمود ${modeLabel}.`);
  }

  renderLobbyPublicSummary(s);
  updateRoundContext(s.modeKey, s.customTitle);
  setText(el.roundModeBadge, modeLabel);

  const meta = `لاعبين: ${n} | مطلوب: ${s.targetPlayers || "—"} | جواسيس: ${s.spiesCount} | وقت: ${s.roundMinutes > 0 ? `${s.roundMinutes}د` : "—"} | يعرفون بعض: ${s.spyTeammatesVisible ? "نعم" : "لا"}`;
  setText(el.metaInfo, meta);

  const customWordsReady = s.modeKey !== CUSTOM_MODE_KEY || (s.customWords || []).length >= 3;
  const canStart = isHost && st === RoomStatus.LOBBY && n >= 2 && (s.targetPlayers <= 0 || n === s.targetPlayers) && customWordsReady;
  el.btnStart.disabled = !canStart;
  setText(el.saveState, isHost ? "✅ إعدادات الهوست فقط" : "👀 عرض مختصر فقط");
}

function route() {
  if (!room) return;

  if (room.status === RoomStatus.LOBBY) {
    stopResultsSub();
    stopTimer();
    autoEndingRound = false;
    playCardVisible = false;
    renderPlayCard();
    renderPlayPlayers();
    showScreen("lobby");
    return;
  }

  if (room.status === RoomStatus.PLAYING) {
    stopResultsSub();
    renderFirstQuestion(room.firstQuestion);
    startTimer(room.startedAt, room.roundMinutes ?? normalizeSettings(room.settings || {}).roundMinutes);
    renderPlayCard();
    renderPlayPlayers();
    renderActivityLog();
    renderVoteMeta();
    return;
  }

  if (room.status === RoomStatus.ENDED) {
    ensureResultsSub();
    stopTimer();
    autoEndingRound = false;
    playCardVisible = false;
    renderPlayCard();
    renderVoteMeta();
    showScreen("end");
  }
}

function wireLobbySettingsWrites() {
  const saveToRoomDebounced = debounce(async () => {
    if (!isHost || !code || !room || room.status !== RoomStatus.LOBBY) return;

    const settings = normalizeSettings({
      modeKey: getSelectedMode(el.lobbyModeList),
      categories: getCheckedCategories(el.lobbyCategoryList),
      customTitle: el.lobbyCustomTitle?.value || "",
      customWords: normalizeCustomWords(el.lobbyCustomWords?.value || ""),
      targetPlayers: toInt(el.lobbyTargetPlayers.value, 0),
      spiesCount: toInt(el.lobbySpiesCount.value, 0),
      roundMinutes: toInt(el.lobbyRoundMinutes.value, 0),
      spyTeammatesVisible: !!el.lobbySpyTeammatesVisible.checked,
    });

    if (settings.modeKey === "classic" && !settings.categories.length) {
      setText(el.lobbyError, "اختر فئة واحدة على الأقل.");
      return;
    }

    if (settings.modeKey === CUSTOM_MODE_KEY && settings.customWords.length < 3) {
      setText(el.lobbyError, "المود الخاص يحتاج 3 كلمات أو أكثر.");
      return;
    }

    setText(el.lobbyError, "");
    await updateRoomSettings(code, settings);
  }, 400);

  if (el.lobbyModeList.dataset.bound === "1") return;
  el.lobbyModeList.dataset.bound = "1";

  el.lobbyModeList.addEventListener("change", saveToRoomDebounced);
  el.lobbyCategoryList.addEventListener("change", saveToRoomDebounced);
  el.lobbyTargetPlayers.addEventListener("input", saveToRoomDebounced);
  el.lobbySpiesCount.addEventListener("input", saveToRoomDebounced);
  el.lobbyRoundMinutes.addEventListener("input", saveToRoomDebounced);
  el.lobbySpyTeammatesVisible.addEventListener("change", saveToRoomDebounced);
  el.lobbyCustomTitle?.addEventListener("input", saveToRoomDebounced);
  el.lobbyCustomWords?.addEventListener("input", saveToRoomDebounced);
}

function hydrateLobbySettingsFromRoom() {
  if (!room) return;

  const s = normalizeSettings(room.settings || loadHostDefaults() || {});
  renderModeChoices(el.lobbyModeList, s.modeKey, (modeKey) => {
    toggleLobbyModeSections(modeKey);
    setText(el.lobbyModeHint, getModeDefinition(modeKey).description || "");
  });
  renderCategoryChips(el.lobbyCategoryList, s.categories, () => {});

  const editable = isHost && room.status === RoomStatus.LOBBY;
  el.lobbyTargetPlayers.disabled = !editable;
  el.lobbySpiesCount.disabled = !editable;
  el.lobbyRoundMinutes.disabled = !editable;
  el.lobbySpyTeammatesVisible.disabled = !editable;
  if (el.lobbyCustomTitle) el.lobbyCustomTitle.disabled = !editable;
  if (el.lobbyCustomWords) el.lobbyCustomWords.disabled = !editable;

  Array.from(el.lobbyCategoryList.querySelectorAll('input[type="checkbox"]')).forEach((x) => {
    x.disabled = !editable;
  });
  Array.from(el.lobbyModeList.querySelectorAll('input[type="radio"]')).forEach((x) => {
    x.disabled = !editable;
  });

  el.lobbyTargetPlayers.value = String(s.targetPlayers ?? 0);
  el.lobbySpiesCount.value = String(s.spiesCount ?? 0);
  el.lobbyRoundMinutes.value = String(s.roundMinutes ?? 0);
  el.lobbySpyTeammatesVisible.checked = !!s.spyTeammatesVisible;
  if (el.lobbyCustomTitle) el.lobbyCustomTitle.value = s.customTitle || "";
  if (el.lobbyCustomWords) el.lobbyCustomWords.value = wordsToTextarea(s.customWords || []);
  toggleLobbyModeSections(s.modeKey);
  setText(el.lobbyModeHint, getModeDefinition(s.modeKey).description || "");
}

async function startRound() {
  setText(el.lobbyError, "");
  if (!isHost || !code || !room) return;

  const n = players.length;
  if (n < 2) return setText(el.lobbyError, "نحتاج لاعبين 2 أو أكثر.");

  const s = normalizeSettings(room.settings || {});
  if (s.targetPlayers > 0 && n !== s.targetPlayers) {
    return setText(el.lobbyError, `عدد اللاعبين الحالي ${n} يجب أن يطابق المطلوب ${s.targetPlayers}.`);
  }

  if (s.spiesCount <= 0) {
    return setText(el.lobbyError, "عدد الجواسيس يجب أن يكون 1 أو أكثر.");
  }

  if (s.spiesCount >= n) {
    return setText(el.lobbyError, "عدد الجواسيس يجب أن يكون أقل من عدد اللاعبين.");
  }

  if (s.modeKey === "classic" && !s.categories.length) {
    return setText(el.lobbyError, "اختر فئة واحدة على الأقل.");
  }

  if (s.modeKey === CUSTOM_MODE_KEY && s.customWords.length < 3) {
    return setText(el.lobbyError, "المود الخاص يحتاج 3 كلمات أو أكثر.");
  }

  const spiesUids = pickSpies(players.map((p) => p.uid), s.spiesCount);
  const fq = pickFirstQuestion(players.map((p) => p.uid));

  let roundPayload = {
    word: "",
    categoryLabel: "",
    roundMode: s.modeKey,
    customTitle: s.customTitle || "",
    roundData: null,
    categoryKeys: s.modeKey === "classic" ? s.categories : [],
  };

  if (s.modeKey === LOL_MODE_KEY) {
    try {
      const lolRound = await pickRandomLolSkinRound();
      roundPayload.roundData = lolRound;
    } catch (err) {
      console.error(err);
      return setText(el.lobbyError, "تعذر تحميل بيانات سكنات League of Legends الآن.");
    }
  } else if (s.modeKey === CUSTOM_MODE_KEY) {
    const categoryLabel = s.customTitle || "مود خاص";
    const pool = buildCustomPool(s.customWords, categoryLabel);
    if (!pool.length) return setText(el.lobbyError, "لا توجد كلمات صالحة داخل المود الخاص.");
    const chosen = pickWordAvoidingRecent(pool, 15);
    roundPayload.word = chosen.word;
    roundPayload.categoryLabel = categoryLabel;
  } else {
    const pool = buildPool(s.categories);
    if (!pool.length) return setText(el.lobbyError, "لا توجد كلمات ضمن الفئات المختارة.");
    const chosen = pickWordAvoidingRecent(pool, 15);
    roundPayload.word = chosen.word;
    roundPayload.categoryLabel = chosen.categoryLabel;
  }

  await hostStartGame({
    code,
    roundMinutes: s.roundMinutes,
    categoryKeys: roundPayload.categoryKeys,
    spiesCount: s.spiesCount,
    word: roundPayload.word,
    categoryLabel: roundPayload.categoryLabel,
    roundMode: roundPayload.roundMode,
    customTitle: roundPayload.customTitle,
    roundData: roundPayload.roundData,
    spiesUids,
    firstQuestion: fq,
    spyTeammatesVisible: s.spyTeammatesVisible,
    players: players.map((p) => ({ uid: p.uid, name: p.name || "بدون اسم" })),
  });
}

async function endRound() {
  if (!isHost || !code) return;
  await hostEndGame(code, { reason: "host_manual" });
}

async function newRound() {
  if (!isHost || !code) return;
  await hostNewRound(code, players.map((p) => p.uid), votes.map((v) => v.uid));
  showScreen("lobby");
}

function buildLolImageStyle(view = null) {
  const tx = Number(view?.translateXPercent ?? 0);
  const ty = Number(view?.translateYPercent ?? 0);
  const scale = Number(view?.scale ?? 1);
  const blur = Number(view?.blurPx ?? 0);
  const originX = view?.originX || "center";
  const originY = view?.originY || "center";

  return [
    `--lol-tx:${tx}%`,
    `--lol-ty:${ty}%`,
    `--lol-scale:${scale}`,
    `--lol-blur:${blur}px`,
    `--lol-origin-x:${originX}`,
    `--lol-origin-y:${originY}`,
  ].join("; ");
}

function renderCard(me) {
  if (!me || room?.status !== RoomStatus.PLAYING) {
    return {
      html: `<div class="big">استنّى…</div><div class="small">ما بلشت الجولة بعد</div>`,
      canPlay: false,
    };
  }

  if (me.role === "pending") {
    return {
      html: `<div class="big">عم نجهّز الدور…</div><div class="small">استنّى شوي</div>`,
      canPlay: false,
    };
  }

  const isLolCard = me.cardType === LOL_MODE_KEY && me.lolSkin?.imageUrl;

  if (isLolCard) {
    if (me.role === "spy") {
      const partners = Array.isArray(me.spyPartnerNames) && me.spyPartnerNames.length
        ? `<div class="small">الجواسيس معك: ${escapeHtml(me.spyPartnerNames.join("، "))}</div>`
        : `<div class="small">أنت الأمبوستر. ترى نفس الصورة الأصلية لكن بجزء محدود ومشوّش.</div>`;

      return {
        html: `
          <div class="lolCard">
            <div class="big">أنت الأمبوستر 🕵️</div>
            ${partners}
            <div class="lolSpyNote">
             كون زلمة واعرف الشامبيون مع السكن 
            </div>

            <div class="lolImageFrame spyView lolProtected">
              <img
                class="lolImage"
                src="${escapeHtml(me.lolSkin.imageUrl)}"
                alt="League of Legends skin"
                draggable="false"
                style="${buildLolImageStyle(me.lolView)}"
              />
              <div class="lolImageShield" aria-hidden="true"></div>
            </div>
          </div>
        `,
        canPlay: true,
      };
    }

    return {
      html: `
        <div class="lolCard">
          <div class="lolMetaBox">
            <div class="big">أنت لاعب عادي</div>
            <div class="lolChampionName">${escapeHtml(me.lolSkin.championName || "—")}</div>
            <div class="lolSkinName">${escapeHtml(me.lolSkin.skinName || "—")}</div>
          </div>

          <div class="lolImageFrame lolProtected">
            <img
              class="lolImage"
              src="${escapeHtml(me.lolSkin.imageUrl)}"
              alt="${escapeHtml(`${me.lolSkin.championName || ""} ${me.lolSkin.skinName || ""}`)}"
              draggable="false"
              style="${buildLolImageStyle(null)}"
            />
            <div class="lolImageShield" aria-hidden="true"></div>
          </div>
        </div>
      `,
      canPlay: true,
    };
  }

  if (me.role === "spy") {
    const partners = Array.isArray(me.spyPartnerNames) && me.spyPartnerNames.length
      ? `<div class="small">الجواسيس معك: ${escapeHtml(me.spyPartnerNames.join("، "))}</div>`
      : `<div class="small">حاول تعرف الكلمة بدون ما تنكشف.</div>`;

    return {
      html: `<div class="big">أنت الجاسوس 🕵️</div>${partners}`,
      canPlay: true,
    };
  }

  if (me.role === "civilian") {
    return {
      html:
        `<div class="big">الكلمة: ${escapeHtml(me.word || "")}</div>` +
        `<div class="small">التصنيف: ${escapeHtml(me.categoryLabel || "")}</div>`,
      canPlay: true,
    };
  }

  return {
    html: `<div class="big">خطأ</div><div class="small">دور غير معروف</div>`,
    canPlay: false,
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

function updateRoundContext(modeKey, customTitle = "") {
  const modeLabel = modeKey === CUSTOM_MODE_KEY
    ? (String(customTitle || "").trim() || "مود خاص")
    : getModeLabel(modeKey);
  setText(el.roundModeBadge, modeLabel);
  if (modeKey === LOL_MODE_KEY) {
    setText(el.playHint, "اسألوا عن تفاصيل السكن والصورة. الأمبوستر يرى نفس الصورة لكن بشكل محدود.");
  } else if (modeKey === CUSTOM_MODE_KEY) {
    setText(el.playHint, "هذه جولة بمود خاص. ركزوا على الأسئلة الذكية حتى تكشفوا الجاسوس.");
  } else {
    setText(el.playHint, "ابدأوا الأسئلة، والكل يحاول يكتشف الجاسوس.");
  }
}

function maybeAutoEndRoundOnTimeout() {
  if (!isHost || !code || !room || room.status !== RoomStatus.PLAYING) return;
  if (autoEndingRound) return;

  autoEndingRound = true;
  hostEndGame(code, {
    reason: "timeout",
    roundWinner: room.roundWinner || "spies",
    finalMessage: "انتهى الوقت. انتهت الجولة تلقائيًا وفاز الجاسوس.",
  }).catch((err) => {
    autoEndingRound = false;
    console.error(err);
  });
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

    if (remaining === 0) {
      setText(el.timerValue, "انتهى الوقت ⏱️");
      maybeAutoEndRoundOnTimeout();
      return;
    }

    setText(el.timerValue, formatTime(remaining));
  };

  tick();
  timerId = window.setInterval(tick, 1000);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function renderResults(res) {
  if (!res) {
    setHtml(el.resultsBox, `<div class="endEmpty">—</div>`);
    return;
  }

  const spiesNames = (res.spiesUids || []).map((id) => getPlayerName(id)).filter(Boolean);
  const foundNames = (res.revealedSpyUids || []).map((id) => getPlayerName(id)).filter(Boolean);

  const winnerText = res.roundWinner === "civilians"
    ? "فاز المدنيون"
    : res.roundWinner === "spies"
      ? "فاز الجواسيس"
      : "لا يوجد فائز واضح";
<<<<<<< HEAD

  const winnerClass = res.roundWinner === "civilians"
    ? "civilians"
    : res.roundWinner === "spies"
      ? "spies"
      : "neutral";

  const roundMode = res.roundMode === LOL_MODE_KEY ? "League of Legends" : "كلاسيكي";
  const endReasonLabel = res.endReasonLabel || getEndReasonLabel(res.endReason || room?.endReason || "") || "غير محدد";

  const mainWordLabel = res.roundMode === LOL_MODE_KEY ? "الشخصية" : "الكلمة";
  const mainWordValue = res.roundMode === LOL_MODE_KEY
    ? (res.lolSkin?.championName || "—")
    : (res.word || "—");

  const secondaryLabel = res.roundMode === LOL_MODE_KEY ? "السكن" : "التصنيف";
  const secondaryValue = res.roundMode === LOL_MODE_KEY
    ? (res.lolSkin?.skinName || "—")
    : (res.categoryLabel || "—");
=======

  const winnerClass = res.roundWinner === "civilians"
    ? "civilians"
    : res.roundWinner === "spies"
      ? "spies"
      : "neutral";

  const roundMode = getRoundModeDisplay(res);
  const endReasonLabel = res.endReasonLabel || getEndReasonLabel(res.endReason || room?.endReason || "") || "غير محدد";

  const mainWordLabel = res.roundMode === LOL_MODE_KEY ? "الشخصية" : "الكلمة";
  const mainWordValue = res.roundMode === LOL_MODE_KEY
    ? (res.lolSkin?.championName || "—")
    : (res.word || "—");

  const secondaryLabel = res.roundMode === LOL_MODE_KEY ? "السكن" : res.roundMode === CUSTOM_MODE_KEY ? "اسم المود" : "التصنيف";
  const secondaryValue = res.roundMode === LOL_MODE_KEY
    ? (res.lolSkin?.skinName || "—")
    : (res.categoryLabel || res.customTitle || "—");
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)

  const questionEvents = getQuestionEvents().slice().reverse();
  const questionCounts = new Map();
  for (const event of questionEvents) {
    questionCounts.set(event.targetUid, (questionCounts.get(event.targetUid) || 0) + 1);
  }

  let mostAskedName = "—";
  let mostAskedCount = 0;
  for (const [targetUid, count] of questionCounts.entries()) {
    if (count > mostAskedCount) {
      mostAskedCount = count;
      mostAskedName = getPlayerName(targetUid);
    }
  }

  const firstQuestionText = room?.firstQuestion?.from && room?.firstQuestion?.to
    ? `${getPlayerName(room.firstQuestion.from)} سأل ${getPlayerName(room.firstQuestion.to)}`
    : "—";

  const latestMajorEvent = activities.find((item) => item.type !== "question")?.text || res.finalMessage || "—";

  const spiesHtml = spiesNames.length
    ? spiesNames.map((name) => `<span class="endTag spy">${escapeHtml(name)}</span>`).join("")
    : `<span class="endEmpty">لا يوجد</span>`;

  const foundHtml = foundNames.length
    ? foundNames.map((name) => `<span class="endTag found">${escapeHtml(name)}</span>`).join("")
    : `<span class="endEmpty">لم يتم كشف أحد</span>`;

  const html = `
    <div class="endHero endAnimate endDelay1">
      <div class="endHeroMain ${winnerClass === "spies" ? "winnerSpy" : winnerClass === "civilians" ? "winnerCivil" : ""}">
        <div class="endWinnerLabel">الفائز النهائي</div>
        <div class="endWinnerValue ${winnerClass}">${escapeHtml(winnerText)}</div>
        <p class="endFinalMessage">${escapeHtml(res.finalMessage || "انتهت الجولة.")}</p>
      </div>

      <div class="endHeroSide">
        <div class="endBadgeCard endAnimate endDelay2">
          <div class="endBadgeTitle">المود</div>
          <div class="endBadgeValue">${escapeHtml(roundMode)}</div>
        </div>

        <div class="endBadgeCard endAnimate endDelay3">
          <div class="endBadgeTitle">سبب انتهاء الجولة</div>
          <div class="endBadgeValue">${escapeHtml(endReasonLabel)}</div>
        </div>
      </div>
    </div>

    <div class="endStatsStrip endAnimate endDelay2">
      <div class="endStat">
        <div class="endStatLabel">عدد الأسئلة المسجلة</div>
        <div class="endStatValue">${escapeHtml(String(questionEvents.length))}</div>
      </div>

      <div class="endStat">
        <div class="endStatLabel">أول سؤال</div>
        <div class="endStatValue">${escapeHtml(firstQuestionText)}</div>
      </div>

      <div class="endStat">
        <div class="endStatLabel">أكثر لاعب انسأل</div>
        <div class="endStatValue">${escapeHtml(mostAskedCount ? `${mostAskedName} (${mostAskedCount})` : "—")}</div>
      </div>
    </div>

    <div class="endPanels">
      <div class="endPanel endAnimate endDelay2">
        <div class="endPanelTitle">معلومات الجولة</div>
        <div class="endInfoRows">
          <div class="endInfoRow">
            <div class="endInfoKey">${escapeHtml(mainWordLabel)}</div>
            <div class="endInfoValue">${escapeHtml(mainWordValue)}</div>
          </div>
          <div class="endInfoRow">
            <div class="endInfoKey">${escapeHtml(secondaryLabel)}</div>
            <div class="endInfoValue">${escapeHtml(secondaryValue)}</div>
          </div>
          <div class="endInfoRow">
            <div class="endInfoKey">الفائز</div>
            <div class="endInfoValue">${escapeHtml(winnerText)}</div>
          </div>
        </div>
      </div>

      <div class="endPanel endAnimate endDelay3">
        <div class="endPanelTitle">الجواسيس</div>
        <div class="endList">${spiesHtml}</div>
      </div>

      <div class="endPanel endAnimate endDelay4">
        <div class="endPanelTitle">الذين انكشفوا</div>
        <div class="endList">${foundHtml}</div>
      </div>

      <div class="endPanel wide endAnimate endDelay4">
        <div class="endPanelTitle">ملخص الجولة</div>
        <div class="endTimeline">
          <div class="endTimelineItem">
            <div class="endTimelineDot"></div>
            <div class="endTimelineText">رسالة الجولة: ${escapeHtml(res.finalMessage || "—")}</div>
          </div>
          <div class="endTimelineItem">
            <div class="endTimelineDot"></div>
            <div class="endTimelineText">سبب الانتهاء: ${escapeHtml(endReasonLabel)}</div>
          </div>
          <div class="endTimelineItem">
            <div class="endTimelineDot"></div>
            <div class="endTimelineText">آخر حدث مهم: ${escapeHtml(latestMajorEvent)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  setHtml(el.resultsBox, html);
}

function getRevealedSet() {
  return new Set(Array.isArray(room?.revealedSpyUids) ? room.revealedSpyUids : []);
}

function getVoteSlots() {
  if (room?.status !== RoomStatus.PLAYING || room?.voteStopped) return 0;
  return Math.max(0, Number(room?.activeSpyCount ?? room?.spiesCount ?? 0));
}

function getActivePlayers() {
  const revealedSet = getRevealedSet();
  return players.filter((p) => !revealedSet.has(p.uid));
}

function getRequiredVotes() {
  const activePlayers = getActivePlayers();
  const activeSpyCount = Math.max(0, Number(room?.activeSpyCount ?? room?.spiesCount ?? 0));
  return Math.max(0, activePlayers.length - activeSpyCount);
}

function getMyTargets() {
  const raw = votes.find((v) => v.uid === uid)?.targets;
  const validTargets = Array.isArray(raw) ? raw : [];
  const activeIds = new Set(getActivePlayers().map((p) => p.uid));
  return validTargets.filter((x) => activeIds.has(x) && x !== uid);
}

function canCurrentUserVote() {
  if (room?.status !== RoomStatus.PLAYING) return false;
  if (!uid || room?.voteStopped) return false;
  if (!myPrivateData || myPrivateData.role === "pending") return false;
  return !getRevealedSet().has(uid);
}

function getVoteCountMap() {
  const activeVoterIds = new Set(getActivePlayers().map((p) => p.uid));
  const activeTargetIds = new Set(getActivePlayers().map((p) => p.uid));
  const limit = getVoteSlots();
  const map = new Map();

  for (const p of players) {
    map.set(p.uid, { count: 0, voterNames: [] });
  }

  for (const voteDoc of votes) {
    if (!activeVoterIds.has(voteDoc.uid)) continue;

    const targets = [...new Set(Array.isArray(voteDoc.targets) ? voteDoc.targets : [])]
      .filter((targetUid) => targetUid !== voteDoc.uid && activeTargetIds.has(targetUid))
      .slice(0, limit);

    for (const targetUid of targets) {
      const x = map.get(targetUid) || { count: 0, voterNames: [] };
      x.count += 1;
      x.voterNames.push(uidToName.get(voteDoc.uid) || "بدون اسم");
      map.set(targetUid, x);
    }
  }

  return map;
}

function renderVoteMeta() {
  const shouldShowBanner = !!room?.voteMessage;
  el.voteBanner?.classList.toggle("hidden", !shouldShowBanner);
  if (shouldShowBanner) {
    el.voteBanner.dataset.type = room?.voteMessageType || "info";
    setText(el.voteBanner, room.voteMessage || "");
  } else if (el.voteBanner) {
    el.voteBanner.dataset.type = "";
    setText(el.voteBanner, "");
  }

  if (room?.status !== RoomStatus.PLAYING) {
    setText(el.voteSummaryPill, "—");
    return;
  }

  setText(
    el.voteSummaryPill,
    `أصواتك: ${getMyTargets().length}/${getVoteSlots() || 0} | المطلوب: ${getRequiredVotes() || 0}`
  );
}

async function toggleVoteForTarget(targetUid) {
  try {
    setText(el.playError, "");
    if (!code || !uid || !room || room.status !== RoomStatus.PLAYING) return;
    if (room.voteStopped) return setText(el.playError, "التصويت متوقف حالياً.");
    if (targetUid === uid) return setText(el.playError, "لا يمكنك التصويت لنفسك.");

    const revealedSet = getRevealedSet();
    if (revealedSet.has(uid)) return setText(el.playError, "أنت مكشوف ولا يمكنك التصويت بعد الآن.");
    if (revealedSet.has(targetUid)) return setText(el.playError, "هذا اللاعب مكشوف ولا يمكن التصويت عليه.");

    const limit = getVoteSlots();
    if (!limit) return setText(el.playError, "لا يوجد أصوات متاحة الآن.");

    const current = getMyTargets();
    const selected = current.includes(targetUid);
    const next = selected ? current.filter((x) => x !== targetUid) : [...current, targetUid];

    if (!selected && current.length >= limit) {
      return setText(el.playError, `لديك ${limit} ${limit === 1 ? "صوت" : "أصوات"} فقط.`);
    }

    if (!next.length) {
      await clearMyVotes(code, uid);
    } else {
      await setMyVotes(code, uid, next);
    }
  } catch (err) {
    setText(el.playError, "تعذّر تحديث التصويت الآن.");
    console.error(err);
  }
}

async function maybeSyncRoundStateFromPlayers() {
  if (!isHost || !code || !room || room.status !== RoomStatus.PLAYING || !hostSecret) return;

  const currentPlayerIds = new Set(players.map((p) => p.uid));
  const revealedSet = getRevealedSet();
  const secretSpies = Array.isArray(hostSecret.spiesUids) ? hostSecret.spiesUids : [];
  const presentUnrevealedSpies = secretSpies.filter((spyUid) => currentPlayerIds.has(spyUid) && !revealedSet.has(spyUid));
  const nextActiveSpyCount = presentUnrevealedSpies.length;
  const roomActiveSpyCount = Math.max(0, Number(room.activeSpyCount ?? room.spiesCount ?? 0));

  if (nextActiveSpyCount === roomActiveSpyCount) return;

  const patch = { activeSpyCount: nextActiveSpyCount };
  let shouldLogWin = false;
  if (nextActiveSpyCount === 0 && !room.voteStopped) {
    patch.voteStopped = true;
    patch.roundWinner = "civilians";
    patch.endReason = "no_active_spies";
    patch.voteMessage = "لم يعد هناك جواسيس نشطون في الغرفة. المدنيون فازوا.";
    patch.voteMessageType = "success";
    shouldLogWin = true;
  }

  try {
    await hostSyncRoundState(code, patch);
    if (shouldLogWin) {
      await addActivityEvent(code, {
        type: "vote-success",
        text: patch.voteMessage,
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function maybeResolveVotes() {
  if (!isHost || !code || !room || room.status !== RoomStatus.PLAYING) return;
  if (!hostSecret || room.voteStopped || resolvingVote) return;

  const requiredVotes = getRequiredVotes();
  if (!requiredVotes) return;

  const activePlayers = getActivePlayers();
  const activeVoterIds = new Set(activePlayers.map((p) => p.uid));
  const revealedSet = getRevealedSet();
  const limit = getVoteSlots();
  const counts = new Map();

  for (const voteDoc of votes) {
    if (!activeVoterIds.has(voteDoc.uid)) continue;

    const targets = [...new Set(Array.isArray(voteDoc.targets) ? voteDoc.targets : [])]
      .filter((targetUid) => targetUid !== voteDoc.uid && !revealedSet.has(targetUid) && activeVoterIds.has(targetUid))
      .slice(0, limit);

    for (const targetUid of targets) {
      counts.set(targetUid, (counts.get(targetUid) || 0) + 1);
    }
  }

  const targetToResolve = players.find((p) => (counts.get(p.uid) || 0) >= requiredVotes && !revealedSet.has(p.uid));
  if (!targetToResolve) return;

  resolvingVote = true;
  try {
    await hostResolveVoteTarget(code, targetToResolve.uid, players.map((p) => p.uid), votes.map((v) => v.uid));
  } catch (err) {
    console.error(err);
  } finally {
    resolvingVote = false;
  }
}

async function handleForcedExit(message) {
  const msg = message || "تم إخراجك من الغرفة.";
  stopSubs();
  stopTimer();

  code = null;
  room = null;
  isHost = false;
  players = [];
  votes = [];
  hostSecret = null;
  activities = [];
  currentResults = null;
<<<<<<< HEAD
=======
  roundHistory = [];
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
  uidToName = new Map();
  myPrivateData = null;
  playCardVisible = false;
  wasMemberSeen = false;
  resolvingVote = false;
<<<<<<< HEAD
=======
  autoEndingRound = false;
>>>>>>> 4d6e420 (Add host transfer, custom mode, round history, and connection status)
  actionLocks.clear();
  clearPlayNotice();

  clearLast();
  applyLeaveButtonState();
  renderRoundHistory();
  setConnectionState(navigator.onLine ? "online" : "offline");
  setText(el.homeError, msg);
  showScreen("home");
}