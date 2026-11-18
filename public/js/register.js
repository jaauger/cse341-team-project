document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const registerMessage = document.getElementById('register-message');

    if (!registerForm || !registerMessage) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const displayName = document.getElementById('displayName').value.trim();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        registerMessage.textContent = 'Creating your account...';

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    displayName,
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                registerMessage.textContent =
                    data.message || 'Registration failed.';
                return;
            }

            registerMessage.textContent =
                'Account created successfully! Redirecting to login...';

            setTimeout(() => {
                window.location.assign('/login');
            }, 1500);
        } catch (error) {
            console.error('Registration error:', error);
            registerMessage.textContent =
                'Unable to connect to the server. Please try again.';
        }
    });
});