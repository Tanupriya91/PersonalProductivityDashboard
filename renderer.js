let tasks = [];

async function loadTasks() {
  tasks = await window.api.getTasks();
  renderTasks();
}

function addTask() {
  const input = document.getElementById("taskInput");
  const priority = document.getElementById("priority").value;

  if (!input.value) return;

  tasks.push({
    id: Date.now(),
    title: input.value,
    completed: false,
    priority,
  });

  window.api.saveTasks(tasks);
  input.value = "";
  renderTasks();
}

function toggleComplete(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );

  window.api.saveTasks(tasks);
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  window.api.saveTasks(tasks);
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span style="text-decoration:${task.completed ? "line-through" : "none"}">
        ${task.title} (${task.priority})
      </span>
      <button onclick="toggleComplete(${task.id})">✔</button>
      <button onclick="deleteTask(${task.id})">❌</button>
    `;

    list.appendChild(li);
  });
}

loadTasks();