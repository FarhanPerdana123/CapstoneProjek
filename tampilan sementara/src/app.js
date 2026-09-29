/**
 * Sistem Skrining Kognitif Awal Siswa (SD & SMP) - Frontend Logic
 * 
 * Modul ini mengatur seluruh alur antarmuka pengguna:
 * 1. Manajemen State & Konfigurasi API
 * 2. Autentikasi Pengguna (Login, Register, Logout, Token Storage)
 * 3. Pelaksanaan Tes Skrining (Form Siswa, Timer, Palet Soal, Ragu-ragu, Submit)
 * 4. Tampilan Hasil Diagnostik & Indikator DSM-5
 * 5. Riwayat Sesi Pengguna
 * 6. Manajemen Bank Soal (CRUD & Generator Kode Soal Otomatis)
 */

// Base URL otomatis menyesuaikan host browser atau fallback ke localhost:5000
const BASE_ORIGIN = (typeof window !== "undefined" && window.location.origin.startsWith("http"))
  ? window.location.origin
  : "http://localhost:5000";

const API_BASE = BASE_ORIGIN.includes(":5000") || !BASE_ORIGIN.includes(":") 
  ? BASE_ORIGIN 
  : "http://localhost:5000";

const API_AUTH = `${API_BASE}/api/auth`;
const API_SCREENINGS = `${API_BASE}/api/screenings`;
const API_QUESTIONS = `${API_BASE}/api/questions`;

// State terpusat aplikasi
const state = {
  currentUser: null,
  token: localStorage.getItem("auth_token") || null,
  student: { name: "", age: "", grade: "", school: "", level: "SD" },
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  doubts: new Set(),
  durationSeconds: 20 * 60,
  remainingSeconds: 20 * 60,
  timerInterval: null
};

// Pemetaan dimensi kognitif untuk UI
const categoryNameMap = {
  LOGICAL: "Logika & Pola",
  NUMERICAL: "Penalaran Numerik",
  VERBAL: "Penalaran Verbal",
  SPATIAL: "Spasial & Visual"
};

const categoryPrefixMap = {
  LOGICAL: "LOG",
  NUMERICAL: "NUM",
  VERBAL: "VRB",
  SPATIAL: "SPA"
};

const sections = {
  form: document.getElementById("section-form"),
  test: document.getElementById("section-test"),
  result: document.getElementById("section-result"),
  history: document.getElementById("section-history"),
  questions: document.getElementById("section-questions"),
  auth: document.getElementById("section-auth")
};

/**
 * Menampilkan hanya 1 seksi aktif dan menyembunyikan yang lainnya
 * @param {string} name - 'form', 'test', 'result', 'history', 'questions', 'auth'
 */
function showSection(name) {
  Object.keys(sections).forEach((key) => {
    if (sections[key]) {
      sections[key].style.display = key === name ? "block" : "none";
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Mengambil header HTTP yang menyertakan Bearer Token JWT bila ada
 * @returns {Object}
 */
function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }
  return headers;
}

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation();
  initAuthEventListeners();
  initTestEventListeners();
  initQuestionManagementListeners();
  await checkActiveSession();
});

function initNavigation() {
  document.getElementById("nav-btn-home").addEventListener("click", () => showSection("form"));
  document.getElementById("nav-btn-history").addEventListener("click", handleViewHistory);
  document.getElementById("nav-btn-questions").addEventListener("click", () => {
    showSection("questions");
    loadQuestionsTable();
  });
}

function initAuthEventListeners() {
  document.getElementById("btn-show-login").addEventListener("click", () => showAuthBox("login"));
  document.getElementById("btn-show-register").addEventListener("click", () => showAuthBox("register"));

  document.querySelectorAll(".btn-cancel-auth").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("section-auth").style.display = "none";
    });
  });

  document.getElementById("form-register").addEventListener("submit", handleRegister);
  document.getElementById("form-login").addEventListener("submit", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);
}

function showAuthBox(type) {
  document.getElementById("section-auth").style.display = "block";
  document.getElementById("box-register").style.display = type === "register" ? "block" : "none";
  document.getElementById("box-login").style.display = type === "login" ? "block" : "none";
}

async function checkActiveSession() {
  if (!state.token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch(`${API_AUTH}/me`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && (data.data || data.user)) {
      const user = data.data || data.user;
      state.currentUser = user;
      updateAuthUI(user);
    } else {
      handleLogout(false);
    }
  } catch (e) {
    console.warn("Gagal memverifikasi sesi login:", e);
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  const guestBar = document.getElementById("auth-guest");
  const userBar = document.getElementById("auth-user");

  if (user) {
    guestBar.style.display = "none";
    userBar.style.display = "block";
    document.getElementById("current-user-name").textContent = user.name;
    document.getElementById("current-user-email").textContent = user.email;
    document.getElementById("section-auth").style.display = "none";
  } else {
    guestBar.style.display = "block";
    userBar.style.display = "none";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  try {
    const res = await fetch(`${API_AUTH}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Gagal melakukan registrasi akun.");

    state.token = data.token;
    state.currentUser = data.user;
    localStorage.setItem("auth_token", data.token);

    alert(`Registrasi berhasil! Selamat datang, ${data.user.name}.`);
    updateAuthUI(data.user);
  } catch (err) {
    alert("Error Registrasi: " + err.message);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_AUTH}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Email atau password tidak cocok.");

    state.token = data.token;
    state.currentUser = data.user;
    localStorage.setItem("auth_token", data.token);

    alert(`Login berhasil! Selamat datang, ${data.user.name}.`);
    updateAuthUI(data.user);
  } catch (err) {
    alert("Error Login: " + err.message);
  }
}

function handleLogout(showAlert = true) {
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem("auth_token");
  updateAuthUI(null);
  if (showAlert) alert("Anda telah logout dari sistem.");
  showSection("form");
}

function initTestEventListeners() {
  document.getElementById("form-student").addEventListener("submit", handleStart);

  document.getElementById("btn-prev").addEventListener("click", () => {
    if (state.currentIndex > 0) renderQuestion(state.currentIndex - 1);
  });
  document.getElementById("btn-next").addEventListener("click", () => {
    if (state.currentIndex < state.questions.length - 1) renderQuestion(state.currentIndex + 1);
  });
  document.getElementById("btn-doubt").addEventListener("click", handleToggleDoubt);

  document.getElementById("btn-submit").addEventListener("click", handleSubmitTest);
  document.getElementById("btn-reset").addEventListener("click", resetApp);
}

async function handleStart(e) {
  e.preventDefault();

  const level = document.getElementById("input-level").value;
  const name = document.getElementById("input-name").value.trim();
  const age = document.getElementById("input-age").value.trim();
  const grade = document.getElementById("input-grade").value.trim();
  const school = document.getElementById("input-school").value.trim();

  if (!name) {
    alert("Nama siswa wajib diisi.");
    return;
  }

  state.student = { name, age, grade, school, level };

  try {
    const qRes = await fetch(`${API_SCREENINGS}/questions?level=${encodeURIComponent(level)}`);
    const qData = await qRes.json();
    if (!qData.success || !qData.questions || qData.questions.length === 0) {
      throw new Error(`Tidak ada soal yang tersedia untuk jenjang ${level} di database. Silakan tambahkan soal melalui menu 'Kelola Bank Soal'.`);
    }

    state.questions = qData.questions;
    state.durationSeconds = (qData.durationMinutes || 20) * 60;
    state.remainingSeconds = state.durationSeconds;

    const sRes = await fetch(`${API_SCREENINGS}/start`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(state.student)
    });
    const sData = await sRes.json();
    if (!sData.success) throw new Error(sData.message || "Gagal membuka sesi tes.");
    state.sessionId = sData.sessionId;

    document.getElementById("test-student-info").textContent = `${state.student.name} (${state.student.grade})`;
    document.getElementById("test-level-badge").textContent = qData.levelLabel || (level === "SMP" ? "Tingkat SMP" : "Tingkat SD");

    buildPalette();
    renderQuestion(0);
    startTimer();

    showSection("test");
  } catch (err) {
    alert("Perhatian: " + err.message);
  }
}

function buildPalette() {
  const container = document.getElementById("palette-container");
  container.innerHTML = "";

  state.questions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = `palette-${q.id}`;
    btn.textContent = `Soal ${idx + 1}`;
    btn.style.margin = "3px";
    btn.addEventListener("click", () => renderQuestion(idx));
    container.appendChild(btn);
  });
}

function renderQuestion(index) {
  if (index < 0 || index >= state.questions.length) return;
  state.currentIndex = index;

  const currentQ = state.questions[index];
  document.getElementById("q-number-title").textContent = `Soal ${index + 1} dari ${state.questions.length} (${currentQ.questionCode})`;
  document.getElementById("q-category").textContent = currentQ.category;
  document.getElementById("q-difficulty").textContent = currentQ.difficulty;
  document.getElementById("q-text").textContent = currentQ.questionText;

  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  const savedAnswer = state.answers[currentQ.id] || "";

  currentQ.options.forEach((opt) => {
    const p = document.createElement("p");
    const isChecked = savedAnswer === opt.label ? "checked" : "";
    p.innerHTML = `
      <label style="cursor: pointer; display: block; padding: 4px 0;">
        <input type="radio" name="opt-question-${currentQ.id}" value="${opt.label}" ${isChecked}>
        <strong>${opt.label}.</strong> ${escapeHtml(opt.text)}
      </label>
    `;

    p.querySelector("input").addEventListener("change", (e) => {
      state.answers[currentQ.id] = e.target.value;
      updateProgressUI();
    });

    optionsContainer.appendChild(p);
  });

  const btnDoubt = document.getElementById("btn-doubt");
  if (state.doubts.has(currentQ.id)) {
    btnDoubt.textContent = "Hilangkan Tanda Ragu-ragu [✓]";
  } else {
    btnDoubt.textContent = "Tandai Ragu-ragu [?]";
  }

  updateProgressUI();
}

function handleToggleDoubt() {
  const currentQ = state.questions[state.currentIndex];
  if (!currentQ) return;

  if (state.doubts.has(currentQ.id)) {
    state.doubts.delete(currentQ.id);
  } else {
    state.doubts.add(currentQ.id);
  }

  renderQuestion(state.currentIndex);
}

function updateProgressUI() {
  const answeredCount = Object.keys(state.answers).length;
  const total = state.questions.length;
  document.getElementById("test-progress").textContent = `${answeredCount} / ${total} Soal Terjawab`;

  state.questions.forEach((q, idx) => {
    const btn = document.getElementById(`palette-${q.id}`);
    if (!btn) return;

    let style = "margin: 3px; padding: 4px 8px; cursor: pointer; border-radius: 4px; ";
    if (idx === state.currentIndex) {
      style += "border: 2px solid #2563EB; ";
    } else {
      style += "border: 1px solid #D1D5DB; ";
    }

    if (state.doubts.has(q.id)) {
      style += "background: #FBBF24; color: #1F2937; font-weight: bold;";
    } else if (state.answers[q.id]) {
      style += "background: #10B981; color: white; font-weight: bold;";
    } else {
      style += "background: #F3F4F6; color: #374151;";
    }

    btn.style.cssText = style;
  });
}

function startTimer() {
  clearInterval(state.timerInterval);
  const timerElem = document.getElementById("test-timer");

  state.timerInterval = setInterval(() => {
    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      clearInterval(state.timerInterval);
      alert("Waktu pengerjaan telah habis! Jawaban Anda akan otomatis dikirim ke sistem.");
      handleSubmitTest();
      return;
    }

    const mins = Math.floor(state.remainingSeconds / 60);
    const secs = state.remainingSeconds % 60;
    timerElem.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}

async function handleSubmitTest() {
  clearInterval(state.timerInterval);

  const total = state.questions.length;
  const answeredCount = Object.keys(state.answers).length;

  if (answeredCount < total) {
    const confirmSubmit = confirm(`Anda baru mengisi ${answeredCount} dari ${total} soal. Yakin ingin mengakhiri dan mengirim tes sekarang?`);
    if (!confirmSubmit) {
      startTimer();
      return;
    }
  }

  const payloadAnswers = state.questions.map((q) => ({
    questionId: q.id,
    studentAnswer: state.answers[q.id] || ""
  }));

  try {
    const res = await fetch(`${API_SCREENINGS}/${state.sessionId}/submit`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        level: state.student.level,
        answers: payloadAnswers,
        studentInfo: state.student
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Gagal memproses scoring di backend.");

    renderResult(data.result);
    showSection("result");
  } catch (err) {
    alert("Error Submit: " + err.message);
  }
}

function renderResult(result) {
  const { student, summary, cognitiveScore, dsm5Screening, categoryBreakdown, analysis, detailedItems } = result;

  document.getElementById("res-session-id").textContent = state.sessionId || "-";
  document.getElementById("res-name").textContent = student.name;
  document.getElementById("res-level").textContent = student.levelLabel || (student.level === "SMP" ? "Tingkat SMP" : "Tingkat SD");
  document.getElementById("res-age-grade").textContent = `${student.age} Tahun / ${student.grade}`;
  document.getElementById("res-school").textContent = student.school || "-";
  document.getElementById("res-date").textContent = new Date(student.completedAt || Date.now()).toLocaleString("id-ID");

  document.getElementById("res-iq").textContent = cognitiveScore.estimatedIQ;
  document.getElementById("res-grade").textContent = cognitiveScore.levelGrade;
  document.getElementById("res-category").textContent = cognitiveScore.category;
  document.getElementById("res-correct").textContent = summary.correctCount;
  document.getElementById("res-wrong").textContent = summary.wrongCount;
  document.getElementById("res-pct").textContent = `${summary.percentage}%`;
  document.getElementById("res-desc").textContent = cognitiveScore.description;

  if (dsm5Screening) {
    document.getElementById("res-dsm5-badge").textContent = dsm5Screening.badge;
    document.getElementById("res-dsm5-title").textContent = dsm5Screening.title;
    document.getElementById("res-dsm5-desc").textContent = dsm5Screening.description;
    document.getElementById("res-dsm5-guidance").textContent = dsm5Screening.guidance || "-";
  }

  const dimTbody = document.getElementById("res-dimensions-tbody");
  dimTbody.innerHTML = "";
  categoryBreakdown.forEach((dim) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(dim.name)}</td>
      <td align="center">${dim.correctAnswers} / ${dim.totalQuestions}</td>
      <td align="center">${dim.percentage}%</td>
      <td><b>${dim.proficiency}</b></td>
    `;
    dimTbody.appendChild(tr);
  });

  const strengthsUl = document.getElementById("res-strengths");
  strengthsUl.innerHTML = "";
  analysis.strengths.forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    strengthsUl.appendChild(li);
  });

  const impUl = document.getElementById("res-improvements");
  impUl.innerHTML = "";
  analysis.areasForImprovement.forEach((a) => {
    const li = document.createElement("li");
    li.textContent = a;
    impUl.appendChild(li);
  });

  const recsOl = document.getElementById("res-recommendations");
  recsOl.innerHTML = "";
  analysis.recommendations.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    recsOl.appendChild(li);
  });

  const reviewContainer = document.getElementById("res-items-review");
  reviewContainer.innerHTML = "";
  (detailedItems || []).forEach((item, idx) => {
    const div = document.createElement("div");
    div.style.marginBottom = "14px";
    div.style.padding = "10px";
    div.style.border = "1px solid #D1D5DB";
    div.style.borderRadius = "4px";
    div.style.backgroundColor = item.isCorrect ? "#ECFDF5" : "#FEF2F2";

    const isCorrectText = item.isCorrect ? "<span style='color: #065F46; font-weight: bold;'>[BENAR]</span>" : "<span style='color: #991B1B; font-weight: bold;'>[SALAH]</span>";
    div.innerHTML = `
      <p><b>Soal ${idx + 1} (${item.questionCode}) - ${escapeHtml(item.category)}:</b> ${escapeHtml(item.questionText)}</p>
      <p>
        Status: ${isCorrectText} | 
        Jawaban Siswa: <b>${item.studentAnswer}</b> | 
        Kunci Jawaban: <b>${item.correctAnswer}</b>
      </p>
      <p><i>Pembahasan:</i> ${escapeHtml(item.explanation || "Tidak ada pembahasan khusus.")}</p>
    `;
    reviewContainer.appendChild(div);
  });
}

function resetApp() {
  clearInterval(state.timerInterval);
  state.sessionId = null;
  state.questions = [];
  state.currentIndex = 0;
  state.answers = {};
  state.doubts.clear();

  document.getElementById("form-student").reset();
  showSection("form");
}

async function handleViewHistory() {
  if (!state.token) {
    alert("Anda wajib Login terlebih dahulu untuk melihat riwayat sesi tes tersimpan.");
    showAuthBox("login");
    return;
  }

  try {
    const res = await fetch(`${API_SCREENINGS}/history`, { headers: getAuthHeaders() });
    const data = await res.json();

    const tbody = document.getElementById("history-tbody");
    tbody.innerHTML = "";

    if (!data.success || !data.data || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" align="center">Belum ada riwayat tes yang tersimpan pada akun Anda.</td></tr>`;
      showSection("history");
      return;
    }

    data.data.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.sessionId)}</td>
        <td><b>${escapeHtml(item.level || "SD")}</b></td>
        <td>${escapeHtml(item.student.name || "-")}</td>
        <td>${escapeHtml(item.student.grade || "-")}</td>
        <td>${new Date(item.completedAt).toLocaleString("id-ID")}</td>
        <td align="center"><b>${item.scoreSummary.estimatedIQ}</b></td>
        <td>${item.scoreSummary.category}</td>
        <td>${item.scoreSummary.dsm5Status || "-"}</td>
        <td><button type="button" class="btn-load-result" data-id="${item.sessionId}">Lihat Hasil</button></td>
      `;

      tr.querySelector(".btn-load-result").addEventListener("click", () => {
        loadSessionResult(item.sessionId);
      });

      tbody.appendChild(tr);
    });

    showSection("history");
  } catch (err) {
    alert("Gagal memuat riwayat: " + err.message);
  }
}

async function loadSessionResult(sessionId) {
  try {
    const res = await fetch(`${API_SCREENINGS}/${sessionId}/result`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.result) {
      state.sessionId = sessionId;
      renderResult(data.result);
      showSection("result");
    } else {
      alert(data.message || "Tidak dapat memuat detail hasil tes.");
    }
  } catch (err) {
    alert("Error memuat detail sesi: " + err.message);
  }
}

/**
 * Generate kode soal otomatis (SD-LOG-xx, SMP-NUM-xx)
 * Menyesuaikan pilihan jenjang & dimensi kognitif saat ini
 * @param {boolean} force - Paksa generate meskipun sedang mode edit
 */
async function autoGenerateQuestionCode(force = false) {
  const id = document.getElementById("input-q-id").value;
  // Jika sedang edit soal lama dan bukan klik tombol manual 'Generate Kode', jangan timpa
  if (id && !force) return;

  const level = document.getElementById("input-q-level").value || "SD";
  const catKey = document.getElementById("input-q-cat-key").value || "LOGICAL";
  const codeInput = document.getElementById("input-q-code");

  try {
    const res = await fetch(`${API_QUESTIONS}/generate-code?level=${encodeURIComponent(level)}&categoryKey=${encodeURIComponent(catKey)}`);
    const data = await res.json();
    if (data.success && data.data && data.data.code) {
      codeInput.value = data.data.code;
      return;
    }
  } catch (err) {
    console.warn("Gagal request generator kode via API, menggunakan fallback client:", err);
  }

  // Fallback lokal client jika endpoint API offline
  const catCode = categoryPrefixMap[catKey] || (catKey.length >= 3 ? catKey.slice(0, 3) : "GEN");
  const prefix = `${level}-${catCode}-`;
  const existingCodes = Array.from(document.querySelectorAll("#questions-tbody tr"))
    .map((tr) => (tr.children[1] ? tr.children[1].textContent.trim() : ""))
    .filter((c) => c.startsWith(prefix));

  let maxNum = 0;
  existingCodes.forEach((c) => {
    const m = c.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  codeInput.value = `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
}

function initQuestionManagementListeners() {
  document.getElementById("btn-show-add-question").addEventListener("click", () => showQuestionForm(null));
  document.getElementById("btn-cancel-question").addEventListener("click", () => {
    document.getElementById("box-question-form").style.display = "none";
  });

  // Listener untuk generate kode otomatis saat jenjang atau dimensi kognitif diubah
  document.getElementById("btn-generate-code").addEventListener("click", () => autoGenerateQuestionCode(true));
  document.getElementById("input-q-level").addEventListener("change", () => autoGenerateQuestionCode(false));
  document.getElementById("input-q-cat-key").addEventListener("change", () => autoGenerateQuestionCode(false));

  document.getElementById("form-manage-question").addEventListener("submit", handleSaveQuestion);
  document.getElementById("btn-refresh-questions").addEventListener("click", loadQuestionsTable);
  document.getElementById("filter-question-level").addEventListener("change", loadQuestionsTable);
  document.getElementById("filter-question-search").addEventListener("input", debounce(loadQuestionsTable, 350));
}

async function loadQuestionsTable() {
  const level = document.getElementById("filter-question-level").value;
  const search = document.getElementById("filter-question-search").value.trim();

  let url = `${API_QUESTIONS}?`;
  if (level) url += `level=${encodeURIComponent(level)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const tbody = document.getElementById("questions-tbody");
    tbody.innerHTML = "";

    if (!data.success || !data.data || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" align="center" style="padding: 16px; color: #6B7280;">Tidak ada soal yang ditemukan dalam database. Klik <b>➕ Tambah Soal Baru</b> untuk menambahkan.</td></tr>`;
      return;
    }

    data.data.forEach((q) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td align="center">${q.id}</td>
        <td><b>${escapeHtml(q.questionCode)}</b></td>
        <td align="center"><span style="background: #E0F2FE; color: #0369A1; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${q.level}</span></td>
        <td>${escapeHtml(q.category)}</td>
        <td align="center">${q.difficulty}</td>
        <td>${escapeHtml(q.questionText)}</td>
        <td align="center"><b>${q.correctAnswer}</b></td>
        <td align="center" style="white-space: nowrap;">
          <button type="button" class="btn-edit-q" data-id="${q.id}">Edit</button>
          <button type="button" class="btn-del-q" data-id="${q.id}" data-code="${escapeHtml(q.questionCode)}" style="color: red; margin-left: 4px;">Hapus</button>
        </td>
      `;

      tr.querySelector(".btn-edit-q").addEventListener("click", () => handleEditQuestion(q));
      tr.querySelector(".btn-del-q").addEventListener("click", () => handleDeleteQuestion(q.id, q.questionCode));

      tbody.appendChild(tr);
    });
  } catch (err) {
    alert("Gagal memuat bank soal: " + err.message);
  }
}

function showQuestionForm(question = null) {
  const box = document.getElementById("box-question-form");
  const form = document.getElementById("form-manage-question");
  const title = document.getElementById("question-form-title");

  form.reset();

  if (question) {
    title.textContent = `Edit Soal (ID: ${question.id} - ${question.questionCode})`;
    document.getElementById("input-q-id").value = question.id;
    document.getElementById("input-q-code").value = question.questionCode;
    document.getElementById("input-q-level").value = question.level;
    document.getElementById("input-q-cat-key").value = question.categoryKey || "LOGICAL";
    document.getElementById("input-q-difficulty").value = question.difficulty;
    document.getElementById("input-q-text").value = question.questionText;

    const optMap = {};
    (question.options || []).forEach((opt) => {
      optMap[opt.label] = opt.text;
    });

    document.getElementById("input-opt-a").value = optMap["A"] || "";
    document.getElementById("input-opt-b").value = optMap["B"] || "";
    document.getElementById("input-opt-c").value = optMap["C"] || "";
    document.getElementById("input-opt-d").value = optMap["D"] || "";
    document.getElementById("input-q-correct").value = question.correctAnswer || "A";
    document.getElementById("input-q-explanation").value = question.explanation || "";
  } else {
    title.textContent = "➕ Tambah Soal Baru";
    document.getElementById("input-q-id").value = "";
    document.getElementById("input-q-level").value = "SD";
    document.getElementById("input-q-cat-key").value = "LOGICAL";
    document.getElementById("input-q-difficulty").value = "EASY";
    document.getElementById("input-q-correct").value = "A";
    autoGenerateQuestionCode(true);
  }

  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth" });
}

function handleEditQuestion(question) {
  showQuestionForm(question);
}

async function handleSaveQuestion(e) {
  e.preventDefault();

  const id = document.getElementById("input-q-id").value;
  const questionCode = document.getElementById("input-q-code").value.trim();
  const level = document.getElementById("input-q-level").value;
  const categoryKey = document.getElementById("input-q-cat-key").value;
  const category = categoryNameMap[categoryKey] || "Umum";
  const difficulty = document.getElementById("input-q-difficulty").value;
  const questionText = document.getElementById("input-q-text").value.trim();
  const optA = document.getElementById("input-opt-a").value.trim();
  const optB = document.getElementById("input-opt-b").value.trim();
  const optC = document.getElementById("input-opt-c").value.trim();
  const optD = document.getElementById("input-opt-d").value.trim();
  const correctAnswer = document.getElementById("input-q-correct").value;
  const explanation = document.getElementById("input-q-explanation").value.trim();

  const options = [
    { label: "A", text: optA },
    { label: "B", text: optB },
    { label: "C", text: optC },
    { label: "D", text: optD }
  ];

  const payload = {
    questionCode,
    level,
    categoryKey,
    category,
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation,
    scoreWeight: 1
  };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_QUESTIONS}/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(API_QUESTIONS, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Gagal menyimpan data soal.");

    alert(id ? "Soal berhasil diperbarui di database!" : "Soal baru berhasil ditambahkan ke database!");
    document.getElementById("box-question-form").style.display = "none";
    loadQuestionsTable();
  } catch (err) {
    alert("Error Simpan Soal: " + err.message);
  }
}

async function handleDeleteQuestion(id, code) {
  const confirmDel = confirm(`Yakin ingin menghapus soal [${code}] (ID: ${id}) dari database?`);
  if (!confirmDel) return;

  try {
    const res = await fetch(`${API_QUESTIONS}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Gagal menghapus soal.");

    alert(`Soal ${code} berhasil dihapus.`);
    loadQuestionsTable();
  } catch (err) {
    alert("Error Hapus Soal: " + err.message);
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
