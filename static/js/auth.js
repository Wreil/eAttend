/**
 * eAttend Authentication Handler
 * Login page logic.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect to dashboard if already logged in
    if (Auth.isAuthenticated()) {
        window.location.href = '/dashboard/';
        return;
    }

    const form = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const alert = document.getElementById('login-alert');
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn ? loginBtn.querySelector('.btn-text') : null;
    const btnLoading = loginBtn ? loginBtn.querySelector('.btn-loading') : null;
    const registerBtn = document.getElementById('register-btn');
    const registerBtnText = registerBtn ? registerBtn.querySelector('.btn-text') : null;
    const registerBtnLoading = registerBtn ? registerBtn.querySelector('.btn-loading') : null;
    const togglePass = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');

    if (!form || !alert || !loginBtn || !passwordInput) {
        return;
    }

    // Toggle password visibility
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            const icon = togglePass.querySelector('i');
            if (icon) {
                icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showAlert('Please enter your username and password.', 'danger');
            return;
        }

        setLoading(true);
        hideAlert();

        try {
            const data = await API.login(username, password);
            Auth.setTokens(data.access, data.refresh);
            Auth.setUser(data.user);
            window.location.href = '/dashboard/';
        } catch (err) {
            showAlert(err.message || 'Invalid username or password.', 'danger');
        } finally {
            setLoading(false);
        }
    });

    if (showRegisterBtn && registerForm) {
        showRegisterBtn.addEventListener('click', () => {
            hideAlert();
            form.classList.add('d-none');
            showRegisterBtn.classList.add('d-none');
            registerForm.classList.remove('d-none');
        });
    }

    if (backToLoginBtn && registerForm && showRegisterBtn) {
        backToLoginBtn.addEventListener('click', () => {
            hideAlert();
            registerForm.classList.add('d-none');
            form.classList.remove('d-none');
            showRegisterBtn.classList.remove('d-none');
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullNameEl = document.getElementById('reg-full-name');
            const usernameEl = document.getElementById('reg-username');
            const emailEl = document.getElementById('reg-email');
            const passwordEl = document.getElementById('reg-password');
            const password2El = document.getElementById('reg-password2');

            if (!fullNameEl || !usernameEl || !emailEl || !passwordEl || !password2El) {
                showAlert('Register form is incomplete. Please reload the page.', 'danger');
                return;
            }

            const fullName = fullNameEl.value.trim();
            const username = usernameEl.value.trim();
            const email = emailEl.value.trim();
            const password = passwordEl.value;
            const password2 = password2El.value;

            const nameParts = fullName.split(/\s+/).filter(Boolean);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ');

            if (!fullName || !username || !email || !password || !password2) {
                showAlert('Please complete all register fields.', 'warning');
                return;
            }

            if (password !== password2) {
                showAlert('Passwords do not match.', 'danger');
                return;
            }

            setRegisterLoading(true);
            hideAlert();

            try {
                await API.register({
                    first_name: firstName,
                    last_name: lastName,
                    username,
                    email,
                    password,
                    password2,
                });
                showAlert('Account created. You can now log in.', 'success');
                registerForm.reset();
                registerForm.classList.add('d-none');
                form.classList.remove('d-none');
                if (showRegisterBtn) {
                    showRegisterBtn.classList.remove('d-none');
                }
                document.getElementById('username').value = username;
                passwordInput.focus();
            } catch (err) {
                showAlert(err.message || 'Failed to create account.', 'danger');
            } finally {
                setRegisterLoading(false);
            }
        });
    }

    function setLoading(loading) {
        loginBtn.disabled = loading;
        if (btnText) btnText.classList.toggle('d-none', loading);
        if (btnLoading) btnLoading.classList.toggle('d-none', !loading);
    }

    function showAlert(message, type = 'danger') {
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.classList.remove('d-none');
    }

    function setRegisterLoading(loading) {
        if (!registerBtn) return;
        registerBtn.disabled = loading;
        if (registerBtnText) registerBtnText.classList.toggle('d-none', loading);
        if (registerBtnLoading) registerBtnLoading.classList.toggle('d-none', !loading);
    }

    function hideAlert() {
        alert.classList.add('d-none');
    }
});
