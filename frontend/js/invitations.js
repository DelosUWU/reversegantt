const invitationsAlert = document.getElementById("invitationsAlert");
const invitationsSpinner = document.getElementById("invitationsSpinner");
const invitationsList = document.getElementById("invitationsList");
const invitationsRefresh = document.getElementById("invitationsRefresh");
const noInvitations = document.getElementById("noInvitations");
const logoutBtn = document.getElementById("logoutBtn");

let loadedInvitations = [];

function showInvitationsAlert(message, type = "danger") {
    if (!invitationsAlert) return;
    invitationsAlert.textContent = message;
    invitationsAlert.classList.remove("d-none", "alert-danger", "alert-success", "alert-warning");
    invitationsAlert.classList.add(`alert-${type}`);
}

function hideInvitationsAlert() {
    invitationsAlert?.classList.add("d-none");
}

function setInvitationsLoading(isLoading) {
    if (!invitationsSpinner) return;
    invitationsSpinner.classList.toggle("d-none", !isLoading);
}

function formatDate(value) {
    if (!value) {
        return "не указан";
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        return value;
    }
    return new Date(parsed).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function createInvitationCard(invitation) {
    const column = document.createElement("div");
    column.className = "col-12";

    const card = document.createElement("div");
    card.className = "card shadow-sm border-0";

    const body = document.createElement("div");
    body.className = "card-body";

    const header = document.createElement("div");
    header.className = "d-flex justify-content-between align-items-start mb-3";

    const title = document.createElement("h5");
    title.className = "mb-0";
    title.textContent = invitation.project?.name || "Проект";

    const statusBadge = document.createElement("span");
    if (invitation.status === "pending") {
        statusBadge.className = "badge bg-warning";
        statusBadge.textContent = "Ожидает ответа";
    } else if (invitation.status === "accepted") {
        statusBadge.className = "badge bg-success";
        statusBadge.textContent = "Принято";
    } else {
        statusBadge.className = "badge bg-secondary";
        statusBadge.textContent = "Отклонено";
    }

    header.append(title, statusBadge);

    const info = document.createElement("div");
    info.className = "mb-3";

    const inviterText = document.createElement("p");
    inviterText.className = "text-muted small mb-1";
    const inviterName = invitation.inviter ? 
        `${invitation.inviter.first_name || ""} ${invitation.inviter.last_name || ""}`.trim() || invitation.inviter.email :
        "Неизвестный пользователь";
    inviterText.textContent = `Пригласил: ${inviterName}`;

    const roleText = document.createElement("p");
    roleText.className = "text-muted small mb-1";
    roleText.textContent = `Роль: ${invitation.role === "leader" ? "Руководитель" : "Участник"}`;

    info.append(inviterText, roleText);

    const actions = document.createElement("div");
    actions.className = "d-flex gap-2";

    if (invitation.status === "pending") {
        const acceptBtn = document.createElement("button");
        acceptBtn.className = "btn btn-success btn-sm";
        acceptBtn.textContent = "Принять";
        acceptBtn.addEventListener("click", () => handleAcceptInvitation(invitation.id));

        const declineBtn = document.createElement("button");
        declineBtn.className = "btn btn-outline-danger btn-sm";
        declineBtn.textContent = "Отклонить";
        declineBtn.addEventListener("click", () => handleDeclineInvitation(invitation.id));

        actions.append(acceptBtn, declineBtn);
    } else {
        const projectLink = document.createElement("a");
        projectLink.className = "btn btn-outline-primary btn-sm";
        projectLink.href = `/project.html?id=${encodeURIComponent(invitation.project_id)}`;
        projectLink.textContent = "Открыть проект";
        actions.append(projectLink);
    }

    body.append(header, info, actions);
    card.append(body);
    column.append(card);

    return column;
}

function renderInvitations(invitations) {
    if (!invitationsList) return;

    invitationsList.innerHTML = "";
    noInvitations?.classList.add("d-none");

    if (!invitations || invitations.length === 0) {
        noInvitations?.classList.remove("d-none");
        return;
    }

    invitations.forEach(invitation => {
        const card = createInvitationCard(invitation);
        invitationsList.append(card);
    });
}

async function loadInvitations() {
    hideInvitationsAlert();
    setInvitationsLoading(true);

    try {
        const invitations = await listMyInvitations();
        loadedInvitations = Array.isArray(invitations) ? invitations : [];
        renderInvitations(loadedInvitations);
    } catch (err) {
        showInvitationsAlert(err.message || "Не удалось загрузить приглашения.");
        invitationsList.innerHTML = "";
    } finally {
        setInvitationsLoading(false);
    }
}

async function handleAcceptInvitation(invitationId) {
    hideInvitationsAlert();

    try {
        await acceptInvitation(invitationId);
        showInvitationsAlert("Приглашение принято!", "success");
        await loadInvitations();
    } catch (err) {
        showInvitationsAlert(err.message || "Не удалось принять приглашение.");
    }
}

async function handleDeclineInvitation(invitationId) {
    hideInvitationsAlert();

    try {
        await declineInvitation(invitationId);
        showInvitationsAlert("Приглашение отклонено.", "success");
        await loadInvitations();
    } catch (err) {
        showInvitationsAlert(err.message || "Не удалось отклонить приглашение.");
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

function initInvitationsPage() {
    if (!ensureAuth()) return;

    invitationsRefresh?.addEventListener("click", loadInvitations);
    logoutBtn?.addEventListener("click", handleLogout);

    loadInvitations();
}

initInvitationsPage();

