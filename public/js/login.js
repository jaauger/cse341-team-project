document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    if (!loginForm || !loginMessage) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        loginMessage.textContent = 'Signing in...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                loginMessage.textContent = data.message || 'Login failed.';
                return;
            }

            if (data.user.role === 'admin') {
                window.location.assign('/');
            } else {
                window.location.assign('/dashboard');
            }
        } catch (error) {
            console.error('Login request failed:', error);
            loginMessage.textContent =
                'Unable to connect to the server. Please try again.';
        }
    });
});