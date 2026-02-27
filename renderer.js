/* ═══════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════ */
let tasks = [];
let notes = [];
let habits = [];
let pomodoroData = { sessions: [], totalMinutes: 0 };
let settings = { theme: "dark", pomodoroWork: 25, pomodoroBreak: 5 };

let pomTimer = null;
let pomSecondsLeft = 0;
let pomIsRunning = false;
let pomIsBreak = false;
let editingTaskId = null;

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
async function init() {
  tasks = await window.api.getTasks();
  notes = await window.api.getNotes();
  habits = await window.api.getHabits();
  pomodoroData = await window.api.getPomodoro();
  settings = await window.api.getSettings();

  // Apply theme
  document.body.setAttribute("data-theme", settings.theme || "dark");
  document.getElementById("themeIcon").textContent =
    settings.theme === "light" ? "☀️" : "🌙";

  // Pomodoro settings
  document.getElementById("pomWorkMin").value = settings.pomodoroWork || 25;
  document.getElementById("pomBreakMin").value = settings.pomodoroBreak || 5;
  pomSecondsLeft = (settings.pomodoroWork || 25) * 60;
  updateTimerDisplay();

  // Render everything
  renderDashboard();
  renderTasks();
  renderHabits();
  renderNotes();
  renderPomodoroStats();

  // Clock
  updateDate();
  setInterval(updateDate, 60000);
}

function updateDate() {
  const now = new Date();
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("currentDate").textContent = now.toLocaleDateString("en-US", opts);
}

/* ═══════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════ */
function switchSection(name) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("sec-" + name).classList.add("active");
  document.querySelector(`.nav-btn[data-section="${name}"]`).classList.add("active");
  if (name === "dashboard") renderDashboard();
}

/* ═══════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════ */
function toggleTheme() {
  const newTheme = settings.theme === "dark" ? "light" : "dark";
  settings.theme = newTheme;
  document.body.setAttribute("data-theme", newTheme);
  document.getElementById("themeIcon").textContent = newTheme === "light" ? "☀️" : "🌙";
  window.api.saveSettings(settings);
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function renderDashboard() {
  const today = todayStr();
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today && !t.completed).length;
  const todaySessions = pomodoroData.sessions.filter((s) => s.date === today).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  document.getElementById("statTotal").textContent = tasks.length;
  document.getElementById("statDone").textContent = completed;
  document.getElementById("statOverdue").textContent = overdue;
  document.getElementById("statPomodoros").textContent = todaySessions;
  document.getElementById("statStreak").textContent = bestStreak;
  document.getElementById("statNotes").textContent = notes.length;

  // Progress
  const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = pct + "% complete";

  // Upcoming tasks (next 5 active, sorted by due date)
  const upcoming = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 5);

  const upList = document.getElementById("upcomingTasks");
  upList.innerHTML = upcoming.length
    ? upcoming
        .map(
          (t) => `<li>
        <span>${escHtml(t.title)}</span>
        <span style="color:var(--text-muted)">${t.dueDate || "No date"}</span>
      </li>`,
        )
        .join("")
    : '<li class="empty-msg">No upcoming tasks</li>';

  // Today's habits
  const habList = document.getElementById("todayHabits");
  habList.innerHTML = habits.length
    ? habits
        .map((h) => {
          const done = (h.completedDates || []).includes(today);
          return `<li>
          <span>${done ? "✅" : "⬜"} ${escHtml(h.name)}</span>
          <span style="color:var(--warning)">🔥 ${h.streak || 0}</span>
        </li>`;
        })
        .join("")
    : '<li class="empty-msg">No habits tracked yet</li>';
}

/* ═══════════════════════════════════════════
   TASKS
   ═══════════════════════════════════════════ */
function addTask() {
  const input = document.getElementById("taskInput");
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;
  const category = document.getElementById("taskCategory").value;
  if (!input.value.trim()) return;

  tasks.push({
    id: Date.now(),
    title: input.value.trim(),
    completed: false,
    priority,
    dueDate,
    category,
    createdAt: new Date().toISOString(),
  });

  window.api.saveTasks(tasks);
  input.value = "";
  document.getElementById("dueDate").value = "";
  renderTasks();
}

function toggleComplete(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  window.api.saveTasks(tasks);
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  window.api.saveTasks(tasks);
  renderTasks();
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  window.api.saveTasks(tasks);
  renderTasks();
}

function openEditModal(id) {
  editingTaskId = id;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  document.getElementById("editTitle").value = task.title;
  document.getElementById("editDueDate").value = task.dueDate || "";
  document.getElementById("editPriority").value = task.priority;
  document.getElementById("editCategory").value = task.category || "General";
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  editingTaskId = null;
}

function saveEdit() {
  if (!editingTaskId) return;
  tasks = tasks.map((t) => {
    if (t.id !== editingTaskId) return t;
    return {
      ...t,
      title: document.getElementById("editTitle").value.trim() || t.title,
      dueDate: document.getElementById("editDueDate").value,
      priority: document.getElementById("editPriority").value,
      category: document.getElementById("editCategory").value,
    };
  });
  window.api.saveTasks(tasks);
  closeEditModal();
  renderTasks();
}

function renderTasks() {
  const search = document.getElementById("taskSearch").value.toLowerCase();
  const filterStatus = document.getElementById("filterStatus").value;
  const filterPriority = document.getElementById("filterPriority").value;
  const filterCategory = document.getElementById("filterCategory").value;
  const today = todayStr();

  let filtered = [...tasks];

  // Search
  if (search) filtered = filtered.filter((t) => t.title.toLowerCase().includes(search));

  // Status filter
  if (filterStatus === "active") filtered = filtered.filter((t) => !t.completed);
  else if (filterStatus === "completed") filtered = filtered.filter((t) => t.completed);
  else if (filterStatus === "overdue")
    filtered = filtered.filter((t) => t.dueDate && t.dueDate < today && !t.completed);

  // Priority filter
  if (filterPriority !== "all") filtered = filtered.filter((t) => t.priority === filterPriority);

  // Category filter
  if (filterCategory !== "all") filtered = filtered.filter((t) => t.category === filterCategory);

  // Sort: incomplete first, then by due date
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const list = document.getElementById("taskList");
  list.innerHTML = filtered.length
    ? filtered
        .map((t) => {
          const isOverdue = t.dueDate && t.dueDate < today && !t.completed;
          return `<li class="${t.completed ? "task-completed" : ""} ${isOverdue ? "task-overdue" : ""}">
        <div class="task-priority-dot dot-${t.priority}"></div>
        <div class="task-content">
          <div class="task-title-text">${escHtml(t.title)}</div>
          <div class="task-meta">
            ${t.dueDate ? `<span>${isOverdue ? "⚠️ " : ""}${t.dueDate}</span>` : ""}
            <span class="task-category-badge">${escHtml(t.category || "General")}</span>
            <span>${t.priority}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" onclick="toggleComplete(${t.id})" title="Toggle complete">${t.completed ? "↩️" : "✅"}</button>
          <button class="task-action-btn" onclick="openEditModal(${t.id})" title="Edit">✏️</button>
          <button class="task-action-btn" onclick="deleteTask(${t.id})" title="Delete">🗑️</button>
        </div>
      </li>`;
        })
        .join("")
    : '<li style="justify-content:center;color:var(--text-muted)">No tasks match your filters</li>';
}

/* ═══════════════════════════════════════════
   POMODORO TIMER
   ═══════════════════════════════════════════ */
function pomodoroStartPause() {
  if (pomIsRunning) {
    clearInterval(pomTimer);
    pomIsRunning = false;
    document.getElementById("pomStartBtn").textContent = "▶ Resume";
    document.getElementById("timerRing").classList.remove("running", "onbreak");
  } else {
    pomIsRunning = true;
    document.getElementById("pomStartBtn").textContent = "⏸ Pause";
    document.getElementById("timerRing").classList.add(pomIsBreak ? "onbreak" : "running");
    pomTimer = setInterval(() => {
      pomSecondsLeft--;
      if (pomSecondsLeft <= 0) {
        clearInterval(pomTimer);
        pomIsRunning = false;
        if (!pomIsBreak) {
          // Finished a work session
          pomodoroData.sessions.push({ date: todayStr(), time: new Date().toLocaleTimeString() });
          pomodoroData.totalMinutes += settings.pomodoroWork || 25;
          window.api.savePomodoro(pomodoroData);
          pomIsBreak = true;
          pomSecondsLeft = (settings.pomodoroBreak || 5) * 60;
          document.getElementById("timerLabel").textContent = "Break Time 🎉";
          document.getElementById("timerRing").classList.remove("running");
          document.getElementById("timerRing").classList.add("onbreak");
          new Notification("Pomodoro Complete!", { body: "Time for a break!" });
        } else {
          pomIsBreak = false;
          pomSecondsLeft = (settings.pomodoroWork || 25) * 60;
          document.getElementById("timerLabel").textContent = "Focus Time";
          document.getElementById("timerRing").classList.remove("onbreak");
          new Notification("Break Over!", { body: "Ready to focus?" });
        }
        document.getElementById("pomStartBtn").textContent = "▶ Start";
        document.getElementById("timerRing").classList.remove("running", "onbreak");
        renderPomodoroStats();
      }
      updateTimerDisplay();
    }, 1000);
  }
}

function pomodoroReset() {
  clearInterval(pomTimer);
  pomIsRunning = false;
  pomIsBreak = false;
  pomSecondsLeft = (settings.pomodoroWork || 25) * 60;
  document.getElementById("pomStartBtn").textContent = "▶ Start";
  document.getElementById("timerLabel").textContent = "Focus Time";
  document.getElementById("timerRing").classList.remove("running", "onbreak");
  updateTimerDisplay();
}

function pomodoroUpdateSettings() {
  settings.pomodoroWork = parseInt(document.getElementById("pomWorkMin").value) || 25;
  settings.pomodoroBreak = parseInt(document.getElementById("pomBreakMin").value) || 5;
  window.api.saveSettings(settings);
  if (!pomIsRunning) {
    pomSecondsLeft = (pomIsBreak ? settings.pomodoroBreak : settings.pomodoroWork) * 60;
    updateTimerDisplay();
  }
}

function updateTimerDisplay() {
  const min = Math.floor(pomSecondsLeft / 60);
  const sec = pomSecondsLeft % 60;
  document.getElementById("timerDisplay").textContent =
    String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

function renderPomodoroStats() {
  const today = todayStr();
  const todaySessions = pomodoroData.sessions.filter((s) => s.date === today).length;
  document.getElementById("pomTodaySessions").textContent = todaySessions;
  document.getElementById("pomTotalMin").textContent = pomodoroData.totalMinutes || 0;

  // Recent sessions
  const recent = [...pomodoroData.sessions].reverse().slice(0, 8);
  const hist = document.getElementById("pomHistory");
  hist.innerHTML = recent.length
    ? recent.map((s) => `<li><span>🍅 Session</span><span>${s.date} ${s.time}</span></li>`).join("")
    : '<li class="empty-msg">No sessions yet</li>';
}

/* ═══════════════════════════════════════════
   HABITS
   ═══════════════════════════════════════════ */
function addHabit() {
  const input = document.getElementById("habitInput");
  const freq = document.getElementById("habitFrequency").value;
  if (!input.value.trim()) return;

  habits.push({
    id: Date.now(),
    name: input.value.trim(),
    frequency: freq,
    completedDates: [],
    streak: 0,
    createdAt: todayStr(),
  });

  window.api.saveHabits(habits);
  input.value = "";
  renderHabits();
}

function toggleHabitDay(habitId, dateStr) {
  habits = habits.map((h) => {
    if (h.id !== habitId) return h;
    const dates = h.completedDates || [];
    const idx = dates.indexOf(dateStr);
    if (idx >= 0) dates.splice(idx, 1);
    else dates.push(dateStr);
    h.completedDates = dates;
    h.streak = calcStreak(dates);
    return h;
  });
  window.api.saveHabits(habits);
  renderHabits();
}

function deleteHabit(id) {
  habits = habits.filter((h) => h.id !== id);
  window.api.saveHabits(habits);
  renderHabits();
}

function calcStreak(dates) {
  if (!dates || dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = (prev - cur) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function renderHabits() {
  const today = new Date();
  const container = document.getElementById("habitList");

  container.innerHTML = habits.length
    ? habits
        .map((h) => {
          // Build last 7 days
          const days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const ds = formatDate(d);
            const checked = (h.completedDates || []).includes(ds);
            const isToday = i === 0;
            const dayLabel = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
            days.push(
              `<div class="habit-day ${checked ? "checked" : ""} ${isToday ? "today" : ""}"
                    onclick="toggleHabitDay(${h.id}, '${ds}')" title="${ds}">
                ${dayLabel}
              </div>`,
            );
          }
          return `<div class="habit-card">
          <div class="habit-header">
            <span class="habit-name">${escHtml(h.name)}</span>
            <span class="habit-streak">🔥 ${h.streak || 0} streak</span>
          </div>
          <div class="habit-week">${days.join("")}</div>
          <div class="habit-footer">
            <span class="habit-freq">${h.frequency}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteHabit(${h.id})">Delete</button>
          </div>
        </div>`;
        })
        .join("")
    : '<p style="color:var(--text-muted)">No habits yet. Add your first habit above!</p>';
}

/* ═══════════════════════════════════════════
   NOTES
   ═══════════════════════════════════════════ */
function addNote() {
  const titleEl = document.getElementById("noteTitle");
  const color = document.getElementById("noteColor").value;
  if (!titleEl.value.trim()) return;

  notes.push({
    id: Date.now(),
    title: titleEl.value.trim(),
    body: "",
    color,
    createdAt: new Date().toISOString(),
  });

  window.api.saveNotes(notes);
  titleEl.value = "";
  renderNotes();
}

function updateNoteBody(id) {
  const textarea = document.getElementById("note-body-" + id);
  if (!textarea) return;
  notes = notes.map((n) => (n.id === id ? { ...n, body: textarea.value } : n));
  window.api.saveNotes(notes);
}

function deleteNote(id) {
  notes = notes.filter((n) => n.id !== id);
  window.api.saveNotes(notes);
  renderNotes();
}

function renderNotes() {
  const container = document.getElementById("notesList");
  container.innerHTML = notes.length
    ? notes
        .map(
          (n) => `<div class="note-card color-${n.color}">
        <div class="note-header">
          <span class="note-title">${escHtml(n.title)}</span>
          <span class="note-date">${new Date(n.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="note-body">
          <textarea id="note-body-${n.id}" onblur="updateNoteBody(${n.id})"
            placeholder="Write your note...">${escHtml(n.body)}</textarea>
        </div>
        <div class="note-footer">
          <button class="btn btn-danger btn-sm" onclick="deleteNote(${n.id})">Delete</button>
        </div>
      </div>`,
        )
        .join("")
    : '<p style="color:var(--text-muted)">No notes yet. Create one above!</p>';
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function todayStr() {
  return formatDate(new Date());
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// Close modal on overlay click
document.getElementById("editModal").addEventListener("click", (e) => {
  if (e.target.id === "editModal") closeEditModal();
});

// Keyboard: Enter to add task
document.getElementById("taskInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

// Keyboard: Escape to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeEditModal();
});

/* ═══════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════ */
init();
