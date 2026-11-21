document.addEventListener('DOMContentLoaded', async () => {
    const pageEl = document.getElementById('users-page');
    const listEl = document.getElementById('users-list');
    const templateEl = document.getElementById('user-card-template');
    const loadingEl = document.getElementById('users-loading');
    const errorEl = document.getElementById('users-error');
    const successEl = document.getElementById('users-success');
    const emptyEl = document.getElementById('users-empty');

    if (!pageEl || !listEl || !templateEl) {
        return;
    }

    const isAdmin = pageEl.dataset.isAdmin === 'true';

    const showSuccess = (message) => {
        if (!successEl) {
            return;
        }

        successEl.hidden = false;
        successEl.textContent = message;
    };

    try {
        const response = await fetch('/api/users', {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Failed to load users (${response.status})`);
        }

        const users = await response.json();

        if (!Array.isArray(users)) {
            throw new Error('Users data was not a list');
        }

        if (loadingEl) {
            loadingEl.hidden = true;
        }

        if (users.length === 0) {
            if (emptyEl) {
                emptyEl.hidden = false;
            }
            return;
        }

        const fragment = document.createDocumentFragment();

        users.forEach((user) => {
            const card = templateEl.content.cloneNode(true);

            card.querySelector('[data-field="display-name"]').textContent =
                user.displayName ?? '';
            card.querySelector('[data-field="role"]').textContent =
                user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
            card.querySelector('[data-field="username"]').textContent =
                user.username ?? '';
            card.querySelector('[data-field="email"]').textContent =
                user.email ?? '';

            if (isAdmin) {
                const actionsEl = card.querySelector('[data-field="actions"]');
                const roleSelect = card.querySelector('[data-field="role-select"]');
                const roleTextEl = card.querySelector('[data-field="role"]');
                const cardEl = card.querySelector('.user-card');
                const deleteButton = card.querySelector('[data-action="delete"]');

                actionsEl.hidden = false;
                roleSelect.value = user.role || 'customer';
                cardEl.dataset.userId = user.id;

                roleSelect.addEventListener('change', async () => {
                    roleSelect.disabled = true;

                    try {
                        const updateResponse = await fetch(`/api/users/${user.id}`, {
                            method: 'PUT',
                            credentials: 'same-origin',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                role: roleSelect.value
                            })
                        });

                        if (!updateResponse.ok) {
                            throw new Error(`Failed to update role (${updateResponse.status})`);
                        }

                        const updatedUser = await updateResponse.json();
                        const updatedRole = updatedUser.role || roleSelect.value;

                        roleTextEl.textContent =
                            updatedRole.charAt(0).toUpperCase() + updatedRole.slice(1);
                        roleSelect.value = updatedRole;
                        showSuccess(`${updatedUser.displayName}'s role was updated.`);
                    } catch (updateError) {
                        console.error('Error updating user role:', updateError);
                        roleSelect.value = user.role || 'customer';

                        if (errorEl) {
                            errorEl.hidden = false;
                            errorEl.textContent =
                                'Unable to update the user role. Please try again.';
                        }
                    } finally {
                        roleSelect.disabled = false;
                    }
                });

                deleteButton.addEventListener('click', async () => {
                    const confirmed = window.confirm(
                        `Delete ${user.displayName || user.username}?`
                    );

                    if (!confirmed) {
                        return;
                    }

                    deleteButton.disabled = true;

                    try {
                        const deleteResponse = await fetch(`/api/users/${user.id}`, {
                            method: 'DELETE',
                            credentials: 'same-origin'
                        });

                        if (!deleteResponse.ok) {
                            throw new Error(`Failed to delete user (${deleteResponse.status})`);
                        }

                        cardEl.remove();
                        showSuccess(
                            `${user.displayName || user.username} was deleted.`
                        );

                        if (listEl.children.length === 0) {
                            if (emptyEl) {
                                emptyEl.hidden = false;
                            }
                        }
                    } catch (deleteError) {
                        console.error('Error deleting user:', deleteError);

                        if (errorEl) {
                            errorEl.hidden = false;
                            errorEl.textContent =
                                'Unable to delete the user. Please try again.';
                        }
                    } finally {
                        deleteButton.disabled = false;
                    }
                });
            }

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
    } catch (error) {
        console.error('Error loading users:', error);

        if (loadingEl) {
            loadingEl.hidden = true;
        }

        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent =
                'Unable to load users right now. Please try again in a moment.';
        }
    }
});
