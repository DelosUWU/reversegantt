const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const registerSpinner = document.getElementById("registerSpinner");
const registerAlert = document.getElementById("registerAlert");

function showRegisterAlert(message, type = "danger") {
    if (!registerAlert) return;
    registerAlert.textContent = message;
    registerAlert.classList.remove("d-none", "alert-danger", "alert-success", "alert-warning");
    registerAlert.classList.add(`alert-${type}`);
}

function hideRegisterAlert() {
    registerAlert?.classList.add("d-none");
}

function setRegisterLoading(isLoading) {
    if (!registerSpinner || !registerBtn) return;
    registerSpinner.classList.toggle("d-none", !isLoading);
    if (isLoading) {
        registerBtn.setAttribute("disabled", "true");
    } else {
        registerBtn.removeAttribute("disabled");
    }
}

async function registerUser() {
    hideRegisterAlert();

    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const firstName = document.getElementById("registerFirstName").value.trim();
    const lastName = document.getElementById("registerLastName").value.trim();

    if (!email || !password) {
        showRegisterAlert("Email и пароль обязательны.");
        return;
    }

    setRegisterLoading(true);

    try {
        await apiRegister({
            email,
            password,
            first_name: firstName || undefined,
            last_name: lastName || undefined
        });

        showRegisterAlert("Аккаунт создан. Перенаправляем на вход...", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1400);
    } catch (err) {
        showRegisterAlert(err.message || "Не удалось зарегистрироваться.");
    } finally {
        setRegisterLoading(false);
    }
}

function initRegisterForm() {
    registerForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        registerUser();
    });
}

initRegisterForm();


