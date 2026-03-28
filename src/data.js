export const SPY_DATA = {
  categories: [
    { key: "places", label: "أماكن عامة" },
    { key: "foods", label: "أكلات سورية" },
    { key: "animals", label: "حيوانات" },
    { key: "objects", label: "أشياء (جماد)" },
    { key: "countries", label: "بلاد" },
    { key: "lol_champions", label: "شخصيات ليج أوف ليجيند" },
    { key: "video_games", label: "ألعاب فيديو" },
    { key: "RTN", label: " RTN Discord" },

  ],
  items: {
    places: ["مستشفى","صيدلية","عيادة","مدرسة","جامعة","مكتبة عامة","حديقة عامة","سوق شعبي",
        "سوبرماركت","مطعم","مقهى","محطة وقود","كراج","بنك","قسم شرطة","سينما","متحف","مدينة ملاهي"
      ],

    foods: ["شاورما","فلافل","حمص","متبل","تبولة","فتوش","كبة","يبرق","محشي","مجدرة","فريكة","مقلوبة",
        "مناقيش زعتر","مناقيش جبنة","صفيحة","شيش برك","كباب حلبي","كنافة","معمول","متة","عرقسوس"
      ],

    animals: ["قط","كلب","حصان","حمار","جمل","غزال","ذئب","ثعلب","أسد","نمر","فهد","ضبع","دب","أرنب",
        "خروف","ماعز","بقرة","زرافة","فيل","كنغر","دجاجة","بطة","حمامة","صقر","بومة","سمكة","قرش",
        "دلفين","سلحفاة","ثعبان","ضفدع"
      ],

    objects: ["مفتاح","هاتف","شاحن","سماعة","كرسي","طاولة","كنباية","مخدة","بطانية","مروحة",
        "براد","غاز","فرن","غسالة","صحن","كاسة","ملعقة","سكين","طنجرة","دفتر","قلم","كتاب",
        "حقيبة","نظارة","ساعة","محفظة","مقص","شريط لاصق","ولاعة"
      ],

    countries: ["سوريا","لبنان","الأردن","فلسطين","العراق","مصر","السعودية","الإمارات","قطر",
        "الكويت","تركيا","إيران","فرنسا","ألمانيا","إيطاليا","إسبانيا","بريطانيا","روسيا","الهند"
        ,"الصين","اليابان","أستراليا","كندا","الولايات المتحدة","البرازيل","جنوب أفريقيا","نيجيريا"
      ],

    lol_champions: ["Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie", "Aphelios", "Ashe", "Aurelion Sol", "Aurora", "Azir", "Bard", "Bel'Veth", "Blitzcrank", "Brand", "Braum", "Briar", "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki", "Darius", "Diana", "Dr. Mundo", "Draven", "Ekko", "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern", "Janna", "Jarvan IV", "Jax", "Jayce", "Jhin", "Jinx", "K'Sante", "Kai'Sa", "Kalista", "Karma", "Karthus", "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw", "LeBlanc", "Lee Sin", "Leona", "Lillia", "Lissandra", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai", "Master Yi", "Mel", "Milio", "Miss Fortune", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus", "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu & Willump", "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy", "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "Rek'Sai", "Rell", "Renata Glasc", "Renekton", "Rengar", "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain", "Sylas", "Syndra", "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle", "Tryndamere", "Twisted Fate", "Twitch", "Udyr", "Urgot", "Varus", "Vayne", "Veigar", "Vel'Koz", "Vex", "Vi", "Viego", "Viktor", "Vladimir", "Volibear", "Warwick", "Wukong", "Xayah", "Xerath", "Xin Zhao", "Yasuo", "Yone", "Yorick", "Yunara", "Zaahen", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra","yummi",

    ],

    video_games: [
      "Grand Theft Auto", "Call of Duty", "Battlefield", "Counter-Strike", "Valorant", "League of Legends", "Dota", "Minecraft", "Fortnite", "Roblox", "EA Sports FC", "PUBG", "Apex Legends", "Overwatch", "Rainbow Six Siege", "Rocket League", "Mario", "Pokémon", "The Legend of Zelda", "Sonic the Hedgehog", "Crash Bandicoot", "God of War", "The Last of Us", "Uncharted", "Red Dead Redemption", "Assassin's Creed", "Far Cry", "Resident Evil", "Silent Hill", "Tomb Raider", "Metal Gear Solid", "Final Fantasy", "Kingdom Hearts", "Elden Ring", "Dark Souls", "Sekiro", "Bloodborne", "The Witcher", "Cyberpunk 2077", "Diablo", "World of Warcraft","Halo", "Forza", "Need for Speed", "Gran Turismo", "The Sims", "Terraria", "Among Us", "Fall Guys", "Dead by Daylight", "Monster Hunter", "Street Fighter", "Mortal Kombat", "Tekken", "Dragon Ball", "Naruto", "Yu-Gi-Oh!", "Destiny 2", "Warframe", "Paladins", "Brawl Stars", "Clash of Clans", "Clash Royale", "Subway Surfers", "Temple Run", "Five Nights at Freddy's", "Phasmophobia", "Left 4 Dead", "Portal", "Half-Life", "Watch Dogs", "Hitman", "Mafia", "Max Payne", "Prince of Persia", "Borderlands", "Cuphead", "Hollow Knight", "Hades", "Stardew Valley", "Sea of Thieves", "Fallout", "Skyrim", "Doom",   "Ghost of Tsushima", "Spider-Man", "Alan Wake", "Control", "Undertale", "Genshin Impact", "Honkai: Star Rail", "Path of Exile","Clair Obscur: Expedition 33", "ARC Raiders", "Lost Ark", "Apex Legends", "Marvel Rivals", "R.E.P.O.", "Rust", "Valheim", "Path of Exile 2", "Arena Breakout: Infinite", "Back 4 Blood", "It Takes Two", "Raft", "Serious Sam", "A Way Out", "Forza Horizon", "Baldur's Gate", "Black Myth: Wukong", "Horizon Forbidden West", "Squad", "Euro Truck Simulator", "Hogwarts Legacy","The Crew","Split Fiction","Shape of Dreams","Naraka","The Finals","Escape Simulator","Batman","The First Descendant","Stellar Blade",
    ],

    RTN: [
       "Fady","Raphael","Toxic","Torres","aztic","ken","abu 3day","Octane","Killerino","disaster",
    "7Disaster",
    "Taric",
    "Dante",
    "Rnno",
    "Safaa",
    "Nero",
    "Sherko",
    "ziad(july)",
    "Rave",
    "MrDara",
    "Gaith",
    "Ramez",
    "Syrian",
    "Crazy",
    "Noaim",
    "Joker",
    "Musician(المتغزل الحنون)",
    "Hassan",
    "Aram",
    "Tmsah",
    "NorthWind",
    "hyani",
    "Khaled",
    "Moner",
    "Kopra",
    "Raj",
    "bu Rifaat",
    "Abo Nabil",
    "AhmadHm",
    "Al7ara",
    "Wizard",
    "Alqesar",
    "Deathstroke",
    "George",
    "Ghost",
    "Horseman(omar)",
    "Phoneix",
    "Revolution",
    "Kingo",
    "Mosa",
    "Nasar",
    "Choniki",
    "dunno",
    "Semoz"

    ],
  },
};