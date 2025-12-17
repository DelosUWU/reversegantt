const projectsAlert = document.getElementById("projectsAlert");
const projectsSpinner = document.getElementById("projectsSpinner");
const projectsContainer = document.getElementById("projectGrid");
const logoutBtn = document.getElementById("logoutBtn");
const createProjectForm = document.getElementById("createProjectForm");
const createProjectBtn = document.getElementById("createProjectBtn");
const createProjectSpinner = document.getElementById("createProjectSpinner");
const createProjectModalEl = document.getElementById("createProjectModal");
const projectNameInput = document.getElementById("projectName");
const projectDeadlineInput = document.getElementById("projectDeadline");
const projectModal = createProjectModalEl && window.bootstrap ? new window.bootstrap.Modal(createProjectModalEl) : null;

let loadedProjects = [];
let currentUser = null;

function showProjectsAlert(message, type = "danger") {
    if (!projectsAlert) return;

    projectsAlert.textContent = message;
    projectsAlert.classList.remove("d-none", "alert-danger", "alert-warning", "alert-success");
    projectsAlert.classList.add(`alert-${type}`);
}

function hideProjectsAlert() {
    projectsAlert?.classList.add("d-none");
}

function setProjectsLoading(isLoading) {
    if (!projectsSpinner) return;
    projectsSpinner.classList.toggle("d-none", !isLoading);
}

function formatDeadline(value) {
    if (!value) {
        return "не установлен";
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return "не определён";
    }
    return new Date(timestamp).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function createProjectCard(project) {
    const column = document.createElement("div");
    column.className = "col-sm-6 col-lg-4";

    const card = document.createElement("div");
    card.className = "card h-100 shadow-sm border-0";

    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    const header = document.createElement("div");
    header.className = "d-flex justify-content-between align-items-start mb-2";

    const title = document.createElement("h5");
    title.className = "card-title mb-1 text-truncate";
    title.textContent = project.name || "Без названия";

    // Правильно показываем роль - проверяем ID текущего пользователя
    const isOwner = currentUser && project.owner_id === currentUser.id;
    const ownerBadge = document.createElement("span");
    if (isOwner) {
        ownerBadge.className = "badge bg-primary";
        ownerBadge.textContent = "Вы владелец";
    } else if (project.owner_id) {
        ownerBadge.className = "badge bg-secondary";
        ownerBadge.textContent = "Участник";
    } else {
        ownerBadge.className = "badge bg-light text-dark";
        ownerBadge.textContent = "Без владельца";
    }

    header.append(title, ownerBadge);

    const ownerLine = document.createElement("p");
    ownerLine.className = "card-text text-muted small mb-2";
    if (project.owner) {
        const ownerName = `${project.owner.first_name || ""} ${project.owner.last_name || ""}`.trim() || project.owner.email;
        ownerLine.textContent = `Владелец: ${ownerName}`;
    } else {
        ownerLine.textContent = "Владелец: не назначен";
    }

    const meta = document.createElement("p");
    meta.className = "card-text text-muted small mb-3";
    meta.textContent = `ID: ${project.id}`;

    const footer = document.createElement("div");
    footer.className = "mt-auto";

    const deadlineText = document.createElement("p");
    deadlineText.className = "small text-secondary mb-2";
    deadlineText.textContent = `Дедлайн: ${formatDeadline(project.final_deadline)}`;

    const openLink = document.createElement("a");
    openLink.className = "btn btn-outline-primary btn-sm w-100";
    openLink.href = `project.html?id=${encodeURIComponent(project.id)}`;
    openLink.textContent = "Открыть проект";

    footer.append(deadlineText, openLink);
    body.append(header, ownerLine, meta, footer);
    card.append(body);
    column.append(card);

    return column;
}

function renderProjects(list) {
    if (!projectsContainer) return;

    projectsContainer.innerHTML = "";

    if (!list.length) {
        const placeholder = document.createElement("div");
        placeholder.className = "col-12";
        const info = document.createElement("div");
        info.className = "alert alert-info mb-0";
        info.textContent = "Пока нет проектов. Создайте новый, когда появится возможность.";
        placeholder.append(info);
        projectsContainer.append(placeholder);
        return;
    }

    list.forEach(project => {
        const card = createProjectCard(project);
        projectsContainer.append(card);
    });
}

function sortProjects(list) {
    return [...list].sort((a, b) => {
        const parseDateValue = (value) => {
            if (!value) return Number.MAX_SAFE_INTEGER;
            const timestamp = Date.parse(value);
            return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
        };

        return parseDateValue(a.final_deadline) - parseDateValue(b.final_deadline);
    });
}

async function loadCurrentUser() {
    try {
        currentUser = await getCurrentUser();
        return currentUser;
    } catch (err) {
        console.error("Failed to load current user:", err);
        return null;
    }
}

async function loadProjects() {
    hideProjectsAlert();
    setProjectsLoading(true);

    try {
        const projects = await fetchProjects();
        loadedProjects = Array.isArray(projects) ? sortProjects(projects) : [];
        renderProjects(loadedProjects);
    } catch (err) {
        showProjectsAlert(err.message || "Не удалось загрузить проекты.");
        projectsContainer.innerHTML = "";
    } finally {
        setProjectsLoading(false);
    }
}

function ensureAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

function handleLogout() {
    removeToken();
    window.location.href = "index.html";
}

async function initProjectsPage() {
    if (!ensureAuth()) return;

    // Загружаем текущего пользователя
    await loadCurrentUser();

    logoutBtn?.addEventListener("click", handleLogout);
    createProjectForm?.addEventListener("submit", handleCreateProject);

    createProjectModalEl?.addEventListener("hidden.bs.modal", () => {
        resetCreateProjectForm();
    });

    await loadProjects();
}

initProjectsPage();

function resetCreateProjectForm() {
    createProjectForm?.reset();
    projectNameInput?.classList.remove("is-invalid");
}

function setCreateProjectLoading(isLoading) {
    if (!createProjectBtn || !createProjectSpinner) return;
    createProjectSpinner.classList.toggle("d-none", !isLoading);
    if (isLoading) {
        createProjectBtn.setAttribute("disabled", "true");
    } else {
        createProjectBtn.removeAttribute("disabled");
    }
}

function buildProjectPayload() {
    const name = projectNameInput?.value.trim();
    const deadlineRaw = projectDeadlineInput?.value;

    const payload = { name };

    if (deadlineRaw) {
        const timestamp = Date.parse(deadlineRaw);
        if (!Number.isNaN(timestamp)) {
            payload.final_deadline = new Date(timestamp).toISOString();
        }
    }

    return payload;
}

async function handleCreateProject(event) {
    event.preventDefault();

    const name = projectNameInput?.value.trim();
    if (!name) {
        projectNameInput?.classList.add("is-invalid");
        showProjectsAlert("Название проекта обязательно.");
        return;
    }

    setCreateProjectLoading(true);
    hideProjectsAlert();

    try {
        await createProject(buildProjectPayload());
        showProjectsAlert("Проект создан.", "success");
        projectModal?.hide();
        resetCreateProjectForm();
        loadProjects();
    } catch (err) {
        showProjectsAlert(err.message || "Не удалось создать проект.");
    } finally {
        setCreateProjectLoading(false);
    }
}

