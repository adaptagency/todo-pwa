class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentUser = null;
        this.users = [];
        this.db = null;
        this.init();
    }

    async init() {
        await this.initIndexedDB();
        i18n.setDB(this.db);
        await i18n.init();
        await this.loadUsers();

        if (this.users.length === 0) {
            this.showUserModal();
        } else {
            const lastUser = await this.getLastUser();
            if (lastUser && this.users.includes(lastUser)) {
                await this.setCurrentUser(lastUser);
            } else {
                this.showUserModal();
            }
        }

        this.setupEventListeners();
        this.registerServiceWorker();
    }

    initIndexedDB() {
        const self = this;
        return new Promise(function(resolve, reject) {
            const request = indexedDB.open('TodoPWADB', 1);

            request.onerror = function() {
                console.error('IndexedDB failed to open');
                reject(request.error);
            };

            request.onsuccess = function() {
                self.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve();
            };

            request.onupgradeneeded = function(event) {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('tasks')) {
                    const objectStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    objectStore.createIndex('username', 'username', { unique: false });
                    objectStore.createIndex('completed', 'completed', { unique: false });
                    objectStore.createIndex('priority', 'priority', { unique: false });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Tasks object store created');
                }

                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'username' });
                    console.log('Users object store created');
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('Settings object store created');
                }
            };
        });
    }

    setupEventListeners() {
        const self = this;
        document.getElementById('addBtn').addEventListener('click', function() { self.addTask(); });
        document.getElementById('taskInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') self.addTask();
        });
        document.getElementById('clearBtn').addEventListener('click', function() { self.clearCompleted(); });
        document.getElementById('switchUserBtn').addEventListener('click', function() { self.showUserModal(); });
        document.getElementById('createUserBtn').addEventListener('click', function() { self.createNewUser(); });
        document.getElementById('newUsername').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') self.createNewUser();
        });

        document.querySelectorAll('.filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
                e.target.classList.add('active');
                self.currentFilter = e.target.dataset.filter;
                self.render();
            });
        });
    }

    showUserModal() {
        const modal = document.getElementById('userModal');
        const userList = document.getElementById('userList');
        const self = this;

        userList.innerHTML = '';

        if (this.users.length > 0) {
            const heading = document.createElement('p');
            heading.style.fontSize = '12px';
            heading.style.color = '#757575';
            heading.style.marginBottom = '10px';
            heading.textContent = 'Existing Profiles:';
            userList.appendChild(heading);

            this.users.forEach(function(username) {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                if (self.currentUser === username) {
                    userItem.classList.add('active');
                }
                userItem.textContent = username;
                userItem.style.cursor = 'pointer';
                userItem.addEventListener('click', function() {
                    self.setCurrentUser(username);
                    self.saveLastUser(username);
                    modal.style.display = 'none';
                });
                userList.appendChild(userItem);
            });
        } else {
            const noUsers = document.createElement('p');
            noUsers.style.fontSize = '12px';
            noUsers.style.color = '#757575';
            noUsers.style.marginBottom = '10px';
            noUsers.textContent = 'No existing profiles. Create one below:';
            userList.appendChild(noUsers);
        }

        document.getElementById('newUsername').value = '';
        document.getElementById('newUsername').focus();
        modal.style.display = 'flex';
    }

    async createNewUser() {
        const username = document.getElementById('newUsername').value.trim();

        if (!username) {
            alert('Please enter a username');
            return;
        }

        if (this.users.includes(username)) {
            alert('Username already exists');
            return;
        }

        this.users.push(username);
        await this.saveUsers();
        await this.setCurrentUser(username);
        await this.saveLastUser(username);
        document.getElementById('userModal').style.display = 'none';
        console.log('New user created:', username);
    }

    async setCurrentUser(username) {
        this.currentUser = username;
        document.getElementById('userDisplay').textContent = 'User: ' + username;
        await this.loadTasks();
        this.render();
    }

    saveUsers() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                console.error('IndexedDB not initialized');
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = self.db.transaction(['users'], 'readwrite');
            const objectStore = transaction.objectStore('users');

            objectStore.clear();

            self.users.forEach(function(username) {
                objectStore.add({ username: username });
            });

            transaction.oncomplete = function() {
                console.log('Users saved to IndexedDB:', self.users);
                resolve();
            };

            transaction.onerror = function() {
                console.error('Error saving users:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    loadUsers() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                console.error('IndexedDB not initialized');
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = self.db.transaction(['users'], 'readonly');
            const objectStore = transaction.objectStore('users');
            const request = objectStore.getAll();

            request.onsuccess = function() {
                self.users = request.result.map(function(item) { return item.username; });
                console.log('Users loaded from IndexedDB:', self.users);
                resolve();
            };

            request.onerror = function() {
                console.error('Error loading users:', request.error);
                reject(request.error);
            };
        });
    }

    saveLastUser(username) {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                console.error('IndexedDB not initialized');
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = self.db.transaction(['settings'], 'readwrite');
            const objectStore = transaction.objectStore('settings');
            const request = objectStore.put({ key: 'lastUser', value: username });

            request.onsuccess = function() {
                console.log('Last user saved:', username);
                resolve();
            };

            request.onerror = function() {
                console.error('Error saving last user:', request.error);
                reject(request.error);
            };
        });
    }

    getLastUser() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                console.error('IndexedDB not initialized');
                resolve(null);
                return;
            }

            const transaction = self.db.transaction(['settings'], 'readonly');
            const objectStore = transaction.objectStore('settings');
            const request = objectStore.get('lastUser');

            request.onsuccess = function() {
                if (request.result) {
                    console.log('Last user retrieved:', request.result.value);
                    resolve(request.result.value);
                } else {
                    resolve(null);
                }
            };

            request.onerror = function() {
                console.error('Error getting last user:', request.error);
                resolve(null);
            };
        });
    }

    async addTask() {
        const text = document.getElementById('taskInput').value.trim();
        const date = document.getElementById('dateInput').value;
        const priority = document.getElementById('priorityInput').value;

        if (!text) {
            alert(i18n.t('enterTask'));
            return;
        }

        const task = {
            id: Date.now(),
            username: this.currentUser,
            text: text,
            date: date || null,
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        await this.saveTasks();
        this.render();

        document.getElementById('taskInput').value = '';
        document.getElementById('dateInput').value = '';
        document.getElementById('priorityInput').value = 'medium';
    }

    async deleteTask(id) {
        if (confirm(i18n.t('deleteConfirm'))) {
            this.tasks = this.tasks.filter(function(task) { return task.id !== id; });
            await this.saveTasks();
            this.render();
        }
    }

    async toggleComplete(id) {
        const task = this.tasks.find(function(t) { return t.id === id; });
        if (task) {
            task.completed = !task.completed;
            await this.saveTasks();
            this.render();
        }
    }

    editTask(id) {
        const self = this;
        const task = this.tasks.find(function(t) { return t.id === id; });
        if (!task) return;

        const dialog = document.createElement('div');
        dialog.className = 'edit-modal';
        dialog.innerHTML = '<div class="edit-dialog"><h2>' + i18n.t('editTitle') + '</h2><input type="text" id="editText" value="' + this.escapeHtml(task.text) + '" placeholder="' + i18n.t('taskPlaceholder') + '"><input type="date" id="editDate" value="' + (task.date || '') + '"><select id="editPriority"><option value="low" ' + (task.priority === 'low' ? 'selected' : '') + '>' + i18n.t('lowPriority') + '</option><option value="medium" ' + (task.priority === 'medium' ? 'selected' : '') + '>' + i18n.t('mediumPriority') + '</option><option value="high" ' + (task.priority === 'high' ? 'selected' : '') + '>' + i18n.t('highPriority') + '</option></select><div class="dialog-buttons"><button class="btn-save">' + i18n.t('saveBtn') + '</button><button class="btn-cancel">' + i18n.t('cancelBtn') + '</button></div></div>';

        document.body.appendChild(dialog);

        const textInput = document.getElementById('editText');
        textInput.focus();
        textInput.select();

        dialog.querySelector('.btn-save').addEventListener('click', function() {
            const newText = document.getElementById('editText').value.trim();
            if (!newText) {
                alert(i18n.t('taskCannotBeEmpty'));
                return;
            }
            task.text = newText;
            task.date = document.getElementById('editDate').value || null;
            task.priority = document.getElementById('editPriority').value;
            self.saveTasks();
            self.render();
            dialog.remove();
        });

        dialog.querySelector('.btn-cancel').addEventListener('click', function() {
            dialog.remove();
        });

        dialog.addEventListener('click', function(e) {
            if (e.target === dialog) dialog.remove();
        });
    }

    getFilteredTasks() {
        const self = this;
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(function(t) { return t.completed; });
            case 'active':
                return this.tasks.filter(function(t) { return !t.completed; });
            case 'high':
                return this.tasks.filter(function(t) { return t.priority === 'high' && !t.completed; });
            default:
                return this.tasks;
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return '📅 ' + i18n.t('today');
        if (date.toDateString() === tomorrow.toDateString()) return '📅 ' + i18n.t('tomorrow');
        return '📅 ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    render() {
        const taskList = document.getElementById('taskList');
        const filtered = this.getFilteredTasks();
        const self = this;

        if (filtered.length === 0) {
            taskList.innerHTML = '<p class="empty-state">' + i18n.t('noTasksToShow') + '</p>';
            document.getElementById('taskCount').textContent = '0 ' + i18n.t('tasks');
            return;
        }

        taskList.innerHTML = filtered.map(function(task) {
            return '<div class="task-item ' + (task.completed ? 'completed' : '') + '"><input type="checkbox" class="task-checkbox" ' + (task.completed ? 'checked' : '') + ' onchange="app.toggleComplete(' + task.id + ')"><div class="task-content"><div class="task-text">' + self.escapeHtml(task.text) + '</div><div class="task-meta"><span class="priority-badge ' + task.priority + '">' + i18n.t(task.priority + 'Priority') + '</span>' + (task.date ? '<span class="task-date">' + self.formatDate(task.date) + '</span>' : '') + '</div></div><div class="task-actions"><button class="btn-edit" onclick="app.editTask(' + task.id + ')">' + i18n.t('editBtn') + '</button><button class="btn-delete" onclick="app.deleteTask(' + task.id + ')">' + i18n.t('deleteBtn') + '</button></div></div>';
        }).join('');

        const activeCount = this.tasks.filter(function(t) { return !t.completed; }).length;
        const taskWord = activeCount === 1 ? i18n.t('task') : i18n.t('taskCount');
        document.getElementById('taskCount').textContent = activeCount + ' ' + taskWord;
    }

    async clearCompleted() {
        if (confirm(i18n.t('deleteAllConfirm'))) {
            this.tasks = this.tasks.filter(function(t) { return !t.completed; });
            await this.saveTasks();
            this.render();
        }
    }

    saveTasks() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db) {
                console.error('IndexedDB not initialized');
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = self.db.transaction(['tasks'], 'readwrite');
            const objectStore = transaction.objectStore('tasks');
            const index = objectStore.index('username');
            const range = IDBKeyRange.only(self.currentUser);

            index.openCursor(range).onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    objectStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };

            setTimeout(function() {
                self.tasks.forEach(function(task) {
                    objectStore.add(task);
                });
            }, 100);

            transaction.oncomplete = function() {
                console.log('Tasks saved to IndexedDB for user:', self.currentUser);
                resolve();
            };

            transaction.onerror = function() {
                console.error('Error saving tasks to IndexedDB');
                reject(transaction.error);
            };
        });
    }

    loadTasks() {
        const self = this;
        return new Promise(function(resolve, reject) {
            if (!self.db || !self.currentUser) {
                self.tasks = [];
                resolve();
                return;
            }

            const transaction = self.db.transaction(['tasks'], 'readonly');
            const objectStore = transaction.objectStore('tasks');
            const index = objectStore.index('username');
            const range = IDBKeyRange.only(self.currentUser);
            const request = index.getAll(range);

            request.onsuccess = function() {
                self.tasks = request.result.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
                console.log('Tasks loaded from IndexedDB for user:', self.currentUser, self.tasks.length);
                resolve();
            };

            request.onerror = function() {
                console.error('Error loading tasks from IndexedDB');
                self.tasks = [];
                resolve();
            };
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function() {
                console.log('Service Worker registration failed - offline features limited');
            });
        }
    }
}

const app = new TodoApp();

