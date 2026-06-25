// Génération du programme Tikrar — découpage 4 LIGNES PAR JOUR (refactor v3).
//
// Source de données : data/verses.json (KFGQPC Mushaf Madinah 1441H via MohamadHajjRabee/quran-qcf4)
// Format source : { "<surah>:<ayah>": { page: N, lines: [{line, word_start, word_end}, ...] } }
//
// Algorithme : on parcourt LES LIGNES uniques (page, line) dans l'ordre du Mushaf, et on
// regroupe par paquets de 4 → 1 jour = 4 lignes physiques consécutives. Chaque jour collecte
// la liste des versets touchés (au moins en partie) par ses 4 lignes.
//
// + 180 jours de clôture (6 mois × 30 j = 30 tours de 6 jours pour relire tout le Coran).
//
// Toutes les mécaniques Tikrar (liaison glissante, révision, tour, milestones Juz/Hizb/Rub)
// sont préservées avec les NOUVELLES formules de jours.

const fs = require('fs');

const LINES_PER_DAY = 4;
const CLOSING_TOURS = 30;
const CLOSING_DAYS = CLOSING_TOURS * 6;   // 180 jours

// ────────────────────────────────────────────────────────────────
// Données canoniques Coran (cohérentes avec l'ancien generate-program.js)
// ────────────────────────────────────────────────────────────────

const SURAH_STARTS = [
  [1, "Al-Fatihah"], [2, "Al-Baqarah"], [50, "Aal-Imran"], [77, "An-Nisa"],
  [106, "Al-Ma'idah"], [128, "Al-An'am"], [151, "Al-A'raf"], [177, "Al-Anfal"],
  [187, "At-Tawbah"], [208, "Yunus"], [221, "Hud"], [235, "Yusuf"],
  [249, "Ar-Ra'd"], [255, "Ibrahim"], [262, "Al-Hijr"], [267, "An-Nahl"],
  [282, "Al-Isra"], [293, "Al-Kahf"], [305, "Maryam"], [312, "Ta-Ha"],
  [322, "Al-Anbiya"], [332, "Al-Hajj"], [342, "Al-Mu'minun"], [350, "An-Nur"],
  [359, "Al-Furqan"], [367, "Ash-Shu'ara"], [377, "An-Naml"], [385, "Al-Qasas"],
  [396, "Al-Ankabut"], [404, "Ar-Rum"], [411, "Luqman"], [415, "As-Sajdah"],
  [418, "Al-Ahzab"], [428, "Saba"], [434, "Fatir"], [440, "Ya-Sin"],
  [446, "As-Saffat"], [453, "Sad"], [458, "Az-Zumar"], [467, "Ghafir"],
  [477, "Fussilat"], [483, "Ash-Shura"], [489, "Az-Zukhruf"], [496, "Ad-Dukhan"],
  [499, "Al-Jathiyah"], [502, "Al-Ahqaf"], [507, "Muhammad"], [511, "Al-Fath"],
  [515, "Al-Hujurat"], [518, "Qaf"], [520, "Adh-Dhariyat"], [523, "At-Tur"],
  [526, "An-Najm"], [528, "Al-Qamar"], [531, "Ar-Rahman"], [534, "Al-Waqi'ah"],
  [537, "Al-Hadid"], [542, "Al-Mujadilah"], [545, "Al-Hashr"], [549, "Al-Mumtahanah"],
  [551, "As-Saff"], [553, "Al-Jumu'ah"], [554, "Al-Munafiqun"], [556, "At-Taghabun"],
  [558, "At-Talaq"], [560, "At-Tahrim"], [562, "Al-Mulk"], [564, "Al-Qalam"],
  [566, "Al-Haqqah"], [568, "Al-Ma'arij"], [570, "Nuh"], [572, "Al-Jinn"],
  [574, "Al-Muzzammil"], [575, "Al-Muddaththir"], [577, "Al-Qiyamah"],
  [578, "Al-Insan"], [580, "Al-Mursalat"], [582, "An-Naba"], [583, "An-Nazi'at"],
  [585, "Abasa"], [586, "At-Takwir"], [587, "Al-Infitar"], [587, "Al-Mutaffifin"],
  [589, "Al-Inshiqaq"], [590, "Al-Buruj"], [591, "At-Tariq"], [591, "Al-A'la"],
  [592, "Al-Ghashiyah"], [593, "Al-Fajr"], [594, "Al-Balad"], [595, "Ash-Shams"],
  [595, "Al-Layl"], [596, "Ad-Duha"], [596, "Ash-Sharh"], [597, "At-Tin"],
  [597, "Al-Alaq"], [598, "Al-Qadr"], [598, "Al-Bayyinah"], [599, "Az-Zalzalah"],
  [599, "Al-Adiyat"], [600, "Al-Qari'ah"], [600, "At-Takathur"], [601, "Al-Asr"],
  [601, "Al-Humazah"], [601, "Al-Fil"], [602, "Quraysh"], [602, "Al-Ma'un"],
  [602, "Al-Kawthar"], [603, "Al-Kafirun"], [603, "An-Nasr"], [603, "Al-Masad"],
  [604, "Al-Ikhlas"], [604, "Al-Falaq"], [604, "An-Nas"]
];

const MEDINAN = new Set([
  "Al-Baqarah", "Aal-Imran", "An-Nisa", "Al-Ma'idah",
  "Al-Anfal", "At-Tawbah", "Al-Hajj", "An-Nur", "Al-Ahzab",
  "Muhammad", "Al-Fath", "Al-Hujurat", "Ar-Rahman",
  "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun",
  "At-Talaq", "At-Tahrim", "Al-Insan", "Al-Bayyinah",
  "Az-Zalzalah", "An-Nasr"
]);

const JUZ_STARTS = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

function getJuz(page) {
  let juz = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    if (JUZ_STARTS[i] <= page) juz = i + 1; else break;
  }
  return juz;
}

function getSurahName(surahNumber) {
  return SURAH_STARTS[surahNumber - 1][1];
}

function isMedinan(surahNumber) {
  return MEDINAN.has(getSurahName(surahNumber));
}

// ────────────────────────────────────────────────────────────────
// Chargement des données ligne/verset
// ────────────────────────────────────────────────────────────────

const versesRaw = JSON.parse(fs.readFileSync('./data/verses.json', 'utf8'));
console.log(`Loaded verses.json : ${Object.keys(versesRaw).length} versets`);

// On construit lines[] = liste ordonnée de toutes les lignes du Mushaf
//   chaque entrée = { page, line, verses: Set('s:a'), firstVerseKey: 's:a' }
// + verseToLines : pour chaque verset, la liste des (page, line) qu'il occupe

const linesMap = new Map();   // "page:line" → { page, line, verses: Set, firstSurah, firstAyah }
const verseToLines = new Map(); // "s:a" → [{page, line}, ...]

Object.keys(versesRaw).forEach(key => {
  const [s, a] = key.split(':').map(Number);
  const v = versesRaw[key];
  const occLines = [];
  v.lines.forEach(li => {
    const lkey = `${v.page}:${li.line}`;
    if (!linesMap.has(lkey)) {
      linesMap.set(lkey, { page: v.page, line: li.line, verses: new Set() });
    }
    linesMap.get(lkey).verses.add(key);
    occLines.push({ page: v.page, line: li.line });
  });
  verseToLines.set(key, occLines);
});

// Trier les lignes par (page, line) — ordre lecture du Mushaf
const sortedLines = [...linesMap.values()].sort((A, B) => {
  if (A.page !== B.page) return A.page - B.page;
  return A.line - B.line;
});

console.log(`Lignes uniques (Mushaf Madinah) : ${sortedLines.length}`);

// ────────────────────────────────────────────────────────────────
// ALGO : grouper en paquets de 4 lignes consécutives → 1 jour
// ────────────────────────────────────────────────────────────────

const memoDays = [];
for (let i = 0; i < sortedLines.length; i += LINES_PER_DAY) {
  const chunk = sortedLines.slice(i, i + LINES_PER_DAY);

  // Collecter les versets uniques touchés
  const versesTouched = new Set();
  chunk.forEach(l => l.verses.forEach(k => versesTouched.add(k)));

  // Trier les versets en ordre canonique
  const sortedVerseKeys = [...versesTouched].sort((A, B) => {
    const [sa, aa] = A.split(':').map(Number);
    const [sb, ab] = B.split(':').map(Number);
    return sa - sb || aa - ab;
  });

  // Construire les chunks par sourate (groupes consécutifs)
  const verseChunks = [];
  sortedVerseKeys.forEach(k => {
    const [s, a] = k.split(':').map(Number);
    const last = verseChunks[verseChunks.length - 1];
    if (last && last.s === s && last.t + 1 === a) {
      last.t = a;
    } else {
      verseChunks.push({ s, f: a, t: a });
    }
  });

  // Pages couvertes par le jour
  const pages = [...new Set(chunk.map(l => l.page))].sort((a, b) => a - b);
  const primaryPage = chunk[0].page;

  // Sourate primaire = celle du premier verset
  const firstVerse = sortedVerseKeys[0].split(':');
  const primarySurah = parseInt(firstVerse[0]);
  const primaryAyah = parseInt(firstVerse[1]);

  // Lignes occupées (pour debug)
  const lineLabels = chunk.map(l => `${l.page}:${l.line}`);

  memoDays.push({
    verses: verseChunks,
    pages,
    primaryPage,
    primarySurah,
    primarySourate: getSurahName(primarySurah),
    revelation: isMedinan(primarySurah) ? 'medinan' : 'makkan',
    juz: getJuz(primaryPage),
    nLines: chunk.length,
    lineLabels  // debug/info, on l'enlèvera si trop gros
  });
}

const TOTAL_MEMO = memoDays.length;
const TOTAL_DAYS = TOTAL_MEMO + CLOSING_DAYS;
const TOTAL_MEMO_TOURS = Math.max(0, Math.floor((TOTAL_MEMO - 33) / 6) + 1);

console.log(`\nTOTAL_MEMO = ${TOTAL_MEMO} jours (algo 4 lignes/jour strict)`);
console.log(`TOTAL_DAYS = ${TOTAL_DAYS} jours (incl. ${CLOSING_DAYS} de clôture)`);
console.log(`Tours mémorisation : ${TOTAL_MEMO_TOURS}`);

// ────────────────────────────────────────────────────────────────
// CONSTRUCTION du programme final avec liaison/révision/tour
// ────────────────────────────────────────────────────────────────

const program = [];

memoDays.forEach((md, idx) => {
  const day = idx + 1;

  const entry = {
    day,
    isClosing: false,
    verses: md.verses,             // [{s, f, t}, ...]
    pages: md.pages,
    mushafPage: md.primaryPage,    // pour compat ascendante avec UI Tikrar
    sourate: md.primarySourate,
    revelation: md.revelation,
    juz: md.juz,
    nLines: md.nLines
  };

  // ── Liaison (Rabt) : jours 3+, fenêtre glissante par tour ──
  if (day >= 3) {
    let liaisonStart;
    if (day < 33) {
      liaisonStart = 1;
    } else {
      const tourAtDay = Math.floor((day - 33) / 6) + 1;
      liaisonStart = 6 * tourAtDay + 1;
    }
    entry.liaisonStartDay = liaisonStart;
    entry.liaisonEndDay = day - 2;
  } else {
    entry.liaisonStartDay = 0;
    entry.liaisonEndDay = 0;
  }

  // ── Tour & Révision (Murajaa) : jours 33+ ──
  if (day >= 33) {
    const T = Math.floor((day - 33) / 6) + 1;
    const k = ((day - 33) % 6) + 1;
    const totalToRevise = Math.min(6 * T, TOTAL_MEMO);
    const perPosition = totalToRevise / 6;
    const revStart = Math.floor((k - 1) * perPosition) + 1;
    const revEnd = Math.floor(k * perPosition);

    entry.tourNumber = T;
    entry.tourDay = k;
    entry.revisionStartDay = revStart;
    entry.revisionEndDay = revEnd;
  } else {
    entry.tourNumber = 0;
    entry.tourDay = 0;
    entry.revisionStartDay = 0;
    entry.revisionEndDay = 0;
  }

  program.push(entry);
});

// ── Phase de clôture (180 jours) ──
const closingPerPosition = TOTAL_MEMO / 6;

for (let i = 0; i < CLOSING_DAYS; i++) {
  const day = TOTAL_MEMO + i + 1;
  const closingIdx = i + 1;
  const closingTour = Math.floor((closingIdx - 1) / 6) + 1;
  const k = ((closingIdx - 1) % 6) + 1;
  const revStart = Math.floor((k - 1) * closingPerPosition) + 1;
  const revEnd = Math.floor(k * closingPerPosition);

  program.push({
    day,
    isClosing: true,
    closingTour,
    closingDay: k,
    totalClosingTours: CLOSING_TOURS,
    revisionStartDay: revStart,
    revisionEndDay: revEnd
  });
}

// ── Métadata embarquée dans program.json (utilisée par l'app) ──
const meta = {
  schemaVersion: 3,
  schema: 'quadri-lignes',
  generatedAt: '2026-06-25',
  source: 'KFGQPC Mushaf Madinah 1441H via MohamadHajjRabee/quran-qcf4',
  algorithm: 'strict 4 lignes Mushaf par jour, regroupement par sourate, chunks consécutifs',
  totalMemo: TOTAL_MEMO,
  totalDays: TOTAL_DAYS,
  closingTours: CLOSING_TOURS,
  closingDays: CLOSING_DAYS,
  memoTours: TOTAL_MEMO_TOURS
};

// Output
const output = { meta, program };
fs.writeFileSync('./data/program.json', JSON.stringify(output), 'utf8');

console.log(`\n✓ Écrit ./data/program.json (${(fs.statSync('./data/program.json').size / 1024).toFixed(1)} KB)`);
console.log(`  ${program.length} entrées (${TOTAL_MEMO} mémo + ${CLOSING_DAYS} clôture)`);

// Échantillons pour vérification
console.log('\n=== Échantillons ===');
[0, 1, 2, 4, 32, 100, 200, TOTAL_MEMO - 1, TOTAL_MEMO, TOTAL_DAYS - 1].forEach(i => {
  const e = program[i];
  if (!e) return;
  if (e.isClosing) {
    console.log(`Jour ${e.day} (CLÔTURE) : tour ${e.closingTour}/30 · J${e.closingDay}/6 · révise jours ${e.revisionStartDay}→${e.revisionEndDay}`);
  } else {
    const v = e.verses.map(c => `${getSurahName(c.s)} ${c.f === c.t ? c.f : c.f + '-' + c.t}`).join(' · ');
    console.log(`Jour ${e.day.toString().padStart(4)} : ${v} | page ${e.mushafPage} | juz ${e.juz} | ${e.nLines} lignes`);
  }
});
