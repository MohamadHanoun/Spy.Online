export const LOL_MODE_KEY = "lol_skin";
export const LOL_MODE_LABEL = "League of Legends";

export const GAME_MODES = [
  {
    key: "classic",
    label: "Classic Mod ",
    description: "الكلمات والفئات العادية الموجودة أصلًا في لعبتك.",
  },
  {
    key: LOL_MODE_KEY,
    label: "League of Legends",
    description: "جولة مبنية على صورة سكن. اللاعب العادي يرى الصورة مع اسم الشخصية واسم السكن، والأمبوستر يرى نفس الصورة مع Zoom + Blur.",
  },
];

const SAFE_ZONES = [
  { key: "top_left", label: "أعلى يسار", tx: 18, ty: 14 },
  { key: "top_right", label: "أعلى يمين", tx: -18, ty: 14 },
  { key: "bottom_left", label: "أسفل يسار", tx: 18, ty: -14 },
  { key: "bottom_right", label: "أسفل يمين", tx: -18, ty: -14 },
  { key: "right_middle", label: "يمين الوسط", tx: -20, ty: -2 },
  { key: "left_middle", label: "يسار الوسط", tx: 20, ty: -2 },
];

const VERSION_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const CDN_DATA_BASE = "https://ddragon.leagueoflegends.com/cdn";
const SPLASH_BASE = "https://ddragon.leagueoflegends.com/cdn/img/champion/splash";

let versionPromise = null;
let championListPromise = null;
const championDetailsCache = new Map();

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function jitter(value, amount) {
  return value + (Math.random() * amount * 2 - amount);
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

export async function getLatestLolVersion() {
  if (!versionPromise) {
    versionPromise = fetchJson(VERSION_URL).then((versions) => {
      if (!Array.isArray(versions) || !versions.length) {
        throw new Error("No Data Dragon versions returned");
      }
      return versions[0];
    });
  }
  return versionPromise;
}

export async function getChampionList(version) {
  if (!championListPromise) {
    championListPromise = fetchJson(`${CDN_DATA_BASE}/${version}/data/en_US/champion.json`);
  }
  return championListPromise;
}

export async function getChampionDetails(version, championId) {
  const key = `${version}:${championId}`;
  if (!championDetailsCache.has(key)) {
    championDetailsCache.set(
      key,
      fetchJson(`${CDN_DATA_BASE}/${version}/data/en_US/champion/${championId}.json`)
    );
  }
  return championDetailsCache.get(key);
}

export function buildLolSkinAsset(version, championEntry, skinEntry) {
  return {
    version,
    championId: championEntry.id,
    championName: championEntry.name,
    skinNum: Number(skinEntry.num ?? 0),
    skinName: skinEntry.name || championEntry.name,
    imageUrl: `${SPLASH_BASE}/${championEntry.id}_${Number(skinEntry.num ?? 0)}.jpg`,
  };
}

export function getBaseSkins(championEntry) {
  const skins = Array.isArray(championEntry?.skins) ? championEntry.skins : [];
  return skins.filter((skin) => !skin?.parentSkin);
}

export function createSpyImageView() {
  const zone = randomFrom(SAFE_ZONES);
  return {
    zoneKey: zone.key,
    zoneLabel: zone.label,
    scale: Number(jitter(2.55, 0.18).toFixed(2)),
    blurPx: Number(jitter(9, 1.5).toFixed(1)),
    translateXPercent: Number(jitter(zone.tx, 4).toFixed(1)),
    translateYPercent: Number(jitter(zone.ty, 4).toFixed(1)),
  };
}

export async function pickRandomLolSkinRound() {
  const version = await getLatestLolVersion();
  const championList = await getChampionList(version);
  const champions = Object.values(championList?.data || {});
  if (!champions.length) throw new Error("No champions found");

  const championPick = randomFrom(champions);
  const championDetails = await getChampionDetails(version, championPick.id);
  const championData = championDetails?.data?.[championPick.id];
  if (!championData) throw new Error("Champion details missing");

  const skins = getBaseSkins(championData);
  if (!skins.length) throw new Error("No eligible skins found");

  const skin = randomFrom(skins);
  return {
    modeKey: LOL_MODE_KEY,
    lolSkin: buildLolSkinAsset(version, championData, skin),
    spyImageView: createSpyImageView(),
  };
}

export function getModeDefinition(modeKey) {
  return GAME_MODES.find((mode) => mode.key === modeKey) || GAME_MODES[0];
}

export function getModeLabel(modeKey) {
  return getModeDefinition(modeKey).label;
}
