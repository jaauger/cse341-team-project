document.addEventListener('DOMContentLoaded', () => {
    const pageEl = document.getElementById('users-page');
    const listEl = document.getElementById('users-list');
    const templateEl = document.getElementById('user-card-template');
    const loadingEl = document.getElementById('users-loading');
    const errorEl = document.getElementById('users-error');
    const successEl = document.getElementById('users-success');
    const emptyEl = document.getElementById('users-empty');
    const summaryEl = document.getElementById('users-results-summary');
    const paginationEl = document.getElementById('users-pagination');
    const previousEl = document.getElementById('users-prev');
    const nextEl = document.getElementById('users-next');
    const pageInfoEl = document.getElementById('users-page-info');
    const sortOrderEl = document.getElementById('users-sort-order');

    if (!pageEl || !listEl || !templateEl) {
        return;
    }

    const isAdmin = pageEl.dataset.isAdmin === 'true';
    const itemsPerPage = 10;
    let currentPage = 1;
    let activeRequest = null;

    const showSuccess = (message) => {
        if (!successEl) {
            return;
        }

        successEl.hidden = false;
        successEl.textContent = message;
    };

    const renderUsers = (users) => {
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

                summaryEl.hidden = false;
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

                        showSuccess(
                            `${user.displayName || user.username} was deleted.`
                        );
                        await loadUsers(currentPage);
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
    };

    const updatePagination = (pagination, userCount) => {
        currentPage = pagination.currentPage;

        const firstItem = userCount === 0
            ? 0
            : (currentPage - 1) * pagination.itemsPerPage + 1;
        const lastItem = userCount === 0
            ? 0
            : firstItem + userCount - 1;

        summaryEl.textContent =
            `Showing ${firstItem}\u2013${lastItem} of ${pagination.totalItems} users`;
        pageInfoEl.textContent =
            `Page ${currentPage} of ${Math.max(1, pagination.totalPages)}`;

        previousEl.disabled = !pagination.hasPreviousPage;
        nextEl.disabled = !pagination.hasNextPage;
        paginationEl.hidden = pagination.totalPages <= 1;
        emptyEl.hidden = userCount > 0;
    };

    const buildQuery = (page) => {
        const sortOrder = isAdmin && sortOrderEl
            ? sortOrderEl.value
            : 'asc';

        return new URLSearchParams({
            page: String(page),
            limit: String(itemsPerPage),
            sortBy: 'username',
            sortOrder
        }).toString();
    };

    const loadUsers = async (page = 1) => {
        if (activeRequest) {
            activeRequest.abort();
        }

        const controller = new AbortController();
        activeRequest = controller;

        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;
        previousEl.disabled = true;
        nextEl.disabled = true;

        if (sortOrderEl) {
            sortOrderEl.disabled = true;
        }

        try {
            const response = await fetch(
                `/api/users?${buildQuery(page)}`,
                {
                    credentials: 'same-origin',
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to load users (${response.status})`);
            }

            const payload = await response.json();
            const pagination = payload?.pagination;

            if (
                !Array.isArray(payload?.users) ||
                !pagination ||
                !Number.isSafeInteger(pagination.totalItems) ||
                !Number.isSafeInteger(pagination.totalPages) ||
                !Number.isSafeInteger(pagination.currentPage) ||
                !Number.isSafeInteger(pagination.itemsPerPage)
            ) {
                throw new Error('Users data was not a valid paginated response');
            }

            if (activeRequest !== controller) {
                return;
            }

            const lastPage = Math.max(1, pagination.totalPages);

            if (page > lastPage) {
                await loadUsers(lastPage);
                return;
            }

            renderUsers(payload.users);
            updatePagination(pagination, payload.users.length);
        } catch (error) {
            if (
                error.name === 'AbortError' ||
                activeRequest !== controller
            ) {
                return;
            }

            console.error('Error loading users:', error);
            listEl.replaceChildren();
            summaryEl.textContent = '';
            paginationEl.hidden = true;

            errorEl.hidden = false;
            errorEl.textContent =
                'Unable to load users right now. Please try again in a moment.';
        } finally {
            if (activeRequest === controller) {
                loadingEl.hidden = true;
                activeRequest = null;

                if (sortOrderEl) {
                    sortOrderEl.disabled = false;
                }
            }
        }
    };

    previousEl.addEventListener('click', () => {
        if (currentPage > 1) {
            loadUsers(currentPage - 1);
        }
    });

    nextEl.addEventListener('click', () => {
        if (!nextEl.disabled) {
            loadUsers(currentPage + 1);
        }
    });

    if (sortOrderEl) {
        sortOrderEl.addEventListener('change', () => {
            loadUsers(1);
        });
    }

    loadUsers();
});
