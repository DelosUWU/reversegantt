const projectAlert = document.getElementById("projectAlert");
const projectTitleNav = document.getElementById("projectTitle");
const projectTitleHeader = document.getElementById("projectTitleHeader");
const projectDesc = document.getElementById("projectDesc");
const projectOwnerText = document.getElementById("projectOwnerText");
const projectIdBadge = document.getElementById("projectIdBadge");
const projectDeadlineText = document.getElementById("projectDeadlineText");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");
const taskList = document.getElementById("taskList");
const tasksLoadingSpinner = document.getElementById("tasksLoadingSpinner");
const taskForm = document.getElementById("taskForm");
const taskSubmit = document.getElementById("taskSubmit");
const taskSpinner = document.getElementById("taskSpinner");
const taskTitleInput = document.getElementById("taskTitle");
const taskDescInput = document.getElementById("taskDesc");
const taskDeadlineInput = document.getElementById("taskDeadline");
const taskParentSelect = document.getElementById("taskParent");
const taskAssigneeSelect = document.getElementById("taskAssignee");
const participantsList = document.getElementById("participantsList");
const participantForm = document.getElementById("participantForm");
const participantEmailInput = document.getElementById("participantEmail");
const participantRoleInput = document.getElementById("participantRole");
const participantBtn = document.getElementById("participantBtn");
const participantSpinner = document.getElementById("participantSpinner");

const queryParams = new URLSearchParams(window.location.search);
const projectId = queryParams.get("id");

let currentUser = null;
let currentProject = null;
let loadedTasks = [];
let loadedMembers = [];
let projectOwnerAsMember = null;

function formatUserLabel(user, fallbackId) {
    if (!user) return fallbackId || "Участник";
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    if (name) return name;
    if (user.email) return user.email;
    return fallbackId || "Участник";
}

const STATUS_BADGES = {
    New: "secondary",
    InProgress: "warning",
    UnderReview: "info",
    Completed: "success",
    Overdue: "danger",
    Cancelled: "dark"
};

const STATUS_LABELS = {
    New: "Новая",
    InProgress: "В работе",
    UnderReview: "На проверке",
    Completed: "Завершенная",
    Overdue: "Просрочена",
    Cancelled: "Отменена"
};

function getStatusStyle(status) {
    const color = STATUS_BADGES[status] || "secondary";
    const textClass = color === "warning" || color === "light" ? "text-dark" : "text-white";
    return { color, textClass };
}

function showProjectAlert(message, type = "danger") {
    if (!projectAlert) return;
    projectAlert.textContent = message;
    projectAlert.classList.remove("d-none", "alert-danger", "alert-success", "alert-warning");
    projectAlert.classList.add(`alert-${type}`);
}

function hideProjectAlert() {
    projectAlert?.classList.add("d-none");
}

function setTasksLoading(isLoading) {
    if (!tasksLoadingSpinner) return;
    tasksLoadingSpinner.classList.toggle("d-none", !isLoading);
}

function setTaskFormLoading(isLoading) {
    if (!taskSpinner || !taskSubmit) return;
    taskSpinner.classList.toggle("d-none", !isLoading);
    if (isLoading) {
        taskSubmit.setAttribute("disabled", "true");
    } else {
        taskSubmit.removeAttribute("disabled");
    }
}

function setParticipantLoading(isLoading) {
    if (!participantSpinner || !participantBtn) return;
    participantSpinner.classList.toggle("d-none", !isLoading);
    if (isLoading) {
        participantBtn.setAttribute("disabled", "true");
    } else {
        participantBtn.removeAttribute("disabled");
    }
}

function formatDate(value) {
    if (!value) {
        return "не указан";
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        return value;
    }
    return new Date(parsed).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderTasks(tasks) {
    if (!taskList) return;

    const tasksById = tasks.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {});

    taskList.innerHTML = "";

    if (!tasks.length) {
        const placeholder = document.createElement("li");
        placeholder.className = "list-group-item text-muted text-center";
        placeholder.textContent = "Задач пока нет.";
        taskList.append(placeholder);
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "list-group-item border-0 rounded-3 shadow-sm mb-2";

        const titleRow = document.createElement("div");
        titleRow.className = "d-flex justify-content-between align-items-center mb-1";

        const title = document.createElement("h6");
        title.className = "mb-0";
        title.textContent = task.name;

        const controls = document.createElement("div");
        controls.className = "d-flex align-items-center gap-2";

        const applyStatusSelectStyle = (selectEl, statusValue) => {
            const { color, textClass } = getStatusStyle(statusValue);
            selectEl.className = `form-select form-select-sm w-auto bg-${color} ${textClass}`;
        };

        const canChangeStatus = currentUser && task.assigned_to_id === currentUser.id;
        let statusSelect;
        if (canChangeStatus) {
            statusSelect = document.createElement("select");
            const options = [
                { value: "New", label: STATUS_LABELS.New },
                { value: "InProgress", label: STATUS_LABELS.InProgress },
                { value: "UnderReview", label: STATUS_LABELS.UnderReview },
                { value: "Completed", label: STATUS_LABELS.Completed }
            ];
            options.forEach(opt => {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                if (opt.value === task.status) o.selected = true;
                statusSelect.appendChild(o);
            });
            applyStatusSelectStyle(statusSelect, task.status);
            statusSelect.addEventListener("change", async (e) => {
                const newStatus = e.target.value;
                try {
                    await changeTaskStatus(task.id, newStatus);
                    showProjectAlert("Статус задачи обновлен.", "success");
                    await loadTasks();
                } catch (err) {
                    showProjectAlert(err.message || "Не удалось изменить статус задачи.");
                    // вернуть предыдущее значение
                    statusSelect.value = task.status;
                } finally {
                    applyStatusSelectStyle(statusSelect, statusSelect.value);
                }
            });
        }

        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-sm btn-outline-danger";
        delBtn.textContent = "Удалить";
        delBtn.addEventListener("click", async () => {
            try {
                await window.deleteTask(task.id);
                showProjectAlert("Задача удалена.", "success");
                await loadTasks();
            } catch (err) {
                showProjectAlert(err.message || "Не удалось удалить задачу.");
            }
        });

        if (statusSelect) {
            controls.append(statusSelect, delBtn);
        } else {
            const badge = document.createElement("span");
            const { color } = getStatusStyle(task.status);
            badge.className = `badge bg-${color}`;
            badge.textContent = STATUS_LABELS[task.status] || task.status || "Статус";
            controls.append(badge, delBtn);
        }
        titleRow.append(title, controls);

        const desc = document.createElement("p");
        desc.className = "mb-1 text-muted small";
        desc.textContent = task.description || "Описание отсутствует";

        const meta = document.createElement("div");
        meta.className = "d-flex flex-wrap gap-3 text-secondary small";

        const deadline = document.createElement("span");
        deadline.textContent = `Дедлайн: ${formatDate(task.deadline)}`;

        const created = document.createElement("span");
        created.textContent = `Создана: ${formatDate(task.created_at)}`;

        const parentSelect = document.createElement("select");
        parentSelect.className = "form-select form-select-sm w-auto";
        const noneOption = document.createElement("option");
        noneOption.value = "";
        noneOption.textContent = "Нет";
        parentSelect.appendChild(noneOption);
        loadedTasks
            .filter(t => t.id !== task.id)
            .forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.id;
                opt.textContent = t.name || t.id;
                if (t.id === task.parent_task_id) opt.selected = true;
                parentSelect.appendChild(opt);
            });
        parentSelect.addEventListener("change", async (e) => {
            const newParentId = e.target.value || null;
            try {
                await updateTask(task.id, buildTaskUpdatePayload(task, newParentId));
                showProjectAlert("Родительская задача обновлена.", "success");
                await loadTasks();
            } catch (err) {
                showProjectAlert(err.message || "Не удалось обновить задачу.");
                // откатить визуально
                parentSelect.value = task.parent_task_id || "";
            }
        });

        // Родитель и исполнитель в одной строке
        const rowWrapper = document.createElement("div");
        rowWrapper.className = "d-flex flex-wrap align-items-center gap-3";

        const parentWrapper = document.createElement("div");
        parentWrapper.className = "d-flex align-items-center gap-2";
        const parentLabel = document.createElement("span");
        parentLabel.textContent = "Родительская задача:";
        parentLabel.className = "text-secondary";
        parentWrapper.append(parentLabel, parentSelect);

        // Исполнитель
        const assigneeSelect = document.createElement("select");
        assigneeSelect.className = "form-select form-select-sm w-auto";
        const assigneeNone = document.createElement("option");
        assigneeNone.value = "";
        assigneeNone.textContent = "Не назначен";
        assigneeSelect.appendChild(assigneeNone);
        const assigneeList = projectOwnerAsMember ? [projectOwnerAsMember, ...loadedMembers] : loadedMembers;
        assigneeList.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.user?.id || m.user_id;
            opt.textContent = formatUserLabel(m.user, m.user_id);
            if (opt.value === task.assigned_to_id) opt.selected = true;
            assigneeSelect.appendChild(opt);
        });
        assigneeSelect.addEventListener("change", async (e) => {
            const newAssigneeId = e.target.value || null;
            try {
                await updateTask(task.id, buildTaskUpdatePayload(task, task.parent_task_id, newAssigneeId));
                showProjectAlert("Исполнитель задачи обновлен.", "success");
                await loadTasks();
            } catch (err) {
                showProjectAlert(err.message || "Не удалось обновить исполнителя.");
                assigneeSelect.value = task.assigned_to_id || "";
            }
        });

        const assigneeWrapper = document.createElement("div");
        assigneeWrapper.className = "d-flex align-items-center gap-2";
        const assigneeLabel = document.createElement("span");
        assigneeLabel.textContent = "Исполнитель:";
        assigneeLabel.className = "text-secondary";
        assigneeWrapper.append(assigneeLabel, assigneeSelect);

        rowWrapper.append(parentWrapper, assigneeWrapper);

        meta.append(deadline, created, rowWrapper);

        li.append(titleRow, desc, meta);
        taskList.append(li);
    });
}

function renderParticipants(members) {
    if (!participantsList) return;

    participantsList.innerHTML = "";

    if (!members.length) {
        const placeholder = document.createElement("li");
        placeholder.className = "list-group-item text-muted text-center";
        placeholder.textContent = "Участников пока нет.";
        participantsList.append(placeholder);
        return;
    }

    const canEditRoles = (project) => {
        // редактировать может владелец проекта или лидер
        if (!currentUser || !currentProject) return false;
        if (currentProject.owner_id === currentUser.id) return true;
        // Найти membership текущего пользователя
        const me = members.find(m => m.user && m.user.id === currentUser.id);
        return me && me.role === "leader";
    };

    const editable = canEditRoles(currentProject);

    members.forEach(member => {
        const li = document.createElement("li");
        li.className = "list-group-item border-0 rounded-3 shadow-sm mb-2 d-flex justify-content-between align-items-center";

        const left = document.createElement("div");
        const name = member.user?.first_name || member.user?.email || "Пользователь";
        const surname = member.user?.last_name;
        const email = member.user?.email;
        left.innerHTML = `<strong>${[name, surname].filter(Boolean).join(" ")}</strong><br><small class="text-muted">${email || member.user_id}</small>`;

        // Правый блок: селектор роли и кнопка Удалить (если разрешено)
        const right = document.createElement("div");
        right.className = "d-flex align-items-center gap-2";

        const isOwner = currentProject && currentProject.owner_id === (member.user?.id || member.user_id);

        if (editable && !isOwner) {
            const select = document.createElement("select");
            select.className = "form-select form-select-sm w-auto";
            const roles = [
                { value: "member", label: "Участник" },
                { value: "leader", label: "Руководитель" }
            ];
            roles.forEach(r => {
                const o = document.createElement("option");
                o.value = r.value;
                o.textContent = r.label;
                if (r.value === member.role) o.selected = true;
                select.appendChild(o);
            });
            select.addEventListener("change", async (e) => {
                const newRole = e.target.value;
                try {
                    await updateMemberRole(member.id, newRole);
                    showProjectAlert("Роль участника обновлена.", "success");
                    await loadParticipants();
                } catch (err) {
                    showProjectAlert(err.message || "Не удалось изменить роль участника.");
                    select.value = member.role;
                }
            });
            right.appendChild(select);

            const removeBtn = document.createElement("button");
            removeBtn.className = "btn btn-sm btn-outline-danger";
            removeBtn.textContent = "Удалить";
            removeBtn.addEventListener("click", async () => {
                const confirmText = `Удалить участника ${member.user?.email || member.user_id || ""}?`;
                if (!window.confirm(confirmText)) return;
                removeBtn.setAttribute("disabled", "true");
                try {
                    await removeMember(member.id);
                    showProjectAlert("Участник удален.", "success");
                    await loadParticipants();
                } catch (err) {
                    showProjectAlert(err.message || "Не удалось удалить участника.");
                } finally {
                    removeBtn.removeAttribute("disabled");
                }
            });
            right.appendChild(removeBtn);
        } else {
            const badge = document.createElement("span");
            const roleColor = member.role === "leader" ? "primary" : "secondary";
            badge.className = `badge bg-${roleColor} text-capitalize`;
            badge.textContent = isOwner ? "owner" : member.role;
            right.appendChild(badge);
        }

        li.append(left, right);
        participantsList.append(li);
    });
}

async function loadCurrentUser() {
    try {
        currentUser = await getCurrentUser();
        return currentUser;
    } catch (err) {
        showProjectAlert("Ошибка загрузки информации о пользователе.", "danger");
        throw err;
    }
}

async function loadProject() {
    if (!projectId) {
        showProjectAlert("ID проекта не указан.", "warning");
        return;
    }

    hideProjectAlert();
    setTasksLoading(true);

    try {
        const project = await fetchProjectById(projectId);
        currentProject = project;
        
        projectTitleNav && (projectTitleNav.textContent = project.name || "Проект");
        projectTitleHeader && (projectTitleHeader.textContent = project.name || "Проект");
        
        // Правильно отображаем владельца - проверяем ID текущего пользователя
        let ownerText = "Владелец: не назначен";
        if (project.owner) {
            const ownerName = `${project.owner.first_name || ""} ${project.owner.last_name || ""}`.trim() || project.owner.email;
            const isCurrentUserOwner = currentUser && project.owner_id === currentUser.id;
            ownerText = isCurrentUserOwner 
                ? `Владелец: ${ownerName} (Вы)` 
                : `Владелец: ${ownerName}`;
        }
        projectOwnerText && (projectOwnerText.textContent = ownerText);
        projectIdBadge && (projectIdBadge.textContent = project.id);

        const deadlineText = project.final_deadline
            ? `Дедлайн: ${formatDate(project.final_deadline)}`
            : "Дедлайн: не установлен";
        projectDeadlineText && (projectDeadlineText.textContent = deadlineText);

        // Показать кнопку удаления только владельцу
        const isOwner = currentUser && project.owner_id === currentUser.id;
        if (deleteProjectBtn) {
            deleteProjectBtn.classList.toggle("d-none", !isOwner);
        }

        // Сохраняем владельца как потенциального исполнителя
        projectOwnerAsMember = null;
        if (project.owner) {
            projectOwnerAsMember = {
                user_id: project.owner.id,
                user: project.owner,
                role: "owner"
            };
        }
    } catch (err) {
        showProjectAlert(err.message || "Ошибка загрузки проекта.");
    } finally {
        setTasksLoading(false);
    }
}

async function handleDeleteProject() {
    if (!projectId) return;
    const confirmed = window.confirm("Удалить проект и все связанные данные?");
    if (!confirmed) return;

    try {
        const deleter = window.deleteProject || deleteProject;
        await deleter(projectId);
        showProjectAlert("Проект удален.", "success");
        window.location.href = "projects.html";
    } catch (err) {
        showProjectAlert(err.message || "Не удалось удалить проект.");
    }
}

async function loadTasks() {
    if (!projectId) {
        return;
    }

    setTasksLoading(true);
    hideProjectAlert();

    try {
        const tasks = await fetchProjectTasks(projectId);
        loadedTasks = Array.isArray(tasks) ? tasks : [];
        renderTasks(loadedTasks);
        updateParentSelectOptions();
    } catch (err) {
        showProjectAlert(err.message || "Не удалось загрузить задачи.");
    } finally {
        setTasksLoading(false);
    }
}

async function loadParticipants() {
    if (!projectId) {
        return;
    }

    hideProjectAlert();

    try {
        const members = await fetchProjectMembers(projectId);
        loadedMembers = Array.isArray(members) ? members : [];
        renderParticipants(loadedMembers);
        updateAssigneeSelectOptions();
    } catch (err) {
        showProjectAlert(err.message || "Не удалось загрузить участников.");
    }
}

function resetTaskForm() {
    taskForm?.reset();
    taskTitleInput?.classList.remove("is-invalid");
}

function resetParticipantForm() {
    participantForm?.reset();
}

function updateParentSelectOptions() {
    if (!taskParentSelect) return;
    const currentValue = taskParentSelect.value;
    taskParentSelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Нет (корневая)";
    taskParentSelect.appendChild(defaultOption);

    loadedTasks.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name || t.id;
        taskParentSelect.appendChild(opt);
    });

    // если не нашли предыдущее значение, сбросим на "нет"
    taskParentSelect.value = currentValue || "";
}

function updateAssigneeSelectOptions() {
    if (!taskAssigneeSelect) return;
    const currentValue = taskAssigneeSelect.value;
    taskAssigneeSelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Не назначен";
    taskAssigneeSelect.appendChild(defaultOption);

    const list = [...loadedMembers];
    if (projectOwnerAsMember) {
        list.unshift(projectOwnerAsMember);
    }

    list.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.user?.id || m.user_id;
        opt.textContent = formatUserLabel(m.user, m.user_id);
        taskAssigneeSelect.appendChild(opt);
    });

    taskAssigneeSelect.value = currentValue || "";
}

function buildTaskUpdatePayload(task, newParentId, newAssigneeId) {
    return {
        name: task.name,
        description: task.description,
        deadline: task.deadline,
        project_id: task.project_id,
        parent_task_id: newParentId !== undefined ? (newParentId || null) : task.parent_task_id,
        assigned_to_id: newAssigneeId !== undefined ? (newAssigneeId || null) : task.assigned_to_id
    };
}

async function handleTaskSubmit(event) {
    event.preventDefault();

    const title = taskTitleInput?.value.trim();
    if (!title) {
        taskTitleInput?.classList.add("is-invalid");
        showProjectAlert("Название задачи обязательно.");
        return;
    }

    setTaskFormLoading(true);
    hideProjectAlert();

    const payload = {
        name: title,
        description: taskDescInput?.value.trim() || undefined,
        project_id: projectId
    };

    const parentId = taskParentSelect?.value;
    if (parentId) {
        payload.parent_task_id = parentId;
    } else {
        payload.parent_task_id = null;
    }

    const assigneeId = taskAssigneeSelect?.value;
    if (assigneeId) {
        payload.assigned_to_id = assigneeId;
    } else {
        payload.assigned_to_id = null;
    }

    const deadlineRaw = taskDeadlineInput?.value;
    if (deadlineRaw) {
        const parsed = Date.parse(deadlineRaw);
        if (!Number.isNaN(parsed)) {
            payload.deadline = new Date(parsed).toISOString();
        }
    }

    try {
        await createTask(payload);
        showProjectAlert("Задача создана.", "success");
        resetTaskForm();
        await loadTasks();
    } catch (err) {
        showProjectAlert(err.message || "Не удалось создать задачу.");
    } finally {
        setTaskFormLoading(false);
    }
}

async function handleAddParticipant(event) {
    event.preventDefault();

    const email = participantEmailInput?.value.trim();
    if (!email) {
        showProjectAlert("Email участника обязателен.");
        return;
    }

    const role = participantRoleInput?.value || "member";
    setParticipantLoading(true);
    hideProjectAlert();

    try {
        await createInvitation(projectId, { invitee_email: email, role });
        showProjectAlert("Приглашение отправлено.", "success");
        resetParticipantForm();
    } catch (err) {
        showProjectAlert(err.message || "Не удалось отправить приглашение.");
    } finally {
        setParticipantLoading(false);
    }
}

async function initProjectPage() {
    if (!projectId) {
        showProjectAlert("ID проекта не указан в URL.", "warning");
        return;
    }

    try {
        // Сначала загружаем текущего пользователя
        await loadCurrentUser();
        
        taskForm?.addEventListener("submit", handleTaskSubmit);
        participantForm?.addEventListener("submit", handleAddParticipant);
        deleteProjectBtn?.addEventListener("click", handleDeleteProject);
        
        await loadProject();
        await loadTasks();
        await loadParticipants();
    } catch (err) {
        showProjectAlert(err.message || "Ошибка инициализации страницы.");
    }
}

// Fallback: ensure deleteTask is available globally even if api.js was cached without export
if (!window.deleteTask) {
    window.deleteTask = async function(taskId) {
        const { response, payload } = await fetchWithAuth(`/tasks/${encodeURIComponent(taskId)}`, {
            method: "DELETE"
        });
        if (!response.ok) {
            throw new Error(payload?.detail || "Не удалось удалить задачу");
        }
        return payload;
    };
}

// Fallback: ensure updateTask is available globally even if api.js was cached without export
if (!window.updateTask) {
    window.updateTask = async function(taskId, body) {
        const { response, payload } = await fetchWithAuth(`/tasks/${encodeURIComponent(taskId)}`, {
            method: "PUT",
            body
        });
        if (!response.ok) {
            throw new Error(payload?.detail || "Не удалось обновить задачу");
        }
        return payload;
    };
}

// Fallback: ensure deleteProject is available globally even if api.js was cached without export
if (!window.deleteProject) {
    window.deleteProject = async function(projectId) {
        const { response, payload } = await fetchWithAuth(`/projects/${encodeURIComponent(projectId)}`, {
            method: "DELETE"
        });
        if (!response.ok) {
            throw new Error(payload?.detail || "Не удалось удалить проект");
        }
        return payload;
    };
}

initProjectPage();

