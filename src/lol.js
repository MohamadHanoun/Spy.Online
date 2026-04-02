export const CUSTOM_MODE_KEY = "custom";
export const LOL_MODE_KEY = "lol_skin";
export const LOL_MODE_LABEL = "League of Legends";

export const GAME_MODES = [
  {
    key: "classic",
    label: "Classic Mod",
    description: "الكلمات والفئات العادية الموجودة أصلًا في لعبتك.",
  },
  {
    key: CUSTOM_MODE_KEY,
    label: "مود خاص",
    description: "الهوست يكتب كلمات خاصة يدويًا، واللعبة تختار كلمة عشوائية منها في كل جولة.",
  },
  {
    key: LOL_MODE_KEY,
    label: "League of Legends",
    description:
      "جولة مبنية على صورة سكن. اللاعب العادي يرى الصورة مع اسم الشخصية واسم السكن، والأمبوستر يرى نفس الصورة مع Zoom + Blur.",
  },
];

const VERSION_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const CDN_DATA_BASE = "https://ddragon.leagueoflegends.com/cdn";
const SPLASH_BASE = "https://ddragon.leagueoflegends.com/cdn/img/champion/splash";
const LOCALE = "en_US";

const SAFE_ZONES = [
  {
    key: "top_left",
    label: "أعلى يسار",
    originX: "left",
    originY: "top",
  },
  {
    key: "top_right",
    label: "أعلى يمين",
    originX: "right",
    originY: "top",
  },
  {
    key: "bottom_left",
    label: "أسفل يسار",
    originX: "left",
    originY: "bottom",
  },
  {
    key: "bottom_right",
    label: "أسفل يمين",
    originX: "right",
    originY: "bottom",
  },
];

let versionPromise = null;
const championListByVersion = new Map();
const championDetailsCache = new Map();

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${url} (${res.status})`);
  }
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
  if (!championListByVersion.has(version)) {
    championListByVersion.set(
      version,
      fetchJson(`${CDN_DATA_BASE}/${version}/data/${LOCALE}/champion.json`)
    );
  }
  return championListByVersion.get(version);
}

export async function getChampionDetails(version, championId) {
  const cacheKey = `${version}:${championId}`;
  if (!championDetailsCache.has(cacheKey)) {
    championDetailsCache.set(
      cacheKey,
      fetchJson(`${CDN_DATA_BASE}/${version}/data/${LOCALE}/champion/${championId}.json`)
    );
  }
  return championDetailsCache.get(cacheKey);
}

export function buildLolSkinAsset(version, championEntry, skinEntry) {
  const skinNum = Number(skinEntry?.num ?? 0);

  return {
    version,
    championId: championEntry.id,
    championName: championEntry.name,
    skinNum,
    skinName: skinEntry?.name || championEntry.name,
    imageUrl: `${SPLASH_BASE}/${championEntry.id}_${skinNum}.jpg`,
  };
}

export function getBaseSkins(championEntry) {
  const skins = Array.isArray(championEntry?.skins) ? championEntry.skins : [];

  return skins.filter((skin) => {
    if (skin?.parentSkin) return false;

    const name = String(skin?.name || "").toLowerCase();

    if (name.includes("chroma")) return false;
    if (name.includes("variant")) return false;

    return true;
  });
}

export function createSpyImageView() {
  const zone = randomFrom(SAFE_ZONES);

  return {
    zoneKey: zone.key,
    zoneLabel: zone.label,
    originX: zone.originX,
    originY: zone.originY,

    scale: Number(randBetween(3.6, 3.15).toFixed(2)),
    blurPx: Number(randBetween(0.45, 0.8).toFixed(1)),
    translateXPercent: 0,
    translateYPercent: 0,
  };
}

export async function pickRandomLolSkinRound() {
  const version = await getLatestLolVersion();
  const championList = await getChampionList(version);
  const champions = Object.values(championList?.data || {});

  if (!champions.length) {
    throw new Error("No champions found");
  }

  const shuffledChampions = shuffle(champions);

  for (const championPick of shuffledChampions) {
    try {
      const championDetails = await getChampionDetails(version, championPick.id);
      const championData = championDetails?.data?.[championPick.id];

      if (!championData) continue;

      const skins = getBaseSkins(championData);
      if (!skins.length) continue;

      const skin = randomFrom(skins);

      return {
        modeKey: LOL_MODE_KEY,
        lolSkin: buildLolSkinAsset(version, championData, skin),
        spyImageView: createSpyImageView(),
      };
    } catch {
      // نكمل للبطل التالي
    }
  }

  throw new Error("No eligible League of Legends skins found");
}

export function getModeDefinition(modeKey) {
  return GAME_MODES.find((mode) => mode.key === modeKey) || GAME_MODES[0];
}

export function getModeLabel(modeKey) {
  return getModeDefinition(modeKey).label;
}
