const loginAlert = document.getElementById("loginAlert");
const loginSpinner = document.getElementById("loginSpinner");
const loginBtn = document.getElementById("loginBtn");
const loginForm = document.getElementById("loginForm");

function showLoginAlert(message, type = "danger") {
    loginAlert.textContent = message;
    loginAlert.classList.remove("d-none", "alert-danger", "alert-success", "alert-warning");
    loginAlert.classList.add(`alert-${type}`);
}

function hideLoginAlert() {
    loginAlert.classList.add("d-none");
}

function setLoading(isLoading) {
    if (isLoading) {
        loginSpinner.classList.remove("d-none");
        loginBtn.setAttribute("disabled", "true");
    } else {
        loginSpinner.classList.add("d-none");
        loginBtn.removeAttribute("disabled");
    }
}

async function login() {
    hideLoginAlert();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        showLoginAlert("Введите email и пароль.");
        return;
    }

    setLoading(true);

    try {
        const data = await apiLogin(email, password);
        setToken(data.access_token);
        window.location.href = "projects.html";
    } catch (err) {
        showLoginAlert(err.message || "Не удалось авторизоваться.");
    } finally {
        setLoading(false);
    }
}

function initAuthPage() {
    const existingToken = getToken();
    if (existingToken) {
        window.location.href = "projects.html";
        return;
    }

    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        login();
    });
}

initAuthPage();
