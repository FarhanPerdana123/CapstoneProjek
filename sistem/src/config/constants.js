
// Jenjang pendidikan yang didukung
const LEVELS = {
  SD: "SD",
  SMP: "SMP"
};

const LEVEL_LABELS = {
  SD: "Tingkat SD (Sekolah Dasar)",
  SMP: "Tingkat SMP (Sekolah Menengah Pertama)"
};

// Tingkat kesulitan soal
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

// 4 Dimensi kognitif utama
const COGNITIVE_CATEGORIES = {
  LOGICAL: {
    key: "LOGICAL",
    name: "Logika & Pola",
    prefix: "LOG",
    description: "Kemampuan analisis pola, penalaran abstrak, dan keteraturan logika berurutan."
  },
  NUMERICAL: {
    key: "NUMERICAL",
    name: "Penalaran Numerik",
    prefix: "NUM",
    description: "Kemampuan penalaran angka, hubungan aritmatika, dan pemecahan masalah kuantitatif."
  },
  VERBAL: {
    key: "VERBAL",
    name: "Penalaran Verbal",
    prefix: "VRB",
    description: "Kemampuan memahami hubungan kata, kosa kata, analogi bahasa, dan penalaran semantik."
  },
  SPATIAL: {
    key: "SPATIAL",
    name: "Spasial & Visual",
    prefix: "SPA",
    description: "Kemampuan memvisualisasikan rotasi bentuk, hubungan ruang geometri, dan pola visual."
  }
};

// Status skrining indikator DSM-5 Kriteria A
const DSM5_STATUS = {
  INDIKASI_PERLU_ASESMEN_LANJUT: "INDIKASI_PERLU_ASESMEN_LANJUT",
  BORDERLINE_INTELLECTUAL: "BORDERLINE_INTELLECTUAL",
  SLOW_LEARNER: "SLOW_LEARNER",
  NORMAL_TYPICAL: "NORMAL_TYPICAL"
};

// Rentang Klasifikasi IQ (Berdasarkan skala Wechsler / Standar Internasional)
const IQ_CLASSIFICATIONS = [
  {
    min: 130,
    category: "Sangat Superior (Very Superior)",
    levelGrade: "A+",
    colorBadge: "#8B5CF6",
    description: "Memiliki kapasitas penalaran logika, analisis pola, dan pemecahan masalah yang sangat tinggi di atas rata-rata usianya."
  },
  {
    min: 120,
    category: "Superior",
    levelGrade: "A",
    colorBadge: "#3B82F6",
    description: "Daya tangkap konsep baru sangat cepat, penalaran logika dan pemahaman pola sangat baik."
  },
  {
    min: 110,
    category: "Rata-Rata Atas (High Average)",
    levelGrade: "B+",
    colorBadge: "#06B6D4",
    description: "Kemampuan kognitif berada di atas rata-rata, mampu memecahkan masalah kompleks dengan bimbingan minimal."
  },
  {
    min: 90,
    category: "Rata-Rata (Average)",
    levelGrade: "B",
    colorBadge: "#10B981",
    description: "Kapasitas kognitif normal dan selaras dengan tahapan perkembangan usia sekolah."
  },
  {
    min: 80,
    category: "Rata-Rata Bawah (Low Average)",
    levelGrade: "C",
    colorBadge: "#F59E0B",
    description: "Memerlukan ritme belajar yang lebih bertahap, instruksi visual yang jelas, dan pengulangan konsep dasar."
  },
  {
    min: 70,
    category: "Borderline (Batas Rendah)",
    levelGrade: "D",
    colorBadge: "#F97316",
    description: "Menunjukkan keterlambatan dalam pemrosesan informasi cepat, disarankan pendampingan belajar individual dan remedial berkala."
  },
  {
    min: 0,
    category: "Perlu Dukungan Khusus (Extremely Low)",
    levelGrade: "E",
    colorBadge: "#EF4444",
    description: "Disarankan melakukan asesmen kognitif lebih mendalam bersama psikolog pendidikan atau guru BK untuk program bimbingan khusus."
  }
];

module.exports = {
  LEVELS,
  LEVEL_LABELS,
  DIFFICULTIES,
  COGNITIVE_CATEGORIES,
  DSM5_STATUS,
  IQ_CLASSIFICATIONS
};
