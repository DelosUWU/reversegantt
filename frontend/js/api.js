const API_URL = "http://localhost:8000";
const TOKEN_STORAGE_KEY = "token";

function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiLogin(email, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message = payload?.detail || payload?.message || "Ошибка авторизации";
        throw new Error(message);
    }

    return payload;
}

async function apiRegister(payload) {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data?.detail || data?.message || "Не удалось зарегистрироваться";
        throw new Error(message);
    }

    return data;
}

async function fetchWithAuth(path, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error("Авторизация обязательна");
    }

    const { headers: customHeaders = {}, body, ...rest } = options;
    const fullHeaders = {
        Authorization: `Bearer ${token}`,
        ...customHeaders
    };

    let serializedBody;
    if (body !== undefined) {
        if (body instanceof FormData) {
            serializedBody = body;
        } else {
            serializedBody = JSON.stringify(body);
            if (!("Content-Type" in fullHeaders)) {
                fullHeaders["Content-Type"] = "application/json";
            }
        }
    }

    const fetchOptions = {
        ...rest,
        headers: fullHeaders
    };

    if (serializedBody !== undefined) {
        fetchOptions.body = serializedBody;
    }

    const response = await fetch(`${API_URL}${path}`, fetchOptions);

    if (response.status === 401) {
        removeToken();
        window.location.href = "/index.html";
        throw new Error("Сессия истекла. Пожалуйста, войдите снова.");
    }

    const payload = await response.json().catch(() => null);
    return { response, payload };
}

async function fetchProjects() {
    const { response, payload } = await fetchWithAuth("/projects");

    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось загрузить проекты");
    }

    return payload;
}

async function createProject(payload) {
    const { response, payload: data } = await fetchWithAuth("/projects", {
        method: "POST",
        body: payload
    });

    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось создать проект");
    }

    return data;
}

async function deleteProject(projectId) {
    const { response, payload } = await fetchWithAuth(`/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось удалить проект");
    }
    return payload;
}

// expose for non-module usage
window.deleteProject = deleteProject;

async function fetchProjectById(projectId) {
    const { response, payload } = await fetchWithAuth(`/projects/${encodeURIComponent(projectId)}`);
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось загрузить проект");
    }
    return payload;
}

async function fetchProjectTasks(projectId) {
    const { response, payload } = await fetchWithAuth(`/projects/${encodeURIComponent(projectId)}/tasks`);
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось загрузить задачи");
    }
    return payload;
}

async function createTask(payload) {
    const { response, payload: data } = await fetchWithAuth("/tasks", {
        method: "POST",
        body: payload
    });

    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось создать задачу");
    }

    return data;
}

async function deleteTask(taskId) {
    const { response, payload } = await fetchWithAuth(`/tasks/${encodeURIComponent(taskId)}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось удалить задачу");
    }
    return payload;
}


window.deleteTask = deleteTask;
window.updateTask = updateTask;

async function updateTask(taskId, payload) {
    const { response, payload: data } = await fetchWithAuth(`/tasks/${encodeURIComponent(taskId)}`, {
        method: "PUT",
        body: payload
    });
    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось обновить задачу");
    }
    return data;
}

async function changeTaskStatus(taskId, status) {
    const { response, payload } = await fetchWithAuth(`/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "PATCH",
        body: { status }
    });
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось изменить статус задачи");
    }
    return payload;
}


window.changeTaskStatus = changeTaskStatus;

async function fetchProjectMembers(projectId) {
    const { response, payload } = await fetchWithAuth(`/projects/${encodeURIComponent(projectId)}/members`);
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось загрузить участников");
    }

    return payload;
}

async function removeMember(membershipId) {
    const { response, payload } = await fetchWithAuth(`/memberships/${encodeURIComponent(membershipId)}`, {
        method: "DELETE"
    });
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось удалить участника");
    }
    return payload;
}

window.removeMember = removeMember;

async function updateMemberRole(membershipId, role) {
    const { response, payload } = await fetchWithAuth(`/memberships/${encodeURIComponent(membershipId)}/role`, {
        method: "PATCH",
        body: { role }
    });
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось изменить роль участника");
    }
    return payload;
}

window.updateMemberRole = updateMemberRole;

async function getCurrentUser() {
    const { response, payload } = await fetchWithAuth("/users/me");
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось получить информацию о пользователе");
    }
    return payload;
}

// Invitations
async function createInvitation(projectId, payload) {
    const { response, payload: data } = await fetchWithAuth(`/projects/${encodeURIComponent(projectId)}/invitations`, {
        method: "POST",
        body: payload
    });

    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось создать приглашение");
    }

    return data;
}

async function listMyInvitations() {
    const { response, payload } = await fetchWithAuth("/invitations");
    if (!response.ok) {
        throw new Error(payload?.detail || "Не удалось загрузить приглашения");
    }
    return payload;
}

async function acceptInvitation(invitationId) {
    const { response, payload: data } = await fetchWithAuth(`/invitations/${encodeURIComponent(invitationId)}/accept`, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось принять приглашение");
    }

    return data;
}

async function declineInvitation(invitationId) {
    const { response, payload: data } = await fetchWithAuth(`/invitations/${encodeURIComponent(invitationId)}/decline`, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось отклонить приглашение");
    }

    return data;
}
