"use strict";

// ---------- Shared helpers ----------

function getElement(id) {
    return document.getElementById(id);
}

function readArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

function readNumber(key) {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function saveArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Turns "2026-11-30" into a readable local date like "30 Nov 2026"
function formatDueDate(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Small message that slides up from the bottom (replaces alert)
let toastTimeout = null;

function showMessage(message) {
    const toast = getElement("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// ---------- Tasks ----------

const taskForm = getElement("task-form");
const taskInput = getElement("task-input");
const taskList = getElement("task-list");
const taskPriority = getElement("task-priority");
const taskDue = getElement("task-due");
const taskFilters = getElement("task-filters");
let currentTaskFilter = "all";

let tasks = readArray("studyflow-tasks");

function saveTasks() {
    saveArray("studyflow-tasks", tasks);
}

function renderTasks() {
    if (taskList) {
        taskList.replaceChildren();

        tasks.forEach((task, index) => {
            const shouldShowTask =
                currentTaskFilter === "all" ||
                (currentTaskFilter === "active" && !task.completed) ||
                (currentTaskFilter === "completed" && task.completed);

            if (!shouldShowTask) {
                return;
            }

            const listItem = document.createElement("li");
            const taskText = document.createElement("span");
            const priorityText = document.createElement("span");
            const completeButton = document.createElement("button");
            const deleteButton = document.createElement("button");

            taskText.textContent = task.text || "";
            priorityText.textContent =
                `Priority: ${task.priority || "Normal"}`;
            priorityText.className =
                `priority-${(task.priority || "Normal").toLowerCase()}`;

            completeButton.type = "button";
            completeButton.textContent = task.completed ? "Undo" : "Complete";

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-button";

            if (task.completed) {
                listItem.classList.add("completed");
            }
            if (task.priority === "High") {
                listItem.classList.add("high-priority-task");
            }

            completeButton.addEventListener("click", () => {
                tasks[index].completed = !tasks[index].completed;

                if (tasks[index].completed) {
                    tasks[index].completedDate = localDateKey();
                } else {
                    delete tasks[index].completedDate;
                }

                saveTasks();
                renderTasks();
            });

            deleteButton.addEventListener("click", () => {
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
            });

            listItem.append(taskText, priorityText);

            // Deadline (only shown if the task has one)
            if (task.dueDate) {
                const dueText = document.createElement("span");
                dueText.className = "due-date";
                dueText.textContent = `Due: ${formatDueDate(task.dueDate)}`;

                const isOverdue =
                    !task.completed && task.dueDate < localDateKey();

                if (isOverdue) {
                    dueText.classList.add("overdue");
                    dueText.textContent += " (overdue)";
                }

                listItem.appendChild(dueText);
            }

            listItem.append(completeButton, deleteButton);

            taskList.appendChild(listItem);
        });

        // Empty state: runs once, after the loop
        if (taskList.children.length === 0) {
            const empty = document.createElement("li");
            empty.className = "empty-state";
            empty.textContent = "No tasks here yet. Add one above to get started.";
            taskList.appendChild(empty);
        }
    }

    updateDashboardStats();
}

if (taskForm && taskInput) {
    taskForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const text = taskInput.value.trim();

        if (text === "") {
            return;
        }

        tasks.push({
            text,
            priority: taskPriority ? taskPriority.value : "Normal",
            dueDate: taskDue && taskDue.value ? taskDue.value : "",
            completed: false
        });

        saveTasks();
        renderTasks();

        taskInput.value = "";

        if (taskDue) {
            taskDue.value = "";
        }

        taskInput.focus();
    });
}

if (taskFilters) {
    taskFilters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-task-filter]");

        if (!button) {
            return;
        }

        currentTaskFilter = button.dataset.taskFilter;

        taskFilters.querySelectorAll("button").forEach((filterButton) => {
            filterButton.classList.toggle(
                "selected-filter",
                filterButton === button
            );
        });

        renderTasks();
    });
}

// ---------- Coding skills ----------

const skillForm = getElement("skill-form");
const skillInput = getElement("skill-input");
const skillList = getElement("skill-list");

let skills = readArray("studyflow-skills");

function saveSkills() {
    saveArray("studyflow-skills", skills);
}

function renderSkills() {
    if (skillList) {
        skillList.replaceChildren();

        skills.forEach((skill, index) => {
            const container = document.createElement("div");
            const label = document.createElement("label");
            const progress = document.createElement("input");
            const progressText = document.createElement("span");
            const deleteButton = document.createElement("button");

            container.className = "skill-item";

            label.textContent = skill.name || "";
            label.htmlFor = `skill-progress-${index}`;

            progress.type = "range";
            progress.id = `skill-progress-${index}`;
            progress.min = "0";
            progress.max = "100";
            progress.value = String(Number(skill.progress) || 0);

            progressText.textContent = `${progress.value}%`;

            progress.addEventListener("input", () => {
                skills[index].progress = Number(progress.value);
                progressText.textContent = `${progress.value}%`;

                saveSkills();
                updateDashboardStats();
            });

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-button";

            deleteButton.addEventListener("click", () => {
                skills.splice(index, 1);
                saveSkills();
                renderSkills();
            });

            container.append(label, progress, progressText, deleteButton);
            skillList.appendChild(container);
        });

        // Empty state: runs once, after the loop
        if (skillList.children.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "No skills yet. Add one above to start tracking.";
            skillList.appendChild(empty);
        }
    }

    updateDashboardStats();
}

if (skillForm && skillInput) {
    skillForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = skillInput.value.trim();

        if (name === "") {
            return;
        }

        skills.push({
            name,
            progress: 0
        });

        saveSkills();
        renderSkills();

        skillInput.value = "";
        skillInput.focus();
    });
}

// ---------- Study timer ----------

const timerDisplay = getElement("timer");
const startButton = getElement("start-timer");
const pauseButton = getElement("pause-timer");
const resetButton = getElement("reset-timer");
const sessionCount = getElement("session-count");

const TIMER_KEY = "studyflow-timer";
const LENGTH_KEY = "studyflow-timer-minutes";
const ALLOWED_MINUTES = [15, 25, 45, 50];
const timerLength = getElement("timer-length");

function readTimerMinutes() {
    const saved = readNumber(LENGTH_KEY);
    return ALLOWED_MINUTES.includes(saved) ? saved : 25;
}

// Session length in seconds (chosen by the student, default 25 minutes)
let focusDuration = readTimerMinutes() * 60;

let timeLeft = focusDuration;
let timerInterval = null;
let timerEndTime = null;
let completedSessions = readNumber("studyflow-sessions");

function saveTimerState() {
    localStorage.setItem(
        TIMER_KEY,
        JSON.stringify({ timeLeft, timerEndTime })
    );
}

function loadTimerState() {
    try {
        const saved = JSON.parse(localStorage.getItem(TIMER_KEY));

        if (!saved) {
            return;
        }

        if (Number.isFinite(saved.timerEndTime)) {
            timerEndTime = saved.timerEndTime;
            timeLeft = Math.max(
                0,
                Math.ceil((timerEndTime - Date.now()) / 1000)
            );
        } else if (
            Number.isFinite(saved.timeLeft) &&
            saved.timeLeft >= 0 &&
            saved.timeLeft <= focusDuration
        ) {
            timeLeft = saved.timeLeft;
        }
    } catch (error) {
        // Ignore broken saved data and start fresh
    }
}

function displayTime() {
    if (!timerDisplay) {
        return;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateSessionCount() {
    if (sessionCount) {
        sessionCount.textContent = String(completedSessions);
    }

    updateDashboardStats();
}

function finishTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerEndTime = null;
    timeLeft = 0;
    displayTime();

    completedSessions += 1;
    localStorage.setItem("studyflow-sessions", String(completedSessions));

    saveTimerState();
    updateSessionCount();
    showMessage("Focus session completed! Great work!");
}

function tick() {
    timeLeft = Math.max(
        0,
        Math.ceil((timerEndTime - Date.now()) / 1000)
    );
    displayTime();

    if (timeLeft <= 0) {
        finishTimer();
    }
}

function startTimer() {
    if (timerInterval !== null) {
        return;
    }

    if (timeLeft <= 0) {
        timeLeft = focusDuration;
    }

    timerEndTime = Date.now() + timeLeft * 1000;
    saveTimerState();
    displayTime();

    timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    if (timerInterval === null) {
        return;
    }

    clearInterval(timerInterval);
    timerInterval = null;

    timeLeft = Math.max(
        0,
        Math.ceil((timerEndTime - Date.now()) / 1000)
    );
    timerEndTime = null;

    saveTimerState();
    displayTime();
}

function resetTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerEndTime = null;
    timeLeft = focusDuration;

    saveTimerState();
    displayTime();
}

if (startButton) {
    startButton.addEventListener("click", startTimer);
}

if (pauseButton) {
    pauseButton.addEventListener("click", pauseTimer);
}

if (resetButton) {
    resetButton.addEventListener("click", resetTimer);
}

if (timerLength) {
    timerLength.value = String(focusDuration / 60);

    timerLength.addEventListener("change", () => {
        if (timerInterval !== null) {
            timerLength.value = String(focusDuration / 60);
            showMessage("Pause the timer before changing its length.");
            return;
        }

        const minutes = Number(timerLength.value);

        if (!ALLOWED_MINUTES.includes(minutes)) {
            timerLength.value = String(focusDuration / 60);
            return;
        }

        focusDuration = minutes * 60;
        localStorage.setItem(LENGTH_KEY, String(minutes));
        resetTimer();
        showMessage(`Timer set to ${minutes} minutes.`);
    });
}

// ---------- Study notes ----------

const notesForm = getElement("notes-form");
const subjectInput = getElement("subject-input");
const noteInput = getElement("note-input");
const notesList = getElement("notes-list");

let notes = readArray("studyflow-notes");
let editingNoteIndex = null;

function saveNotes() {
    saveArray("studyflow-notes", notes);
}

function renderNotes() {
    if (!notesList) {
        return;
    }

    notesList.replaceChildren();

    notes.forEach((note, index) => {
        const noteCard = document.createElement("article");
        noteCard.className = "note-card";

        // ---- Edit mode: the card becomes a form ----
        if (editingNoteIndex === index) {
            const subjectField = document.createElement("input");
            const textField = document.createElement("textarea");
            const saveButton = document.createElement("button");
            const cancelButton = document.createElement("button");

            subjectField.type = "text";
            subjectField.value = note.subject || "";
            subjectField.setAttribute("aria-label", "Edit subject");

            textField.value = note.text || "";
            textField.rows = 4;
            textField.setAttribute("aria-label", "Edit note");

            saveButton.type = "button";
            saveButton.textContent = "Save";
            saveButton.className = "primary-button";

            cancelButton.type = "button";
            cancelButton.textContent = "Cancel";

            saveButton.addEventListener("click", () => {
                const subject = subjectField.value.trim();
                const text = textField.value.trim();

                if (subject === "" || text === "") {
                    showMessage("The subject and note cannot be empty.");
                    return;
                }

                notes[index].subject = subject;
                notes[index].text = text;
                editingNoteIndex = null;

                saveNotes();
                renderNotes();
                showMessage("Note updated.");
            });

            cancelButton.addEventListener("click", () => {
                editingNoteIndex = null;
                renderNotes();
            });

            noteCard.append(
                subjectField,
                textField,
                saveButton,
                cancelButton
            );
            notesList.appendChild(noteCard);
            return;
        }

        // ---- Normal mode ----
        const subjectHeading = document.createElement("h3");
        const noteText = document.createElement("p");
        const noteDate = document.createElement("small");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        subjectHeading.textContent = note.subject || "Study note";
        noteText.textContent = note.text || "";

        if (note.createdAt) {
            noteDate.textContent =
                `Saved: ${new Date(note.createdAt).toLocaleDateString()}`;
        }

        editButton.type = "button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editingNoteIndex = index;
            renderNotes();
        });

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", () => {
            editingNoteIndex = null;
            notes.splice(index, 1);
            saveNotes();
            renderNotes();
        });

        noteCard.append(
            subjectHeading,
            noteText,
            noteDate,
            editButton,
            deleteButton
        );

        notesList.appendChild(noteCard);
    });

    if (notes.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No notes yet. Write your first one above.";
        notesList.appendChild(empty);
    }
}

if (notesForm && subjectInput && noteInput) {
    notesForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const subject = subjectInput.value.trim();
        const text = noteInput.value.trim();

        if (subject === "" || text === "") {
            return;
        }

        notes.push({
            subject,
            text,
            createdAt: new Date().toISOString()
        });

        saveNotes();
        renderNotes();
        showMessage("Note saved.");

        subjectInput.value = "";
        noteInput.value = "";
        subjectInput.focus();
    });
}

// ---------- Daily progress ----------

function updateDailyProgress() {
    const dailyCompletedElement = getElement("daily-completed");
    const dailyGoalElement = getElement("daily-goal");
    const progressBar = getElement("daily-progress-bar");
    const progressTrack = document.querySelector(".progress-track");
    const progressMessage = getElement("daily-progress-message");

    const completedToday = tasks.filter((task) => {
        return task.completed && task.completedDate === localDateKey();
    }).length;

    const dailyGoal = Math.max(
        1,
        Number(dailyGoalElement?.textContent) || 5
    );

    if (dailyCompletedElement) {
        dailyCompletedElement.textContent = String(completedToday);
    }

    if (progressBar) {
        const percentage = Math.min(
            100,
            Math.round((completedToday / dailyGoal) * 100)
        );

        progressBar.style.width = `${percentage}%`;
    }

    if (progressTrack) {
        const percentage = Math.min(
            100,
            Math.round((completedToday / dailyGoal) * 100)
        );

        progressTrack.setAttribute("role", "progressbar");
        progressTrack.setAttribute("aria-valuenow", String(percentage));
        progressTrack.setAttribute("aria-valuemin", "0");
        progressTrack.setAttribute("aria-valuemax", "100");
    }

    if (progressMessage) {
        if (completedToday === 0) {
            progressMessage.textContent = "Let's get started!";
        } else if (completedToday >= dailyGoal) {
            progressMessage.textContent =
                "Daily goal reached. Great work!";
        } else {
            progressMessage.textContent =
                `${dailyGoal - completedToday} more task(s) to reach your daily goal.`;
        }
    }
}

// ---------- Dashboard statistics ----------

function updateDashboardStats() {
    const totalTasksElement = getElement("total-tasks");
    const completedTasksElement = getElement("completed-tasks");
    const totalSkillsElement = getElement("total-skills");
    const totalSessionsElement = getElement("total-sessions");

    const completedTaskCount = tasks.filter(
        (task) => task.completed
    ).length;

    if (totalTasksElement) {
        totalTasksElement.textContent = String(tasks.length);
    }

    if (completedTasksElement) {
        completedTasksElement.textContent = String(completedTaskCount);
    }

    if (totalSkillsElement) {
        totalSkillsElement.textContent = String(skills.length);
    }

    if (totalSessionsElement) {
        totalSessionsElement.textContent = String(completedSessions);
    }

    updateDailyProgress();
}

// ---------- Initial page setup ----------

renderTasks();
renderSkills();
renderNotes();
loadTimerState();
displayTime();
updateSessionCount();
updateDashboardStats();

// Resume a timer that was running before the page was refreshed
if (timerEndTime !== null) {
    if (timeLeft > 0) {
        timerInterval = setInterval(tick, 1000);
    } else {
        finishTimer();
    }
}

// ---------- Active nav link ----------

const navLinks = document.querySelectorAll("nav a");
const pageSections = document.querySelectorAll("main section");

function setActiveLink(id) {
    navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${id}`;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "true");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

if ("IntersectionObserver" in window && pageSections.length > 0) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveLink(entry.target.id);
                }
            });
        },
        { rootMargin: "-35% 0px -55% 0px" }
    );

    pageSections.forEach((section) => observer.observe(section));
}

navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        setActiveLink(link.getAttribute("href").slice(1));
    });
});