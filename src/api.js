import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
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
};

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
      word: "",
      categoryLabel: "",
      spyPartnerNames: [],
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

export function subResults(code, cb) {
  return onSnapshot(
    refs.results(code),
    (s) => cb(s.exists() ? s.data() : null),
    () => cb(null)
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

function uniqueArray(arr) {
  return [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))];
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
  spiesUids,
  firstQuestion,
  players,
  spyTeammatesVisible,
}) {
  const batch = writeBatch(db);

  batch.delete(refs.results(code));

  batch.set(refs.hostSecret(code), {
    word,
    categoryLabel,
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
  });

  for (const p of players) {
    const isSpy = spiesUids.includes(p.uid);
    const partnerNames = spyTeammatesVisible && isSpy
      ? players
          .filter((x) => x.uid !== p.uid && spiesUids.includes(x.uid))
          .map((x) => x.name || "بدون اسم")
      : [];

    batch.delete(refs.vote(code, p.uid));

    batch.update(refs.privPlayer(code, p.uid), {
      role: isSpy ? "spy" : "civilian",
      word: isSpy ? "" : word,
      categoryLabel: isSpy ? "" : categoryLabel,
      spyPartnerNames: partnerNames,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function hostEndGame(code) {
  const [sec, roomSnap] = await Promise.all([
    getDoc(refs.hostSecret(code)),
    getDoc(refs.room(code)),
  ]);

  if (!sec.exists()) throw new Error("Missing host secret");
  if (!roomSnap.exists()) throw new Error("Missing room");

  const h = sec.data();
  const room = roomSnap.data();

  await setDoc(refs.results(code), {
    word: h.word || "",
    categoryLabel: h.categoryLabel || "",
    spiesUids: Array.isArray(h.spiesUids) ? h.spiesUids : [],
    revealedSpyUids: Array.isArray(room.revealedSpyUids) ? room.revealedSpyUids : [],
    roundWinner: room.roundWinner || "",
    finalMessage: room.voteMessage || "",
    endedAt: serverTimestamp(),
  });

  await updateDoc(refs.room(code), {
    status: RoomStatus.ENDED,
  });
}

export async function hostNewRound(code, playerUids = [], voteUids = []) {
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
      word: "",
      categoryLabel: "",
      spyPartnerNames: [],
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

  if (isSpy) {
    const nextRevealed = uniqueArray([...revealedSpyUids, targetUid]);
    const nextActiveSpyCount = Math.max(0, Number(room.activeSpyCount ?? room.spiesCount ?? 0) - 1);
    const isLastSpy = nextActiveSpyCount === 0;

    batch.update(refs.room(code), {
      revealedSpyUids: nextRevealed,
      activeSpyCount: nextActiveSpyCount,
      voteStopped: isLastSpy,
      voteMessage: isLastSpy
        ? `تم كشف آخر جاسوس: ${targetName}. المدنيون فازوا، والهوست يعرض النتائج يدويًا.`
        : `تم كشف جاسوس: ${targetName}. أكملوا التصويت على الجاسوس المتبقي.`,
      voteMessageType: isLastSpy ? "success" : "info",
      roundWinner: isLastSpy ? "civilians" : "",
    });
  } else {
    batch.update(refs.room(code), {
      voteStopped: true,
      voteMessage: `اللاعب ${targetName} ليس جاسوسًا. توقّف التصويت، والهوست ينهي الجولة يدويًا.`,
      voteMessageType: "danger",
      roundWinner: "spies",
    });
  }

  await batch.commit();
}

export async function hostSyncRoundState(code, patch = {}) {
  await updateDoc(refs.room(code), patch);
}
