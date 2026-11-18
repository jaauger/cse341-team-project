document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');

    if (!logoutButton) return;

    logoutButton.addEventListener('click', async () => {
        logoutButton.disabled = true;

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Logout failed.');
            }

            window.location.assign('/');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Unable to log out. Please try again.');
            logoutButton.disabled = false;
        }
    });
});