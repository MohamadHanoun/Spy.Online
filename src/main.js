import { ensureAnonAuth, onUid } from "./firebase.js";
import { $, showScreen, setText, setHtml } from "./dom.js";
import { genRoomCode, safeCopy, formatTime, escapeHtml, toInt, debounce } from "./utils.js";
import { loadName, saveName, loadLast, saveLast, clearLast, loadHostDefaults, saveHostDefaults } from "./storage.js";
import {
  RoomStatus,
  roomExists, getRoom, getMyPublicPlayer,
  createRoom, updateRoomSettings, upsertJoin, leaveRoom,
  subRoom, subPublicPlayers, subMyPrivate, subResults, subVotes, subHostSecret,
  hostStartGame, hostEndGame, hostNewRound, hostKickPlayer,
  setMyVotes, clearMyVotes, hostResolveVoteTarget, hostSyncRoundState,
} from "./api.js";
import { SPY_DATA } from "./data.js";
import { buildPool, pickWordAvoidingRecent, pickSpies, pickFirstQuestion } from "./game.js";
import { GAME_MODES, LOL_MODE_KEY, getModeDefinition, getModeLabel, pickRandomLolSkinRound } from "./lol.js";

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
  createCategoryList: $("#createCategoryList"),
  createTargetPlayers: $("#createTargetPlayers"),
  createSpiesCount: $("#createSpiesCount"),
  createRoundMinutes: $("#createRoundMinutes"),
  createSpyTeammatesVisible: $("#createSpyTeammatesVisible"),

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
  lobbyHostPanel: $("#lobbyHostPanel"),
  hostBox: $("#hostBox"),
  btnStart: $("#btnStart"),
  lobbyError: $("#lobbyError"),
  lobbyModeList: $("#lobbyModeList"),
  lobbyModeHint: $("#lobbyModeHint"),
  lobbyClassicFields: $("#lobbyClassicFields"),
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
  playError: $("#playError"),
  voteSummaryPill: $("#voteSummaryPill"),
  voteBanner: $("#voteBanner"),

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
let votes = [];
let hostSecret = null;
let uidToName = new Map();
let myPrivateData = null;
let playCardVisible = false;
let timerId = null;
let wasMemberSeen = false;
let resolvingVote = false;

let unsub = {
  room: null,
  players: null,
  my: null,
  results: null,
  votes: null,
  secret: null,
};

boot();

async function boot() {
  el.nameInput.value = loadName();

  const last = loadLast();
  if (last?.code) el.roomCodeInput.value = last.code;

  initCreateDefaultsUI();
  wire();
  bindLolImageProtection();
  applyLeaveButtonState();

  await ensureAnonAuth();
  onUid((id) => {
    uid = id;
  });

  if (last?.code && last?.name) {
    try {
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

      const settings = readCreateDefaults();
      const newCode = await createRoomFlow(settings);
      await joinFlow(newCode, name, false);
    } catch (err) {
      setText(el.createError, "تعذر إنشاء الغرفة الآن.");
      console.error(err);
    }
  });
  function bindLolImageProtection() {
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".lolProtected")) {
      e.preventDefault();
    }
  });

  document.addEventListener("dragstart", (e) => {
    if (e.target.closest(".lolProtected")) {
      e.preventDefault();
    }
  });

  document.addEventListener("selectstart", (e) => {
    if (e.target.closest(".lolProtected")) {
      e.preventDefault();
    }
  });
}


  el.btnJoinRoom.addEventListener("click", async () => {
    try {
      setText(el.homeError, "");
      const name = (el.nameInput.value || "").trim();
      const c = (el.roomCodeInput.value || "").trim().toUpperCase();
      if (!name) return setText(el.homeError, "اكتب اسمك أولًا.");
      if (!c) return setText(el.homeError, "اكتب كود الغرفة.");
      await joinFlow(c, name, false);
    } catch (err) {
      if (!el.homeError.textContent) setText(el.homeError, "تعذر الانضمام الآن.");
      console.error(err);
    }
  });

  el.btnCopyCode.addEventListener("click", () => safeCopy(el.roomCodeView.textContent || ""));

  el.btnLeave.addEventListener("click", async () => {
    await leaveFlow();
    applyLeaveButtonState();
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
    try {
      await hostKickPlayer(code, targetUid);
    } catch (err) {
      setText(el.lobbyError, "تعذر طرد اللاعب الآن.");
      console.error(err);
    }
  });

  el.playPlayersList?.addEventListener("click", async (e) => {
    const kickBtn = e.target.closest("button[data-play-kick-uid]");
    if (kickBtn && isHost && code) {
      const targetUid = kickBtn.dataset.playKickUid;
      if (!targetUid || targetUid === uid) return;
      try {
        await hostKickPlayer(code, targetUid);
      } catch (err) {
        setText(el.playError, "تعذر طرد اللاعب الآن.");
        console.error(err);
      }
      return;
    }

    const voteBtn = e.target.closest("button[data-vote-target]");
    if (!voteBtn) return;
    const targetUid = voteBtn.dataset.voteTarget;
    if (!targetUid) return;
    await toggleVoteForTarget(targetUid);
  });
}

function initCreateDefaultsUI() {
  const def = normalizeSettings(loadHostDefaults() || {
    modeKey: "classic",
    categories: DEFAULT_CLASSIC_CATEGORIES,
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

  toggleCreateModeSections(def.modeKey);
  setText(el.createModeHint, getModeDefinition(def.modeKey).description || "");

  const persistDefaults = debounce(() => {
    saveHostDefaults(readCreateDefaults());
  }, 250);

  el.createTargetPlayers.addEventListener("input", persistDefaults);
  el.createSpiesCount.addEventListener("input", persistDefaults);
  el.createRoundMinutes.addEventListener("input", persistDefaults);
  el.createSpyTeammatesVisible.addEventListener("change", persistDefaults);
}

function readCreateDefaults() {
  const modeKey = getSelectedMode(el.createModeList) || "classic";
  const categories = getCheckedCategories(el.createCategoryList);
  return normalizeSettings({
    modeKey,
    categories,
    targetPlayers: toInt(el.createTargetPlayers.value, 0),
    spiesCount: toInt(el.createSpiesCount.value, 1),
    roundMinutes: toInt(el.createRoundMinutes.value, 8),
    spyTeammatesVisible: !!el.createSpyTeammatesVisible.checked,
  });
}

function normalizeSettings(s) {
  const modeKey = s?.modeKey === LOL_MODE_KEY ? LOL_MODE_KEY : "classic";
  const categories = Array.isArray(s?.categories) ? s.categories.filter(Boolean) : DEFAULT_CLASSIC_CATEGORIES;
  return {
    modeKey,
    categories,
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
}

function toggleLobbyModeSections(modeKey) {
  el.lobbyClassicFields?.classList.toggle("hidden", modeKey !== "classic");
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
  uidToName = new Map();
  myPrivateData = null;
  playCardVisible = false;
  wasMemberSeen = false;
  resolvingVote = false;

  if (oldCode && oldUid) {
    try { await leaveRoom(oldCode, oldUid); } catch (err) { console.error(err); }
  }

  clearLast();
  applyLeaveButtonState();
}

function startSubs(roomCode) {
  stopSubs();
  wasMemberSeen = false;
  applyLeaveButtonState();
  setText(el.roomCodeView, roomCode);
  setText(el.playError, "");
  setText(el.lobbyError, "");

  unsub.room = subRoom(
    roomCode,
    (x) => {
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
    () => handleForcedExit("تم فقدان الوصول إلى الغرفة.")
  );

  unsub.players = subPublicPlayers(
    roomCode,
    (list) => {
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
      route();
      maybeSyncRoundStateFromPlayers();
      maybeResolveVotes();
    },
    () => {
      if (code) handleForcedExit("تم إخراجك من الغرفة.");
    }
  );

  unsub.my = subMyPrivate(
    roomCode,
    uid,
    (me) => {
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
    () => {
      if (code && wasMemberSeen) handleForcedExit("تم إخراجك من الغرفة.");
    }
  );

  unsub.votes = subVotes(
    roomCode,
    (list) => {
      votes = list;
      renderPlayPlayers();
      renderVoteMeta();
      maybeSyncRoundStateFromPlayers();
      maybeResolveVotes();
    },
    () => {
      votes = [];
      renderPlayPlayers();
      renderVoteMeta();
    }
  );

  unsub.results = null;
  wireLobbySettingsWrites();
}

function stopSubs() {
  Object.values(unsub).forEach((u) => {
    try { u?.(); } catch {}
  });
  unsub = { room: null, players: null, my: null, results: null, votes: null, secret: null };
}

function syncHostSecretSub() {
  if (!code) return;
  if (isHost && !unsub.secret) {
    unsub.secret = subHostSecret(code, (secret) => {
      hostSecret = secret;
      maybeResolveVotes();
    }, () => {
      hostSecret = null;
    });
    return;
  }

  if (!isHost && unsub.secret) {
    try { unsub.secret(); } catch {}
    unsub.secret = null;
    hostSecret = null;
  }
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
        const kickBtn = isHost && p.uid !== uid
          ? `<button class="btn btn-danger btn-small" type="button" data-kick-uid="${escapeHtml(p.uid)}">طرد</button>`
          : "";
        return `
          <div class="playerRow">
            <div class="playerInfo grow">
              <div class="playerNameLine">
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
  const votingOpen = canCurrentUserVote();

  const html = players.length
    ? players.map((p) => {
        const isRevealed = revealedSet.has(p.uid);
        const isSelf = p.uid === uid;
        const rowVotes = voteData.get(p.uid) || { count: 0, voterNames: [] };
        const selected = myTargets.includes(p.uid);
        const canToggle = !isSelf && !isRevealed && votingOpen;
        const voteBtn = canToggle
          ? `<button class="btn ${selected ? "btn-danger" : "btn-secondary"} btn-small" type="button" data-vote-target="${escapeHtml(p.uid)}">${selected ? "إلغاء الصوت" : "تصويت"}</button>`
          : "";
        const kickBtn = isHost && !isSelf
          ? `<button class="btn btn-ghost btn-small" type="button" data-play-kick-uid="${escapeHtml(p.uid)}">طرد</button>`
          : "";
        const badges = [];
        if (isSelf) badges.push('<span class="playerBadge self">أنت</span>');
        if (room?.hostUid === p.uid) badges.push('<span class="playerBadge">هوست</span>');
        if (isRevealed) badges.push('<span class="playerBadge spyX">X</span>');

        return `
          <div class="playerRow boardRow ${isRevealed ? "is-revealed" : ""}">
            <div class="playerInfo grow">
              <div class="playerNameLine">
                <span class="playerName">${escapeHtml(p.name || "بدون اسم")}</span>
                ${badges.join(" ")}
              </div>
              <div class="playerSub">
                ${isRevealed ? "تم كشفه كجاسوس" : `الأصوات عليه: <strong>${rowVotes.count}</strong>`}
                ${rowVotes.voterNames.length ? ` — ${escapeHtml(rowVotes.voterNames.join("، "))}` : ""}
              </div>
            </div>
            <div class="playerActionsInline">
              ${voteBtn}
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
  setText(el.publicModeView, getModeLabel(settings.modeKey));
  setText(el.publicPlayersView, settings.targetPlayers > 0 ? `${n} / ${settings.targetPlayers}` : `${n}`);
  setText(el.publicSpiesView, String(settings.spiesCount || 0));
  setText(el.publicTimeView, settings.roundMinutes > 0 ? `${settings.roundMinutes} دقيقة` : "بدون مؤقت");
  if (settings.modeKey === LOL_MODE_KEY) {
    setText(el.publicCategoriesView, "League of Legends — جولة صور سكنات");
  } else {
    const labels = settings.categories
      .map((key) => SPY_DATA.categories.find((c) => c.key === key)?.label || key)
      .join("، ");
    setText(el.publicCategoriesView, labels || "—");
  }
}

function renderStatus() {
  if (!room) return;

  const st = room.status;
  const n = players.length;
  const s = normalizeSettings(room.settings || {});
  const modeLabel = getModeLabel(s.modeKey);

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
  updateRoundContext(s.modeKey);
  setText(el.roundModeBadge, modeLabel);

  const meta = `لاعبين: ${n} | مطلوب: ${s.targetPlayers || "—"} | جواسيس: ${s.spiesCount} | وقت: ${s.roundMinutes > 0 ? `${s.roundMinutes}د` : "—"} | يعرفون بعض: ${s.spyTeammatesVisible ? "نعم" : "لا"}`;
  setText(el.metaInfo, meta);

  const canStart = isHost && st === RoomStatus.LOBBY && n >= 2 && (s.targetPlayers <= 0 || n === s.targetPlayers);
  el.btnStart.disabled = !canStart;
  setText(el.saveState, isHost ? "✅ إعدادات الهوست فقط" : "👀 عرض مختصر فقط");
}

function route() {
  if (!room) return;

  if (room.status === RoomStatus.LOBBY) {
    stopResultsSub();
    stopTimer();
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
    renderVoteMeta();
    return;
  }

  if (room.status === RoomStatus.ENDED) {
    ensureResultsSub();
    stopTimer();
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
      targetPlayers: toInt(el.lobbyTargetPlayers.value, 0),
      spiesCount: toInt(el.lobbySpiesCount.value, 0),
      roundMinutes: toInt(el.lobbyRoundMinutes.value, 0),
      spyTeammatesVisible: !!el.lobbySpyTeammatesVisible.checked,
    });

    if (settings.modeKey === "classic" && !settings.categories.length) {
      setText(el.lobbyError, "اختر فئة واحدة على الأقل.");
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

  const spiesUids = pickSpies(players.map((p) => p.uid), s.spiesCount);
  const fq = pickFirstQuestion(players.map((p) => p.uid));

  let roundPayload = {
    word: "",
    categoryLabel: "",
    roundMode: s.modeKey,
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
    roundData: roundPayload.roundData,
    spiesUids,
    firstQuestion: fq,
    spyTeammatesVisible: s.spyTeammatesVisible,
    players: players.map((p) => ({ uid: p.uid, name: p.name || "بدون اسم" })),
  });
}

async function endRound() {
  if (!isHost || !code) return;
  await hostEndGame(code);
}

async function newRound() {
  if (!isHost || !code) return;
  await hostNewRound(code, players.map((p) => p.uid), votes.map((v) => v.uid));
  showScreen("lobby");
}

function buildLolImageStyle(imageUrl, view = null) {
  const tx = Number(view?.translateXPercent ?? 0);
  const ty = Number(view?.translateYPercent ?? 0);
  const scale = Number(view?.scale ?? 1);
  const blur = Number(view?.blurPx ?? 0);
  const safeUrl = String(imageUrl || "").replace(/"/g, "%22");

  return [
    `background-image:url("${safeUrl}")`,
    `--lol-tx:${tx}%`,
    `--lol-ty:${ty}%`,
    `--lol-scale:${scale}`,
    `--lol-blur:${blur}px`,
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
            <div class="lolSpyNote">الصورة الأصلية نفسها، لكن العرض هنا يعتمد على Zoom + Blur + Safe Zone فقط.</div>
            <div class="lolImageFrame spyView lolProtected">
              <div class="lolImageVisual" style="${buildLolImageStyle(me.lolSkin.imageUrl, me.lolView)}"></div>
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
          <div class="lolImageFrame">
            <div class="lolImageVisual" style="${buildLolImageStyle(me.lolSkin.imageUrl, null)}" aria-label="${escapeHtml(`${me.lolSkin.championName || ""} ${me.lolSkin.skinName || ""}`)}"></div>
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

function updateRoundContext(modeKey) {
  const modeLabel = getModeLabel(modeKey);
  setText(el.roundModeBadge, modeLabel);
  if (modeKey === LOL_MODE_KEY) {
    setText(el.playHint, "اسألوا عن تفاصيل السكن والصورة. الأمبوستر يرى نفس الصورة لكن بشكل محدود.");
  } else {
    setText(el.playHint, "ابدأوا الأسئلة، والكل يحاول يكتشف الجاسوس.");
  }
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
  if (!res) {
    setText(el.resultsBox, "—");
    return;
  }

  const spiesNames = (res.spiesUids || []).map((id) => uidToName.get(id) || id).join("، ");
  const foundNames = (res.revealedSpyUids || []).map((id) => uidToName.get(id) || id).join("، ");
  const winnerText = res.roundWinner === "civilians"
    ? "المدنيون"
    : res.roundWinner === "spies"
      ? "الجواسيس"
      : "—";

  const roundMode = res.roundMode === LOL_MODE_KEY ? "League of Legends" : "كلاسيكي";
  const roundMain = res.roundMode === LOL_MODE_KEY
    ? `الشخصية: ${res.lolSkin?.championName || "—"}
السكن: ${res.lolSkin?.skinName || "—"}`
    : `الكلمة: ${res.word || "—"}
التصنيف: ${res.categoryLabel || "—"}`;

  const txt =
    `المود: ${roundMode}
` +
    `${roundMain}
` +
    `الجواسيس: ${spiesNames || "—"}
` +
    `الجواسيس الذين انكشفوا: ${foundNames || "—"}
` +
    `الفائز: ${winnerText}
` +
    `رسالة الجولة: ${res.finalMessage || "—"}`;

  setText(el.resultsBox, txt);
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
  if (nextActiveSpyCount === 0 && !room.voteStopped) {
    patch.voteStopped = true;
    patch.roundWinner = "civilians";
    patch.voteMessage = "لم يعد هناك جواسيس نشطون في الغرفة. المدنيون فازوا، والهوست يعرض النتائج يدويًا.";
    patch.voteMessageType = "success";
  }

  try {
    await hostSyncRoundState(code, patch);
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
  uidToName = new Map();
  myPrivateData = null;
  playCardVisible = false;
  wasMemberSeen = false;
  resolvingVote = false;

  clearLast();
  applyLeaveButtonState();
  setText(el.homeError, msg);
  showScreen("home");
}
