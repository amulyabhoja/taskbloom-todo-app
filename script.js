
// Task data is kept local to this browser; invalid or outdated saved data is ignored safely.
const TASKS_STORAGE_KEY = "taskbloom.tasks";
const THEME_STORAGE_KEY = "taskbloom.theme";
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyCopy = document.getElementById("emptyCopy");
const formMessage = document.getElementById("formMessage");
const toast = document.getElementById("toast");
const filterGroup = document.querySelector(".filter-group");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const clearCompletedButton = document.getElementById("clearCompleted");
const themeToggle = document.getElementById("themeToggle");
let tasks = loadTasks();
let activeFilter = "all";
let toastTimer;
let messageTimer;

function loadTasks() {
    try {
        const savedTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || "[]");
        if (!Array.isArray(savedTasks)) return [];

        return savedTasks
            .filter((task) => task && typeof task.text === "string" && typeof task.completed === "boolean")
            .map((task) => ({
                id: typeof task.id === "string" ? task.id : createTaskId(),
                text: task.text.trim().slice(0, 180),
                completed: task.completed
            }))
            .filter((task) => task.text.length > 0);
    } catch (error) {
        console.error("TaskBloom could not read saved tasks.", error);
        return [];
    }
}

function createTaskId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function saveTasks() {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("TaskBloom could not save tasks.", error);
        showToast("Your browser couldn’t save this change. Check its storage settings.");
        return false;
    }
}

function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function showFormMessage(message) {
    window.clearTimeout(messageTimer);
    formMessage.textContent = message;
    messageTimer = window.setTimeout(() => {
        formMessage.textContent = "";
    }, 2800);
}

function getVisibleTasks() {
    if (activeFilter === "active") return tasks.filter((task) => !task.completed);
    if (activeFilter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
}

function createTaskElement(task) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " is-complete" : ""}`;
    item.dataset.taskId = task.id;

    const checkbox = document.createElement("button");
    checkbox.className = "task-checkbox";
    checkbox.type = "button";
    checkbox.setAttribute("aria-label", task.completed ? `Mark "${task.text}" as active` : `Mark "${task.text}" as completed`);
    checkbox.setAttribute("aria-pressed", String(task.completed));
    checkbox.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.2 3 3 6-6.4"></path></svg>';
    checkbox.addEventListener("click", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete "${task.text}"`);
    deleteButton.title = "Delete task";
    deleteButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-6 0 .7 10h6.6L14 6m-5 3v4m2-4v4"></path></svg>';
    deleteButton.addEventListener("click", () => deleteTask(task.id, item));

    item.append(checkbox, text, deleteButton);
    return item;
}

function renderTasks() {
    const visibleTasks = getVisibleTasks();
    const fragment = document.createDocumentFragment();

    visibleTasks.forEach((task) => fragment.appendChild(createTaskElement(task)));
    taskList.replaceChildren(fragment);

    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById("totalCount").textContent = String(total);
    document.getElementById("activeCount").textContent = String(pending);
    document.getElementById("completedCount").textContent = String(completed);
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressBar").setAttribute("aria-valuenow", String(progress));
    document.getElementById("progressCopy").textContent = getMotivationalMessage(total, completed, pending);
    clearCompletedButton.disabled = completed === 0;

    const noTasksToShow = visibleTasks.length === 0;
    emptyState.classList.toggle("is-hidden", !noTasksToShow);
    taskList.hidden = noTasksToShow;

    if (total === 0) {
        emptyTitle.textContent = "A little room to bloom";
        emptyCopy.textContent = "Add your first task and watch your day take shape.";
    } else if (activeFilter === "active" && pending === 0) {
        emptyTitle.textContent = "All caught up!";
        emptyCopy.textContent = "You’ve finished everything on your list. Take a little bow.";
    } else {
        emptyTitle.textContent = "No completed tasks yet";
        emptyCopy.textContent = "Your finished tasks will find their way here.";
    }
}

function getMotivationalMessage(total, completed, pending) {
    if (total === 0) return "A fresh start ✨";
    if (pending === 0) return "Look at you, blooming 🌷";
    if (completed === 0) return "Every journey starts small 🌱";
    if (completed / total >= 0.75) return "You’re so close — keep going ✨";
    return `${pending} small ${pending === 1 ? "step" : "steps"} to go 🌼`;
}

function addTask(event) {
    event.preventDefault();
    const text = taskInput.value.trim();

    if (!text) {
        showFormMessage("Add a little task to get started 🌱");
        taskInput.focus();
        return;
    }

    tasks.unshift({ id: createTaskId(), text, completed: false });
    const saved = saveTasks();
    taskInput.value = "";
    formMessage.textContent = "";
    activeFilter = "all";
    updateFilterControls();
    renderTasks();
    if (saved) showToast("A new little step added ✨");
    taskInput.focus();
}

function toggleTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    const saved = saveTasks();
    renderTasks();
    if (saved) showToast(task.completed ? "One small win — nicely done 🌷" : "Task moved back to your list");
}

function deleteTask(taskId, item) {
    item.classList.add("is-deleting");
    item.querySelectorAll("button").forEach((button) => { button.disabled = true; });

    window.setTimeout(() => {
        tasks = tasks.filter((task) => task.id !== taskId);
        const saved = saveTasks();
        renderTasks();
        if (saved) showToast("Task gently cleared away");
    }, 220);
}

function updateFilterControls() {
    filterGroup.dataset.active = activeFilter;
    filterButtons.forEach((button) => {
        const isSelected = button.dataset.filter === activeFilter;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
}

function setTheme(theme, persist = true) {
    document.body.dataset.theme = theme;
    const nextTheme = theme === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    themeToggle.title = `Switch to ${nextTheme} theme`;

    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
            console.error("TaskBloom could not save the selected theme.", error);
            showToast("Your theme will reset when you close this tab.");
        }
    }
}

taskForm.addEventListener("submit", addTask);

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        updateFilterControls();
        renderTasks();
    });
});

clearCompletedButton.addEventListener("click", () => {
    const completedCount = tasks.filter((task) => task.completed).length;
    if (completedCount === 0) return;

    tasks = tasks.filter((task) => !task.completed);
    const saved = saveTasks();
    renderTasks();
    if (saved) showToast(`${completedCount} completed ${completedCount === 1 ? "task" : "tasks"} cleared`);
});

themeToggle.addEventListener("click", () => {
    setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

document.getElementById("currentDate").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric"
}).format(new Date());

let savedTheme = "light";
try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") savedTheme = storedTheme;
} catch (error) {
    console.error("TaskBloom could not read the selected theme.", error);
}
setTheme(savedTheme, false);
renderTasks();
