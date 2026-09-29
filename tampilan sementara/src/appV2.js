/**
 * Sistem Skrining Kognitif V2 - Multi-Sekolah, PIN-Based, Role-Based
 * 
 * Features:
 * - Student: PIN entry → Student info → Test flow
 * - Admin Sekolah: Generate PIN, view results grouped by PIN
 * - Superadmin: Manage settings, create admins, view logs
 */

const BASE_ORIGIN = (typeof window !== "undefined" && window.location.origin.startsWith("http"))
  ? window.location.origin
  : "http://localhost:5000";

const API_BASE = BASE_ORIGIN.includes(":5000") || !BASE_ORIGIN.includes(":")
  ? BASE_ORIGIN
  : "http://localhost:5000";

const API_AUTH = `${API_BASE}/api/auth`;
const API_ROOMS = `${API_BASE}/api/rooms`;
const API_SCREENINGS = `${API_BASE}/api/screenings`;
const API_SETTINGS = `${API_BASE}/api/settings`;

const state = {
  currentUser: null,
  token: localStorage.getItem("auth_token") || null,
  currentRoom: null, // { roomId, level, pinCode }
  student: { name: "", age: "", grade: "", level: "SD" },
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  durationSeconds: 20 * 60,
  remainingSeconds: 20 * 60,
  timerInterval: null
};

document.addEventListener("DOMContentLoaded", async () => {
  await checkActiveSession();
  initEventListeners();
  showDefaultView();
});

function initEventListeners() {
  // Auth
  document.getElementById("btn-show-login").addEventListener("click", () => {
    document.getElementById("section-auth").classList.remove("hidden");
  });
  document.getElementById("form-login").addEventListener("submit", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  // Student PIN Entry
  document.getElementById("form-pin-entry").addEventListener("submit", handlePinEntry);
  document.getElementById("form-student-info").addEventListener("submit", handleStudentInfo);

  // Admin Rooms
  document.getElementById("btn-generate-room").addEventListener("click", handleGenerateRoom);

  // Superadmin Settings
  document.getElementById("btn-update-min-score").addEventListener("click", handleUpdateMinScore);
  document.getElementById("form-create-admin").addEventListener("submit", handleCreateAdmin);
  document.getElementById("btn-refresh-logs").addEventListener("click", loadSystemLogs);
}

async function checkActiveSession() {
  if (!state.token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch(`${API_AUTH}/me`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.currentUser = data.data;
      updateAuthUI(data.data);
    } else {
      localStorage.removeItem("auth_token");
      state.token = null;
      updateAuthUI(null);
    }
  } catch (err) {
    console.error("Session check failed:", err);
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  const guestDiv = document.getElementById("auth-guest");
  const userDiv = document.getElementById("auth-user");

  if (user) {
    guestDiv.style.display = "none";
    userDiv.style.display = "block";
    document.getElementById("current-user-name").textContent = user.name;
    document.getElementById("current-user-email").textContent = user.email;
    document.getElementById("current-user-role").textContent = user.role;
  } else {
    guestDiv.style.display = "block";
    userDiv.style.display = "none";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_AUTH}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const data = await res.json();
      alert("Login gagal: " + (data.message || "Invalid credentials"));
      return;
    }

    const data = await res.json();
    state.token = data.token;
    state.currentUser = data.user;
    localStorage.setItem("auth_token", state.token);
    updateAuthUI(state.currentUser);
    document.getElementById("section-auth").classList.add("hidden");
    showDefaultView();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function handleLogout() {
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem("auth_token");
  updateAuthUI(null);
  showDefaultView();
}

function showDefaultView() {
  hideAllSections();
  if (!state.currentUser) {
    if (window.IS_ADMIN_PAGE) {
      document.getElementById("section-auth").classList.remove("hidden");
    } else {
      document.getElementById("section-student-pin").classList.remove("hidden");
    }
  } else if (state.currentUser.role === "admin_sekolah") {
    if (window.IS_ADMIN_PAGE) {
      alert("Halaman ini khusus untuk Super Admin. Silakan login di halaman utama.");
      handleLogout();
      window.location.href = "/";
      return;
    }
    document.getElementById("section-admin").classList.remove("hidden");
    document.getElementById("tab-rooms").classList.remove("hidden");
    document.getElementById("tab-results").classList.remove("hidden");
    loadAdminRooms();
    showAdminTab("rooms");
  } else if (state.currentUser.role === "superadmin") {
    if (!window.IS_ADMIN_PAGE) {
      window.location.href = "/admin";
      return;
    }
    document.getElementById("section-admin").classList.remove("hidden");
    document.getElementById("tab-superadmin").classList.remove("hidden");
    document.getElementById("tab-rooms").classList.add("hidden");
    document.getElementById("tab-results").classList.add("hidden");
    showAdminTab("superadmin");
    loadSystemLogs();
  }
}

function hideAllSections() {
  document.querySelectorAll("[id^='section-']").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll("[id^='admin-tab-']").forEach(el => el.classList.add("hidden"));
}

function showAdminTab(tabName) {
  document.querySelectorAll("[id^='admin-tab-']").forEach(el => el.classList.add("hidden"));
  document.getElementById(`admin-tab-${tabName}`).classList.remove("hidden");
  
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));
  event?.target?.classList.add("active");

  if (tabName === "rooms") loadAdminRooms();
  if (tabName === "results") loadAdminResults();
}

async function handlePinEntry(e) {
  e.preventDefault();
  const pinCode = document.getElementById("input-pin").value.toUpperCase();
  const errorDiv = document.getElementById("pin-error-message");

  try {
    const res = await fetch(`${API_ROOMS}/validate-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinCode })
    });

    if (!res.ok) {
      const data = await res.json();
      errorDiv.textContent = data.message || "PIN tidak valid";
      errorDiv.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    state.currentRoom = data.data;
    document.getElementById("info-level").value = data.data.level;

    // Show student info form
    hideAllSections();
    document.getElementById("section-student-info").classList.remove("hidden");
  } catch (err) {
    errorDiv.textContent = "Error: " + err.message;
    errorDiv.classList.remove("hidden");
  }
}

function backToPin() {
  state.currentRoom = null;
  hideAllSections();
  document.getElementById("section-student-pin").classList.remove("hidden");
}

async function handleStudentInfo(e) {
  e.preventDefault();
  const name = document.getElementById("info-name").value;
  const age = document.getElementById("info-age").value;
  const grade = document.getElementById("info-grade").value;

  state.student = {
    name,
    age,
    grade,
    level: state.currentRoom.level
  };

  // Create session and start test
  await startTest();
}

async function startTest() {
  const sessionId = generateSessionId();
  state.sessionId = sessionId;

  // Fetch questions for level
  try {
    const res = await fetch(`${API_SCREENINGS}/questions?level=${state.student.level}`);
    if (!res.ok) throw new Error("Failed to fetch questions");
    const data = await res.json();
    state.questions = data.data;
    state.currentIndex = 0;
    state.answers = {};

    // Start timer
    startTimer();

    // Show test
    hideAllSections();
    document.getElementById("section-test").classList.remove("hidden");
    displayQuestion();
  } catch (err) {
    alert("Error starting test: " + err.message);
  }
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function startTimer() {
  state.remainingSeconds = state.durationSeconds;
  clearInterval(state.timerInterval);

  state.timerInterval = setInterval(() => {
    state.remainingSeconds--;
    const mins = Math.floor(state.remainingSeconds / 60);
    const secs = state.remainingSeconds % 60;
    document.getElementById("test-timer").textContent = 
      `${mins}:${secs.toString().padStart(2, "0")}`;

    if (state.remainingSeconds <= 0) {
      clearInterval(state.timerInterval);
      submitTest();
    }
  }, 1000);
}

function displayQuestion() {
  if (!state.questions || state.questions.length === 0) return;

  const q = state.questions[state.currentIndex];
  document.getElementById("q-number-title").textContent = `Soal ${state.currentIndex + 1}`;
  document.getElementById("q-category").textContent = q.category || "-";
  document.getElementById("q-difficulty").textContent = q.difficulty || "-";
  document.getElementById("q-text").textContent = q.questionText;

  const container = document.getElementById("options-container");
  container.innerHTML = "";

  let options = [];
  try {
    options = JSON.parse(q.optionsJson || "[]");
  } catch (e) {
    options = [];
  }

  options.forEach((opt, idx) => {
    const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
    const div = document.createElement("div");
    div.innerHTML = `
      <label>
        <input type="radio" name="answer" value="${optionLetter}" 
               ${state.answers[q.id] === optionLetter ? "checked" : ""}>
        ${optionLetter}: ${opt}
      </label><br>
    `;
    container.appendChild(div);
  });

  document.getElementById("test-student-info").textContent = state.student.name;
  document.getElementById("test-level-badge").textContent = state.student.level;
  document.getElementById("test-progress").textContent = 
    `${state.currentIndex + 1} / ${state.questions.length}`;
}

document.addEventListener("change", (e) => {
  if (e.target.name === "answer") {
    const q = state.questions[state.currentIndex];
    state.answers[q.id] = e.target.value;
  }
});

function moveQuestion(direction) {
  const newIndex = state.currentIndex + direction;
  if (newIndex >= 0 && newIndex < state.questions.length) {
    state.currentIndex = newIndex;
    displayQuestion();
  }
}

document.getElementById("btn-prev")?.addEventListener("click", () => moveQuestion(-1));
document.getElementById("btn-next")?.addEventListener("click", () => moveQuestion(1));
document.getElementById("btn-submit")?.addEventListener("click", submitTest);

async function submitTest() {
  clearInterval(state.timerInterval);

  try {
    const res = await fetch(`${API_SCREENINGS}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: state.sessionId,
        roomId: state.currentRoom.roomId,
        level: state.student.level,
        studentName: state.student.name,
        studentAge: state.student.age,
        studentGrade: state.student.grade,
        answers: state.answers
      })
    });

    if (!res.ok) throw new Error("Submit failed");
    const data = await res.json();

    // Display result
    displayResult(data.data);
  } catch (err) {
    alert("Error submitting test: " + err.message);
  }
}

function displayResult(result) {
  document.getElementById("res-session-id").textContent = result.sessionId;
  document.getElementById("res-name").textContent = result.student.name;
  document.getElementById("res-level").textContent = result.student.level;
  document.getElementById("res-age-grade").textContent = 
    `${result.student.age} tahun / ${result.student.grade}`;
  document.getElementById("res-iq").textContent = result.result?.estimatedIQ || "-";
  document.getElementById("res-grade").textContent = result.result?.grade || "-";
  document.getElementById("res-correct").textContent = result.result?.correctCount || 0;
  document.getElementById("res-wrong").textContent = result.result?.wrongCount || 0;
  document.getElementById("res-pct").textContent = result.result?.percentage?.toFixed(1) + "%" || "-";
  document.getElementById("res-desc").textContent = result.result?.description || "-";

  hideAllSections();
  document.getElementById("section-result").classList.remove("hidden");
}

document.getElementById("btn-new-test")?.addEventListener("click", () => {
  state.currentRoom = null;
  state.student = { name: "", age: "", grade: "", level: "SD" };
  hideAllSections();
  document.getElementById("section-student-pin").classList.remove("hidden");
});

async function handleGenerateRoom() {
  const level = document.getElementById("admin-room-level").value;

  try {
    const res = await fetch(`${API_ROOMS}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ level })
    });

    if (!res.ok) throw new Error("Failed to generate room");
    const data = await res.json();

    document.getElementById("admin-pin-display").textContent = data.data.pinCode;
    document.getElementById("admin-room-result").classList.remove("hidden");
    loadAdminRooms();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function copyPin() {
  const pin = document.getElementById("admin-pin-display").textContent;
  navigator.clipboard.writeText(pin).then(() => alert("PIN disalin!"));
}

function resetRoomResult() {
  document.getElementById("admin-room-result").classList.add("hidden");
}

async function loadAdminRooms() {
  try {
    const res = await fetch(`${API_ROOMS}`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error("Failed to load rooms");
    const data = await res.json();

    const tbody = document.getElementById("admin-rooms-tbody");
    tbody.innerHTML = data.data.map(room => `
      <tr>
        <td>${room.pinCode}</td>
        <td>${room.level}</td>
        <td><span class="badge ${room.status === 'active' ? 'badge-success' : 'badge-danger'}">${room.status}</span></td>
        <td>${new Date(room.createdAt).toLocaleString("id-ID")}</td>
        <td>
          ${room.status === 'active' ? `<button class="btn-danger" onclick="closeRoom('${room.id}')">Tutup</button>` : '-'}
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error loading rooms:", err);
  }
}

async function closeRoom(roomId) {
  try {
    const res = await fetch(`${API_ROOMS}/${roomId}/close`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error("Failed to close room");
    loadAdminRooms();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function loadAdminResults() {
  try {
    const res = await fetch(`${API_SCREENINGS}/results`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error("Failed to load results");
    const data = await res.json();

    const tbody = document.getElementById("admin-results-tbody");
    tbody.innerHTML = data.data.map(result => `
      <tr>
        <td>${result.roomId || '-'}</td>
        <td>${result.level}</td>
        <td>${result.studentName}</td>
        <td>${result.studentGrade}</td>
        <td>${result.resultJson ? JSON.parse(result.resultJson).estimatedIQ : '-'}</td>
        <td>${result.resultJson ? JSON.parse(result.resultJson).grade : '-'}</td>
        <td>${new Date(result.completedAt).toLocaleString("id-ID")}</td>
        <td><button class="btn-secondary" onclick="viewResult('${result.sessionId}')">Lihat</button></td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error loading results:", err);
  }
}

async function handleUpdateMinScore() {
  const score = document.getElementById("superadmin-min-score").value;

  try {
    const res = await fetch(`${API_SETTINGS}/min-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ minimumScore: parseInt(score) })
    });

    if (!res.ok) throw new Error("Failed to update");
    const resultDiv = document.getElementById("superadmin-min-score-result");
    resultDiv.innerHTML = '<div class="alert alert-success">Skor minimum berhasil diupdate!</div>';
    resultDiv.classList.remove("hidden");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function handleCreateAdmin(e) {
  e.preventDefault();
  const schoolId = document.getElementById("admin-school-id").value;
  const name = document.getElementById("admin-name").value;
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;

  try {
    const res = await fetch(`${API_SETTINGS}/admin/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`
      },
      body: JSON.stringify({ schoolId, name, email, password })
    });

    if (!res.ok) throw new Error("Failed to create admin");
    alert("Admin sekolah berhasil dibuat!");
    e.target.reset();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function loadSystemLogs() {
  try {
    const res = await fetch(`${API_SETTINGS}/logs`, {
      headers: { "Authorization": `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error("Failed to load logs");
    const data = await res.json();

    const tbody = document.getElementById("superadmin-logs-tbody");
    tbody.innerHTML = data.data.slice(0, 50).map(log => `
      <tr>
        <td>${new Date(log.createdAt).toLocaleString("id-ID")}</td>
        <td>${log.action}</td>
        <td>${log.description}</td>
        <td>${log.userId || '-'}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error loading logs:", err);
  }
}

function viewResult(sessionId) {
  alert("Detail hasil akan ditampilkan di sini untuk session: " + sessionId);
}
