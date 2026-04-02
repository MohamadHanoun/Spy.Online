import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  limit,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import { db } from "./firebase.js";

export const RoomStatus = {
  LOBBY: "lobby",
  PLAYING: "playing",
  ENDED: "ended",
};

export const refs = {
  room: (code) => doc(db, "rooms", code),
  pubPlayer: (code, uid) => doc(db, "rooms", code, "publicPlayers", uid),
  privPlayer: (code, uid) => doc(db, "rooms", code, "players", uid),
  hostSecret: (code) => doc(db, "rooms", code, "private", "host"),
  results: (code) => doc(db, "rooms", code, "results", "final"),
  vote: (code, uid) => doc(db, "rooms", code, "votes", uid),
  activityCol: (code) => collection(db, "rooms", code, "activity"),
};

function uniqueArray(arr) {
  return [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))];
}

function buildActivityPayload(payload = {}) {
  return {
    type: payload.type || "info",
    text: payload.text || "",
    actorUid: payload.actorUid || "",
    actorName: payload.actorName || "",
    targetUid: payload.targetUid || "",
    targetName: payload.targetName || "",
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  };
}

function buildRoundStartText(firstQuestion, players = []) {
  if (!firstQuestion?.from || !firstQuestion?.to) {
    return "بدأت الجولة.";
  }

  const nameByUid = new Map(players.map((p) => [p.uid, p.name || "بدون اسم"]));
  const fromName = nameByUid.get(firstQuestion.from) || "أحد اللاعبين";
  const toName = nameByUid.get(firstQuestion.to) || "أحد اللاعبين";
  return `بدأت الجولة. أول سؤال عشوائي: ${fromName} يسأل ${toName}.`;
}

export function getEndReasonLabel(reason) {
  switch (reason) {
    case "timeout":
      return "انتهاء الوقت";
    case "all_spies_found":
      return "كشف آخر جاسوس";
    case "wrong_vote":
      return "تصويت على لاعب ليس جاسوسًا";
    case "host_manual":
      return "إنهاء الهوست للجولة";
    case "no_active_spies":
      return "لم يعد هناك جواسيس نشطون";
    default:
      return "غير محدد";
  }
}

export async function clearActivityLog(code) {
  while (true) {
    const snap = await getDocs(query(refs.activityCol(code), limit(200)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.forEach((activityDoc) => batch.delete(activityDoc.ref));
    await batch.commit();

    if (snap.size < 200) break;
  }
}

export async function addActivityEvent(code, payload = {}) {
  await setDoc(doc(refs.activityCol(code)), buildActivityPayload(payload));
}

export async function roomExists(code) {
  const s = await getDoc(refs.room(code));
  return s.exists();
}

export async function getRoom(code) {
  const s = await getDoc(refs.room(code));
  return s.exists() ? s.data() : null;
}

export async function getMyPublicPlayer(code, uid) {
  const s = await getDoc(refs.pubPlayer(code, uid));
  return s.exists() ? s.data() : null;
}

export async function createRoom(code, hostUid, settings) {
  await setDoc(refs.room(code), {
    hostUid,
    status: RoomStatus.LOBBY,
    createdAt: serverTimestamp(),
    settings: settings ?? null,
    startedAt: null,
    roundMinutes: null,
    categoryKeys: null,
    spiesCount: null,
    activeSpyCount: 0,
    revealedSpyUids: [],
    firstQuestion: null,
    voteStopped: false,
    voteMessage: "",
    voteMessageType: "",
    roundWinner: "",
    endReason: "",
  });
}

export async function updateRoomSettings(code, settings) {
  await updateDoc(refs.room(code), { settings });
}

export async function upsertJoin(code, uid, name) {
  await setDoc(
    refs.pubPlayer(code, uid),
    {
      name,
      joinedAtMs: Date.now(),
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    refs.privPlayer(code, uid),
    {
      name,
      role: "pending",
      cardType: "classic",
      word: "",
      categoryLabel: "",
      spyPartnerNames: [],
      lolSkin: null,
      lolView: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await deleteDoc(refs.vote(code, uid)).catch(() => {});
}

export async function leaveRoom(code, uid) {
  await Promise.allSettled([
    deleteDoc(refs.pubPlayer(code, uid)),
    deleteDoc(refs.privPlayer(code, uid)),
    deleteDoc(refs.vote(code, uid)),
  ]);
}

export async function hostKickPlayer(code, uid) {
  await leaveRoom(code, uid);
}

export function subRoom(code, cb, onError) {
  return onSnapshot(
    refs.room(code),
    (s) => cb(s.exists() ? s.data() : null),
    onError
  );
}

export function subPublicPlayers(code, cb, onError) {
  return onSnapshot(
    query(collection(db, "rooms", code, "publicPlayers"), orderBy("joinedAtMs", "asc")),
    (snap) => {
      const list = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...(d.data() || {}) });
      });
      cb(list);
    },
    onError
  );
}

export function subMyPrivate(code, uid, cb, onError) {
  return onSnapshot(
    refs.privPlayer(code, uid),
    (s) => cb(s.exists() ? s.data() : null),
    onError
  );
}

export function subResults(code, cb, onError) {
  return onSnapshot(
    refs.results(code),
    (s) => cb(s.exists() ? s.data() : null),
    (err) => {
      console.error("subResults error:", err);
      onError?.(err);
      cb(null);
    }
  );
}

export function subVotes(code, cb, onError) {
  return onSnapshot(
    query(collection(db, "rooms", code, "votes"), orderBy("updatedAt", "asc")),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ uid: d.id, ...(d.data() || {}) }));
      cb(list);
    },
    onError
  );
}

export function subHostSecret(code, cb, onError) {
  return onSnapshot(
    refs.hostSecret(code),
    (s) => cb(s.exists() ? s.data() : null),
    onError
  );
}

export function subActivity(code, cb, onError) {
  return onSnapshot(
    query(refs.activityCol(code), orderBy("createdAtMs", "desc"), limit(50)),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() || {}) }));
      cb(list);
    },
    onError
  );
}

export async function setMyVotes(code, uid, targetUids = []) {
  const targets = uniqueArray(targetUids);
  if (!targets.length) {
    await deleteDoc(refs.vote(code, uid)).catch(() => {});
    return;
  }

  await setDoc(
    refs.vote(code, uid),
    {
      targets,
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function clearMyVotes(code, uid) {
  await deleteDoc(refs.vote(code, uid)).catch(() => {});
}

export async function hostStartGame({
  code,
  roundMinutes,
  categoryKeys,
  spiesCount,
  word,
  categoryLabel,
  roundMode = "classic",
  roundData = null,
  spiesUids,
  firstQuestion,
  players,
  spyTeammatesVisible,
}) {
  await clearActivityLog(code);

  const batch = writeBatch(db);
  const lolSkin = roundData?.lolSkin || null;
  const spyImageView = roundData?.spyImageView || null;

  batch.delete(refs.results(code));

  batch.set(refs.hostSecret(code), {
    roundMode,
    word,
    categoryLabel,
    lolSkin,
    spyImageView,
    spiesUids,
    updatedAt: serverTimestamp(),
  });

  batch.update(refs.room(code), {
    status: RoomStatus.PLAYING,
    startedAt: serverTimestamp(),
    roundMinutes,
    categoryKeys,
    spiesCount,
    activeSpyCount: spiesCount,
    revealedSpyUids: [],
    firstQuestion: firstQuestion ?? null,
    voteStopped: false,
    voteMessage: "",
    voteMessageType: "",
    roundWinner: "",
    endReason: "",
  });

  batch.set(
    doc(refs.activityCol(code)),
    buildActivityPayload({
      type: "round-start",
      text: buildRoundStartText(firstQuestion, players),
    })
  );

  for (const p of players) {
    const isSpy = spiesUids.includes(p.uid);
    const partnerNames = spyTeammatesVisible && isSpy
      ? players
          .filter((x) => x.uid !== p.uid && spiesUids.includes(x.uid))
          .map((x) => x.name || "بدون اسم")
      : [];

    batch.delete(refs.vote(code, p.uid));

    if (roundMode === "lol_skin") {
      batch.update(refs.privPlayer(code, p.uid), {
        role: isSpy ? "spy" : "civilian",
        cardType: "lol_skin",
        word: "",
        categoryLabel: "",
        spyPartnerNames: partnerNames,
        lolSkin,
        lolView: isSpy ? spyImageView : null,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(refs.privPlayer(code, p.uid), {
        role: isSpy ? "spy" : "civilian",
        cardType: "classic",
        word: isSpy ? "" : word,
        categoryLabel: isSpy ? "" : categoryLabel,
        spyPartnerNames: partnerNames,
        lolSkin: null,
        lolView: null,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

export async function hostEndGame(code, options = {}) {
  const [sec, roomSnap] = await Promise.all([
    getDoc(refs.hostSecret(code)),
    getDoc(refs.room(code)),
  ]);

  if (!sec.exists()) throw new Error("Missing host secret");
  if (!roomSnap.exists()) throw new Error("Missing room");

  const h = sec.data();
  const room = roomSnap.data();
  const endReason = options.reason || room.endReason || "host_manual";
  const roundWinner = options.roundWinner || room.roundWinner || "";
  const finalMessage = options.finalMessage || room.voteMessage || (
    endReason === "timeout"
      ? "انتهى الوقت. انتهت الجولة تلقائيًا وفاز الجاسوس."
      : roundWinner === "civilians"
        ? "انتهت الجولة. فاز المدنيون."
        : roundWinner === "spies"
          ? "انتهت الجولة. فاز الجواسيس."
          : "قام الهوست بإنهاء الجولة."
  );

  const batch = writeBatch(db);

  batch.set(refs.results(code), {
    roundMode: h.roundMode || "classic",
    word: h.word || "",
    categoryLabel: h.categoryLabel || "",
    lolSkin: h.lolSkin || null,
    spiesUids: Array.isArray(h.spiesUids) ? h.spiesUids : [],
    revealedSpyUids: Array.isArray(room.revealedSpyUids) ? room.revealedSpyUids : [],
    roundWinner,
    finalMessage,
    endReason,
    endReasonLabel: getEndReasonLabel(endReason),
    endedAt: serverTimestamp(),
  });

  batch.update(refs.room(code), {
    status: RoomStatus.ENDED,
    endReason,
    roundWinner,
    voteStopped: true,
    voteMessage: finalMessage,
    voteMessageType: roundWinner === "civilians" ? "success" : roundWinner === "spies" ? "danger" : "info",
  });

  batch.set(
    doc(refs.activityCol(code)),
    buildActivityPayload({
      type: "round-end",
      text: finalMessage,
    })
  );

  await batch.commit();
}

export async function hostNewRound(code, playerUids = [], voteUids = []) {
  await clearActivityLog(code);

  const batch = writeBatch(db);

  batch.delete(refs.results(code));
  batch.delete(refs.hostSecret(code));

  const voteIds = uniqueArray([...playerUids, ...voteUids]);
  for (const uid of voteIds) {
    batch.delete(refs.vote(code, uid));
  }

  for (const uid of uniqueArray(playerUids)) {
    batch.update(refs.privPlayer(code, uid), {
      role: "pending",
      cardType: "classic",
      word: "",
      categoryLabel: "",
      spyPartnerNames: [],
      lolSkin: null,
      lolView: null,
      updatedAt: serverTimestamp(),
    });
  }

  batch.update(refs.room(code), {
    status: RoomStatus.LOBBY,
    startedAt: null,
    roundMinutes: null,
    categoryKeys: null,
    spiesCount: null,
    activeSpyCount: 0,
    revealedSpyUids: [],
    firstQuestion: null,
    voteStopped: false,
    voteMessage: "",
    voteMessageType: "",
    roundWinner: "",
    endReason: "",
  });

  await batch.commit();
}

export async function hostResolveVoteTarget(code, targetUid, playerUids = [], voteUids = []) {
  const [secSnap, roomSnap, targetPubSnap] = await Promise.all([
    getDoc(refs.hostSecret(code)),
    getDoc(refs.room(code)),
    getDoc(refs.pubPlayer(code, targetUid)),
  ]);

  if (!secSnap.exists() || !roomSnap.exists()) {
    throw new Error("Missing round data");
  }

  const secret = secSnap.data();
  const room = roomSnap.data();
  const targetName = targetPubSnap.exists() ? (targetPubSnap.data()?.name || "هذا اللاعب") : "هذا اللاعب";

  const spiesUids = uniqueArray(secret.spiesUids);
  const revealedSpyUids = uniqueArray(room.revealedSpyUids);
  const wasAlreadyRevealed = revealedSpyUids.includes(targetUid);
  const isSpy = spiesUids.includes(targetUid);

  if (wasAlreadyRevealed || room.voteStopped) return;

  const batch = writeBatch(db);

  for (const uid of uniqueArray([...playerUids, ...voteUids])) {
    batch.delete(refs.vote(code, uid));
  }

  let voteMessage = "";
  let voteMessageType = "info";
  let activityType = "info";
  let roundWinner = room.roundWinner || "";
  let voteStopped = room.voteStopped === true;
  let nextRevealed = revealedSpyUids;
  let nextActiveSpyCount = Math.max(0, Number(room.activeSpyCount ?? room.spiesCount ?? 0));
  let endReason = room.endReason || "";

  if (isSpy) {
    nextRevealed = uniqueArray([...revealedSpyUids, targetUid]);
    nextActiveSpyCount = Math.max(0, Number(room.activeSpyCount ?? room.spiesCount ?? 0) - 1);
    const isLastSpy = nextActiveSpyCount === 0;

    voteStopped = isLastSpy;
    roundWinner = isLastSpy ? "civilians" : "";
    endReason = isLastSpy ? "all_spies_found" : "";
    voteMessage = isLastSpy
      ? `تم كشف آخر جاسوس: ${targetName}. انتهت الجولة، فاز اللاعبون.`
      : `تم كشف جاسوس: ${targetName}. أكملوا اللعبة لكشف الجاسوس الآخر.`;
    voteMessageType = isLastSpy ? "success" : "info";
    activityType = "vote-success";
  } else {
    voteStopped = true;
    roundWinner = "spies";
    endReason = "wrong_vote";
    voteMessage = `اللاعب ${targetName} ليس جاسوسًا. انتهت الجولة.`;
    voteMessageType = "danger";
    activityType = "vote-fail";
  }

  batch.update(refs.room(code), {
    revealedSpyUids: nextRevealed,
    activeSpyCount: nextActiveSpyCount,
    voteStopped,
    voteMessage,
    voteMessageType,
    roundWinner,
    endReason,
  });

  batch.set(
    doc(refs.activityCol(code)),
    buildActivityPayload({
      type: activityType,
      text: voteMessage,
      targetUid,
      targetName,
    })
  );

  await batch.commit();
}

export async function hostSyncRoundState(code, patch = {}) {
  await updateDoc(refs.room(code), patch);
}
