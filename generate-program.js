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

const LINES_PER_DAY = 4;          // cible quotidienne
const MAX_LINES_PER_DAY = 6;      // tolérance haute (pour grouper versets entiers)
const SOLO_VERSE_THRESHOLD = 4;   // verset ≥ N lignes = 1 jour dédié (assez long pour être seul)
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
// ALGO V2 : par VERSET (chaque verset = 1 seul jour, pas de doublon)
// ────────────────────────────────────────────────────────────────
// - On parcourt les versets en ordre canonique (1:1 → 114:6)
// - On accumule jusqu'à atteindre ~4 lignes
// - Verset > 4 lignes (rare, ex 2:282) → ceil(n/4) jours dédiés avec
//   metadata « part X / total » pour indiquer la portion
// - Verset entier respecté : jamais coupé entre 2 jours sauf si > 4 lignes

// Construire ordre canonique des versets avec leur metadata
// IMPORTANT : on garde les lignes RÉELLES (page:line) pour pouvoir compter les LIGNES UNIQUES
// (versets adjacents partagent souvent une ligne — exemple : 2:1 finit ligne 3, 2:2 commence ligne 3)
const orderedVerses = [];
const allKeys = Object.keys(versesRaw).sort((A, B) => {
  const [sa, aa] = A.split(':').map(Number);
  const [sb, ab] = B.split(':').map(Number);
  return sa - sb || aa - ab;
});
allKeys.forEach(k => {
  const [s, a] = k.split(':').map(Number);
  const v = versesRaw[k];
  const lineKeys = v.lines.map(l => `${v.page}:${l.line}`);
  orderedVerses.push({
    s, a,
    page: v.page,
    nLines: v.lines.length,           // # lignes occupées (avec partage potentiel)
    lineKeys                            // ["page:line", ...] pour calcul unique
  });
});

const memoDays = [];

// ────────────────────────────────────────────────────────────────
// CAS SPÉCIAL : Al-Fatihah (sourate 1) = TOUTE la sourate en 1 seul jour
// ────────────────────────────────────────────────────────────────
const fatihaVerses = orderedVerses.filter(v => v.s === 1);
if (fatihaVerses.length > 0) {
  const fatihaLineSet = new Set();
  fatihaVerses.forEach(v => v.lineKeys.forEach(k => fatihaLineSet.add(k)));
  memoDays.push({
    verses: [{ s: 1, f: 1, t: fatihaVerses[fatihaVerses.length - 1].a }],
    pages: [1],
    primaryPage: 1,
    primarySurah: 1,
    primarySourate: 'Al-Fatihah',
    revelation: 'makkan',
    juz: 1,
    nLines: fatihaLineSet.size,
    wholeSurah: true
  });
}

// ────────────────────────────────────────────────────────────────
// ALGO PER-PAGE avec PARTITION DP optimale
// Pour chaque page : trouve la partition minimisant la déviation
// quadratique au target 4 lignes/jour. Pas d'orphelins, équilibré.
// ────────────────────────────────────────────────────────────────

// Grouper versets par page (en sautant Al-Fatihah déjà traitée)
const versesByPage = {};
for (const v of orderedVerses) {
  if (v.s === 1) continue;
  if (!versesByPage[v.page]) versesByPage[v.page] = [];
  versesByPage[v.page].push(v);
}

// DP : partition optimale d'une liste de versets courts/moyens (≤ MAX_LINES)
// Coût d'un groupe = (nLines - LINES_PER_DAY)²
// Coût total minimisé = répartition la plus proche du target sans orphelins
function dpPartition(verses) {
  const n = verses.length;
  if (n === 0) return [];

  // uniqueLines(j, i) = nb lignes uniques du sous-ensemble [j..i-1]
  const uniqueLines = (j, i) => {
    const s = new Set();
    for (let k = j; k < i; k++) verses[k].lineKeys.forEach(lk => s.add(lk));
    return s.size;
  };

  // dp[i] = { cost, prev } : coût min pour partitionner verses[0..i-1]
  const dp = new Array(n + 1).fill(null);
  dp[0] = { cost: 0, prev: -1 };

  for (let i = 1; i <= n; i++) {
    for (let j = i - 1; j >= 0; j--) {
      const lines = uniqueLines(j, i);
      if (lines > MAX_LINES_PER_DAY) break;   // groupe trop grand, et tout groupe plus large sera pire
      const dev = lines - LINES_PER_DAY;
      const groupCost = dev * dev;
      const total = dp[j].cost + groupCost;
      if (dp[i] === null || total < dp[i].cost) {
        dp[i] = { cost: total, prev: j };
      }
    }
  }

  // Reconstruction
  const groups = [];
  let i = n;
  while (i > 0) {
    const j = dp[i].prev;
    const groupVerses = verses.slice(j, i);
    const lineSet = new Set();
    groupVerses.forEach(v => v.lineKeys.forEach(lk => lineSet.add(lk)));
    groups.unshift({ verses: groupVerses, nLines: lineSet.size });
    i = j;
  }
  return groups;
}

// Planifier une page : versets longs (>MAX) en jours dédiés, le reste via DP
function planPage(pageNum, verses) {
  const days = [];
  let buffer = [];

  function flushBuffer() {
    if (buffer.length === 0) return;
    const subgroups = dpPartition(buffer);
    subgroups.forEach(g => {
      days.push({
        verses: g.verses,
        nLines: g.nLines,
        page: pageNum
      });
    });
    buffer = [];
  }

  for (const v of verses) {
    if (v.nLines > MAX_LINES_PER_DAY) {
      // Verset très long : flush buffer + jours dédiés
      flushBuffer();
      const numDays = Math.ceil(v.nLines / LINES_PER_DAY);
      for (let d = 0; d < numDays; d++) {
        const linesThisDay = (d === numDays - 1)
          ? v.nLines - (numDays - 1) * LINES_PER_DAY
          : LINES_PER_DAY;
        days.push({
          verses: [v],
          nLines: linesThisDay,
          page: pageNum,
          longVerse: { part: d + 1, of: numDays }
        });
      }
    } else {
      buffer.push(v);
    }
  }
  flushBuffer();

  return days;
}

// Itérer sur les pages dans l'ordre
const pageNums = Object.keys(versesByPage).map(Number).sort((a, b) => a - b);
for (const pageNum of pageNums) {
  const dayPlans = planPage(pageNum, versesByPage[pageNum]);
  dayPlans.forEach(dp => {
    // Construire chunks consécutifs par sourate
    const chunks = [];
    dp.verses.forEach(v => {
      const last = chunks[chunks.length - 1];
      if (last && last.s === v.s && last.t + 1 === v.a) last.t = v.a;
      else chunks.push({ s: v.s, f: v.a, t: v.a });
    });
    const primary = dp.verses[0];
    const day = {
      verses: chunks,
      pages: [pageNum],
      primaryPage: pageNum,
      primarySurah: primary.s,
      primarySourate: getSurahName(primary.s),
      revelation: isMedinan(primary.s) ? 'medinan' : 'makkan',
      juz: getJuz(pageNum),
      nLines: dp.nLines
    };
    if (dp.longVerse) day.longVerse = dp.longVerse;
    memoDays.push(day);
  });
}

// Renuméroter les jours
memoDays.forEach((d, i) => { d.day = i + 1; });

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
  if (md.longVerse) entry.longVerse = md.longVerse;  // verset long split sur N jours
  if (md.wholeSurah) entry.wholeSurah = true;        // sourate entière en 1 jour (Al-Fatihah)

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
