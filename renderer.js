let tasks = [];

async function loadTasks() {
  tasks = await window.api.getTasks();
  renderTasks();
}

function addTask() {
  const input = document.getElementById("taskInput");
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;
  if (!input.value) return;

  tasks.push({
    id: Date.now(),
    title: input.value,
    completed: false,
    priority,
    dueDate,
  });

  window.api.saveTasks(tasks);
  input.value = "";
  document.getElementById("dueDate").value = "";
  renderTasks();
}

function toggleComplete(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );

  window.api.saveTasks(tasks);
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  window.api.saveTasks(tasks);
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  const today = new Date().toISOString().split("T")[0];
  list.innerHTML = "";
  tasks.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  tasks.forEach((task) => {
    const isOverdue = task.dueDate && task.dueDate < today && !task.completed;
    const li = document.createElement("li");

    li.innerHTML = `
  <span class="task-title ${task.completed ? "completed" : ""} ${isOverdue ? "overdue" : ""}">
    ${task.title}
    ${task.dueDate ? ` (Due: ${task.dueDate})` : ""}
  </span>

  <div>
    <button onclick="toggleComplete(${task.id})">✅</button>
    <button onclick="deleteTask(${task.id})">❌</button>
  </div>
`;

    list.appendChild(li);
  });
}

loadTasks();
