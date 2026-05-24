// Génération du programme Tikrar complet, conformément au PDF officiel.
// - 1206 jours de mémorisation (1 demi-page/jour, jours 1-2 = pages entières)
// - 180 jours de clôture (6 mois, rule 9) = 30 tours de 6 jours
// - Liaison glissante par tour (saute tous les 6 jours dès le jour 33)
// - Révision = plage de pages à réciter ce jour-là (selon le tour)
// - Tour numbering commence au jour 33 (= premier tour de révision)

const fs = require('fs');

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

function getSurah(page) {
  let s = SURAH_STARTS[0][1];
  for (const [sp, n] of SURAH_STARTS) {
    if (sp <= page) s = n; else break;
  }
  return s;
}
function getJuz(page) {
  let j = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    if (JUZ_STARTS[i] <= page) j = i + 1; else break;
  }
  return j;
}
function getTask(day) {
  if (day === 1) return { mushafPage: 1, half: null };
  if (day === 2) return { mushafPage: 2, half: null };
  return {
    mushafPage: Math.floor((day - 1) / 2) + 2,
    half: day % 2 === 1 ? 'm1' : 'm2'
  };
}

const TOTAL_MEMO = 1206;             // 1206 jours de mémorisation
const CLOSING_TOURS = 30;            // 30 tours de clôture (6 mois)
const CLOSING_DAYS = CLOSING_TOURS * 6;  // 180 jours
const TOTAL_DAYS = TOTAL_MEMO + CLOSING_DAYS;  // 1386

const program = [];

for (let day = 1; day <= TOTAL_DAYS; day++) {
  // ========== Phase de clôture (jours 1207-1386) ==========
  if (day > TOTAL_MEMO) {
    const closingIdx = day - TOTAL_MEMO;                    // 1..180
    const closingTour = Math.floor((closingIdx - 1) / 6) + 1; // 1..30
    const k = ((closingIdx - 1) % 6) + 1;                   // 1..6
    // Chaque tour de clôture = tout le Coran (1206 demi-tâches) réparti sur 6 jours
    const perPosition = TOTAL_MEMO / 6;                     // 201
    const revStart = Math.floor((k - 1) * perPosition) + 1;
    const revEnd = Math.floor(k * perPosition);

    program.push({
      day,
      isClosing: true,
      closingTour,
      closingDay: k,
      totalClosingTours: CLOSING_TOURS,
      revisionStartDay: revStart,
      revisionEndDay: revEnd
    });
    continue;
  }

  // ========== Phase de mémorisation (jours 1-1206) ==========
  const task = getTask(day);
  const sourate = getSurah(task.mushafPage);

  const entry = {
    day,
    isClosing: false,
    mushafPage: task.mushafPage,
    half: task.half,                           // null pour jours 1-2
    sourate,
    revelation: MEDINAN.has(sourate) ? 'medinan' : 'makkan',
    juz: getJuz(task.mushafPage)
  };

  // ----- Liaison (Rabt) — jours 3+ -----
  if (day >= 3) {
    let liaisonStart;
    if (day < 33) {
      liaisonStart = 1;                       // avant le 1ᵉʳ tour : depuis le début
    } else {
      // Saute de 6 jours à chaque nouveau tour
      const tourAtDay = Math.floor((day - 33) / 6) + 1;
      liaisonStart = 6 * tourAtDay + 1;
    }
    entry.liaisonStartDay = liaisonStart;
    entry.liaisonEndDay = day - 2;            // exclut hier (= répétition) et aujourd'hui (= mémo nouvelle)
  } else {
    entry.liaisonStartDay = 0;
    entry.liaisonEndDay = 0;
  }

  // ----- Tour & Révision (Murajaa) — jours 33+ -----
  if (day >= 33) {
    const T = Math.floor((day - 33) / 6) + 1;             // numéro du tour
    const k = ((day - 33) % 6) + 1;                       // position dans le tour (1..6)
    // Le tour T couvre l'ancienne mémorisation = jours 1 à 6T (plafonné à 1206)
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
}

fs.writeFileSync('./data/program.json', JSON.stringify(program), 'utf8');

const totalMemoTours = Math.floor((TOTAL_MEMO - 33) / 6) + 1;
console.log(`Generated ${program.length} entries (${TOTAL_MEMO} mémo + ${CLOSING_DAYS} clôture)`);
console.log(`Tours mémorisation : ${totalMemoTours}, Tours clôture : ${CLOSING_TOURS}, Total : ${totalMemoTours + CLOSING_TOURS}`);
console.log('Day 1   :', program[0]);
console.log('Day 33  :', program[32]);
console.log('Day 45  :', program[44]);
console.log('Day 1206:', program[1205]);
console.log('Day 1207:', program[1206]);
console.log('Day 1386:', program[1385]);
