
const {
  LEVELS,
  LEVEL_LABELS,
  COGNITIVE_CATEGORIES,
  IQ_CLASSIFICATIONS,
  DSM5_STATUS
} = require("../config/constants");

class ScoringService {
    static evaluateTest(submittedAnswers = [], studentInfo = {}, level = LEVELS.SD, bankSoal = []) {
    const jenjang = String(level || studentInfo.level || LEVELS.SD).toUpperCase().trim();
    const jenjangValid = jenjang === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;

    // Pemetaan jawaban siswa berdasarkan ID soal
    const answerMap = new Map();
    (submittedAnswers || []).forEach((ans) => {
      if (ans && ans.questionId !== undefined) {
        answerMap.set(Number(ans.questionId), String(ans.studentAnswer || "").trim().toUpperCase());
      }
    });

    let benar = 0;
    let salah = 0;
    let kosong = 0;
    let skorMentah = 0;
    let skorMaksimal = 0;

    // Inisialisasi breakdown per dimensi kognitif
    const kategori = {};
    Object.keys(COGNITIVE_CATEGORIES).forEach((key) => {
      const cat = COGNITIVE_CATEGORIES[key];
      kategori[cat.key] = {
        key: cat.key,
        name: cat.name,
        total: 0,
        correct: 0,
        score: 0
      };
    });

    const reviewSoal = (bankSoal || []).map((q) => {
      const jawabanSiswa = answerMap.get(Number(q.id)) || "";
      const diisi = Boolean(jawabanSiswa);
      const statusBenar = diisi && jawabanSiswa === String(q.correctAnswer || "").trim().toUpperCase();
      const bobot = Number(q.scoreWeight) || 1;

      skorMaksimal += bobot;

      const catKey = (q.categoryKey || "LOGICAL").toUpperCase().trim();
      if (!kategori[catKey]) {
        kategori[catKey] = {
          key: catKey,
          name: q.category || catKey,
          total: 0,
          correct: 0,
          score: 0
        };
      }
      kategori[catKey].total += 1;

      if (statusBenar) {
        benar += 1;
        skorMentah += bobot;
        kategori[catKey].correct += 1;
        kategori[catKey].score += bobot;
      } else if (diisi) {
        salah += 1;
      } else {
        kosong += 1;
      }

      return {
        questionId: q.id,
        questionCode: q.questionCode,
        category: q.category,
        categoryKey: q.categoryKey,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: q.options || [],
        studentAnswer: jawabanSiswa || "-",
        correctAnswer: q.correctAnswer,
        isCorrect: statusBenar,
        isAnswered: diisi,
        scoreEarned: statusBenar ? bobot : 0,
        explanation: q.explanation || ""
      };
    });

    const totalSoal = (bankSoal || []).length;
    const persentase = skorMaksimal > 0 ? Math.round((skorMentah / skorMaksimal) * 100) : 0;
    
    // Formula estimasi IQ deterministik (Rentang: 65 - 135)
    // 0% -> 65, 50% -> 100 (rata-rata), 100% -> 135
    const estimasiIQ = Math.round(65 + (persentase * 0.70));
    const klasifikasi = this.getKlasifikasiIQ(estimasiIQ);

    const categoryBreakdown = Object.values(kategori).map((cat) => {
      const catPct = cat.total > 0 ? Math.round((cat.correct / cat.total) * 100) : 0;
      let proficiency = "Perlu Peningkatan";
      let statusColor = "#EF4444";

      if (catPct >= 75) {
        proficiency = "Sangat Baik";
        statusColor = "#10B981";
      } else if (catPct >= 50) {
        proficiency = "Cukup Baik";
        statusColor = "#F59E0B";
      }

      return {
        key: cat.key,
        name: cat.name,
        totalQuestions: cat.total,
        correctAnswers: cat.correct,
        percentage: catPct,
        proficiency,
        statusColor
      };
    });

    const dsm5Indicator = this.cekIndikatorDSM5(estimasiIQ, jenjangValid);
    const kekuatan = categoryBreakdown.filter((c) => c.percentage >= 70).map((c) => c.name);
    const kebutuhanDukungan = categoryBreakdown.filter((c) => c.percentage < 50).map((c) => c.name);
    const saran = this.buatSaranBelajar(klasifikasi.category, kekuatan, kebutuhanDukungan, jenjangValid);

    return {
      student: {
        name: studentInfo.name || "Siswa",
        age: studentInfo.age || "-",
        grade: studentInfo.grade || "-",
        school: studentInfo.school || "-",
        level: jenjangValid,
        levelLabel: LEVEL_LABELS[jenjangValid] || jenjangValid,
        completedAt: new Date().toISOString()
      },
      summary: {
        totalQuestions: totalSoal,
        answeredCount: (submittedAnswers || []).length,
        correctCount: benar,
        wrongCount: salah,
        unansweredCount: kosong,
        rawScore: skorMentah,
        maxPossibleScore: skorMaksimal,
        percentage: persentase
      },
      cognitiveScore: {
        estimatedIQ: estimasiIQ,
        category: klasifikasi.category,
        description: klasifikasi.description,
        levelGrade: klasifikasi.levelGrade,
        colorBadge: klasifikasi.colorBadge
      },
      dsm5Screening: dsm5Indicator,
      categoryBreakdown,
      analysis: {
        strengths: kekuatan.length > 0 ? kekuatan : ["Perlu latihan berkala di seluruh dimensi kognitif"],
        areasForImprovement: kebutuhanDukungan.length > 0 ? kebutuhanDukungan : ["Seluruh dimensi kognitif berada di atas batas minimal"],
        recommendations: saran
      },
      detailedItems: reviewSoal
    };
  }

    static getKlasifikasiIQ(iq) {
    for (const item of IQ_CLASSIFICATIONS) {
      if (iq >= item.min) {
        return {
          category: item.category,
          levelGrade: item.levelGrade,
          colorBadge: item.colorBadge,
          description: item.description
        };
      }
    }
    // Fallback terendah
    const lowest = IQ_CLASSIFICATIONS[IQ_CLASSIFICATIONS.length - 1];
    return {
      category: lowest.category,
      levelGrade: lowest.levelGrade,
      colorBadge: lowest.colorBadge,
      description: lowest.description
    };
  }

    static cekIndikatorDSM5(iq, level = LEVELS.SD) {
    if (iq < 70) {
      return {
        status: DSM5_STATUS.INDIKASI_PERLU_ASESMEN_LANJUT,
        badge: "Perlu Asesmen Lanjutan (Skor < 70)",
        title: "Indikasi Awal Potensi Hambatan Fungsi Intelektual (DSM-5 Kriteria A)",
        description: `Skor estimasi (${iq}) berada pada rentang < 70. Berdasarkan kriteria DSM-5, skor di bawah 70 merupakan indikasi awal perlunya pemeriksaan lanjutan fungsi intelektual dan perilaku adaptif.`,
        guidance: "Rekomendasi Rujukan: Arahkan siswa ke Psikolog Pendidikan / Guru BK / Dokter Anak untuk asesmen inteligensi formal (WISC/WAIS) dan penilaian fungsi adaptif secara komprehensif. Hasil ini adalah instrumen skrining awal, bukan diagnosis klinis final.",
        isReferralRecommended: true
      };
    }

    if (iq <= 79) {
      return {
        status: DSM5_STATUS.BORDERLINE_INTELLECTUAL,
        badge: "Fungsi Ambang Bawah / Borderline (Skor 70-79)",
        title: "Fungsi Intelektual Ambang Bawah (Borderline Intellectual Functioning)",
        description: `Skor skrining siswa (${iq}) berada pada rentang Borderline. Siswa mungkin membutuhkan waktu pemahaman lebih panjang pada materi konsep abstrak di jenjang ${level}.`,
        guidance: "Saran Pedagogik: Terapkan bimbingan belajar remedial, instruksi konkret langkah demi langkah, dan pemantauan perkembangan secara berkala di kelas.",
        isReferralRecommended: false
      };
    }

    if (iq <= 89) {
      return {
        status: DSM5_STATUS.SLOW_LEARNER,
        badge: "Rata-Rata Bawah (Slow Learner)",
        title: "Potensi Belajar Lambat (Slow Learner)",
        description: `Skor skrining siswa (${iq}) berada pada batas rata-rata bawah. Siswa dapat mengikuti kurikulum ${level} dengan ritme pembelajaran yang lebih bertahap.`,
        guidance: "Saran Pedagogik: Berikan latihan pengulangan berkala, penguatan konsep dasar, dan perbanyak media pembelajaran visual interaktif.",
        isReferralRecommended: false
      };
    }

    return {
      status: DSM5_STATUS.NORMAL_TYPICAL,
      badge: "Kapasitas Kognitif Normal",
      title: "Fungsi Kognitif Selaras Tahap Perkembangan Usia",
      description: `Skor kognitif siswa (${iq}) berada dalam batas normal. Tidak ditemukan indikasi hambatan fungsi intelektual.`,
      guidance: "Saran Pedagogik: Lanjutkan pembelajaran aktif dan berikan pengayaan materi sesuai minat dan bakat siswa.",
      isReferralRecommended: false
    };
  }

    static buatSaranBelajar(kategoriIQ, kekuatan, kelemahan, level) {
    const saran = [];

    if (kategoriIQ.includes("Superior")) {
      saran.push(`Berikan materi pengayaan dan tantangan pemecahan masalah yang lebih kompleks sesuai tingkat ${level}.`);
      saran.push("Arahkan siswa untuk mengikuti proyek eksplorasi mandiri atau kompetisi sains/logika.");
    } else if (kategoriIQ.includes("Rata-Rata")) {
      saran.push(`Pertahankan konsistensi belajar di tingkat ${level} dengan kombinasi diskusi interaktif dan latihan soal berkala.`);
      saran.push("Latih siswa untuk membuat ringkasan konsep mandiri dengan teknik peta konsep (mind mapping).");
    } else {
      saran.push("Gunakan metode belajar multisensori (visual gambar, audio penjelasan, dan demonstrasi benda konkret).");
      saran.push("Bagi materi pembelajaran kompleks menjadi segmen-segmen kecil (micro-learning) agar lebih mudah dicerna.");
      saran.push("Diskusikan hasil asesmen skrining awal ini dengan orang tua dan guru bimbingan konseling (BK).");
    }

    if (kelemahan.includes("Penalaran Numerik")) {
      saran.push("Perbanyak latihan dasar hitungan kuantitatif melalui studi kasus praktis kehidupan sehari-hari.");
    }
    if (kelemahan.includes("Spasial & Visual")) {
      saran.push("Asah pemahaman ruang dan bentuk melalui latihan gambar geometri, diagram alur, dan puzzle visual.");
    }
    if (kelemahan.includes("Penalaran Verbal")) {
      saran.push("Tingkatkan minat literasi membaca buku bacaan atau artikel edukatif untuk memperluas kosa kata dan sinonim.");
    }
    if (kelemahan.includes("Logika & Pola")) {
      saran.push("Latih logika berpikir sebab-akibat dan urutan deret dengan teka-teki logika atau permainan strategi ringan.");
    }

    return saran;
  }
}

module.exports = ScoringService;
