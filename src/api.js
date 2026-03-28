import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, onSnapshot, query, orderBy,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import { db } from "./firebase.js";

export const RoomStatus = { LOBBY:"lobby", PLAYING:"playing", ENDED:"ended" };

export const refs = {
  room: (code) => doc(db, "rooms", code),
  pubPlayer: (code, uid) => doc(db, "rooms", code, "publicPlayers", uid),
  privPlayer: (code, uid) => doc(db, "rooms", code, "players", uid),
  hostSecret: (code) => doc(db, "rooms", code, "private", "host"),
  results: (code) => doc(db, "rooms", code, "results", "final"),
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
  });
}

export async function updateRoomSettings(code, settings) {
  await updateDoc(refs.room(code), { settings });
}

export async function upsertJoin(code, uid, name) {
  await setDoc(refs.pubPlayer(code, uid), {
    name,
    joinedAtMs: Date.now(),
    joinedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(refs.privPlayer(code, uid), {
    name,
    role: "pending",
    word: "",
    categoryLabel: "",
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function leaveRoom(code, uid) {
  await Promise.allSettled([
    deleteDoc(refs.pubPlayer(code, uid)),
    deleteDoc(refs.privPlayer(code, uid)),
  ]);
}

export function subRoom(code, cb) {
  return onSnapshot(refs.room(code), (s) => cb(s.exists() ? s.data() : null));
}

export function subPublicPlayers(code, cb) {
  return onSnapshot(
    query(collection(db, "rooms", code, "publicPlayers"), orderBy("joinedAtMs", "asc")),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ uid: d.id, ...(d.data() || {}) }));
      cb(list);
    }
  );
}

export function subMyPrivate(code, uid, cb) {
  return onSnapshot(refs.privPlayer(code, uid), (s) => cb(s.exists() ? s.data() : null));
}

export function subResults(code, cb) {
  return onSnapshot(
    refs.results(code),
    (s) => cb(s.exists() ? s.data() : null),
    () => cb(null)
  );
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
  players
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
    firstQuestion: firstQuestion ?? null,
  });

  for (const p of players) {
    const isSpy = spiesUids.includes(p.uid);
    batch.update(refs.privPlayer(code, p.uid), {
      role: isSpy ? "spy" : "civilian",
      word: isSpy ? "" : word,
      categoryLabel: isSpy ? "" : categoryLabel,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function hostEndGame(code) {
  const sec = await getDoc(refs.hostSecret(code));
  if (!sec.exists()) throw new Error("Missing host secret");
  const h = sec.data();

  await setDoc(refs.results(code), {
    word: h.word || "",
    categoryLabel: h.categoryLabel || "",
    spiesUids: Array.isArray(h.spiesUids) ? h.spiesUids : [],
    endedAt: serverTimestamp(),
  });

  await updateDoc(refs.room(code), { status: RoomStatus.ENDED });
}

export async function hostNewRound(code) {
  const batch = writeBatch(db);

  batch.delete(refs.results(code));
  batch.delete(refs.hostSecret(code));

  const pubSnap = await getDocs(collection(db, "rooms", code, "publicPlayers"));
  pubSnap.forEach((d) => {
    batch.update(refs.privPlayer(code, d.id), {
      role: "pending",
      word: "",
      categoryLabel: "",
      updatedAt: serverTimestamp(),
    });
  });

  batch.update(refs.room(code), {
    status: RoomStatus.LOBBY,
    startedAt: null,
    roundMinutes: null,
    categoryKeys: null,
    spiesCount: null,
    firstQuestion: null,
  });

  await batch.commit();
}