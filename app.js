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
        await i18n.init();
        await this.initIndexedDB();
        await this.loadUsers();
        
        if (this.users.length === 0) {
            this.showUserModal();
        } else {
            const lastUser = await this.getLastUser();
            if (lastUser) {
                this.setCurrentUser(lastUser);
            } else {
                this.showUserModal();
            }
        }

        this.setupEventListeners();
        this.registerServiceWorker();
    }

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TodoPWADB', 1);

            request.onerror = () => {
                console.error('IndexedDB failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
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
                }
            };
        });
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCompleted());
        document.getElementById('switchUserBtn').addEventListener('click', () => this.showUserModal());
        document.getElementById('createUserBtn').addEventListener('click', () => this.createNewUser());
        
        document.getElementById('newUsername').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createNewUser();
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
    }

    showUserModal() {
        const modal = document.getElementById('userModal');
        const userList = document.getElementById('userList');
        
        userList.innerHTML = '';
        this.users.forEach(username => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            if (this.currentUser === username) {
                userItem.classList.add('active');
            }
            userItem.textContent = username;
            userItem.addEventListener('click', () => {
                this.setCurrentUser(username);
                this.saveLastUser(username);
                modal.style.display = 'none';
            });
            userList.appendChild(userItem);
        });
        
        document.getElementById('newUsername').value = '';
        modal.style.display = 'flex';
    }

    createNewUser() {
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
        this.saveUsers();
        this.setCurrentUser(username);
        this.saveLastUser(username);
        document.getElementById('userModal').style.display = 'none';
    }

    async setCurrentUser(username) {
        this.currentUser = username;
        document.getElementById('userDisplay').textContent = `User: ${username}`;
        await this.loadTasks();
        this.render();
    }

    saveUsers() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readwrite');
            const objectStore = transaction.objectStore('users');
            
            objectStore.clear();
            this.users.forEach(username => {
                objectStore.add({ username });
            });

            transaction.oncomplete = () => {
                console.log('Users saved to IndexedDB');
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    loadUsers() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const objectStore = transaction.objectStore('users');
            const request = objectStore.getAll();

            request.onsuccess = () => {
                this.users = request.result.map(item => item.username);
                console.log('Users loaded from IndexedDB:', this.users);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    saveLastUser(username) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = this.db.transaction(['settings'], 'readwrite');
            const objectStore = transaction.objectStore('settings');
            const request = objectStore.put({ key: 'lastUser', value: username });

            request.onsuccess = () => {
                console.log('Last user saved:', username);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    getLastUser() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = this.db.transaction(['settings'], 'readonly');
            const objectStore = transaction.objectStore('settings');
            const request = objectStore.get('lastUser');

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.value);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                reject(request.error);
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
            text,
            date: date || null,
            priority,
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
            this.tasks = this.tasks.filter(task => task.id !== id);
            await this.saveTasks();
            this.render();
        }
    }

    async toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            await this.saveTasks();
            this.render();
        }
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const dialog = document.createElement('div');
        dialog.className = 'edit-modal';
        dialog.innerHTML = `
            <div class="edit-dialog">
                <h2>${i18n.t('editTitle')}</h2>
                <input type="text" id="editText" value="${this.escapeHtml(task.text)}" placeholder="${i18n.t('taskPlaceholder')}">
                <input type="date" id="editDate" value="${task.date || ''}">
                <select id="editPriority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${i18n.t('lowPriority')}</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${i18n.t('mediumPriority')}</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${i18n.t('highPriority')}</option>
                </select>
                <div class="dialog-buttons">
                    <button class="btn-save">${i18n.t('saveBtn')}</button>
                    <button class="btn-cancel">${i18n.t('cancelBtn')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const textInput = document.getElementById('editText');
        textInput.focus();
        textInput.select();

        dialog.querySelector('.btn-save').addEventListener('click', async () => {
            const newText = document.getElementById('editText').value.trim();
            if (!newText) {
                alert(i18n.t('taskCannotBeEmpty'));
                return;
            }
            task.text = newText;
            task.date = document.getElementById('editDate').value || null;
            task.priority = document.getElementById('editPriority').value;
            await this.saveTasks();
            this.render();
            dialog.remove();
        });

        dialog.querySelector('.btn-cancel').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.remove();
        });
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(t => t.completed);
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'high':
                return this.tasks.filter(t => t.priority === 'high' && !t.completed);
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

        if (date.toDateString() === today.toDateString()) return `📅 ${i18n.t('today')}`;
        if (date.toDateString() === tomorrow.toDateString()) return `📅 ${i18n.t('tomorrow')}`;
        return `📅 ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    render() {
        const taskList = document.getElementById('taskList');
        const filtered = this.getFilteredTasks();

        if (filtered.length === 0) {
            taskList.innerHTML = `<p class="empty-state">${i18n.t('noTasksToShow')}</p>`;
            document.getElementById('taskCount').textContent = `0 ${i18n.t('tasks')}`;
            return;
        }

        taskList.innerHTML = filtered.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <input 
                    type="checkbox" 
                    class="task-checkbox"
                    ${task.completed ? 'checked' : ''}
                    onchange="app.toggleComplete(${task.id})"
                >
                <div class="task-content">
                    <div class="task-text">${this.escapeHtml(task.text)}</div>
                    <div class="task-meta">
                        <span class="priority-badge ${task.priority}">${i18n.t(task.priority + 'Priority')}</span>
                        ${task.date ? `<span class="task-date">${this.formatDate(task.date)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-edit" onclick="app.editTask(${task.id})">${i18n.t('editBtn')}</button>
                    <button class="btn-delete" onclick="app.deleteTask(${task.id})">${i18n.t('deleteBtn')}</button>
                </div>
            </div>
        `).join('');

        const activeCount = this.tasks.filter(t => !t.completed).length;
        const taskWord = activeCount === 1 ? i18n.t('task') : i18n.t('taskCount');
        document.getElementById('taskCount').textContent = `${activeCount} ${taskWord}`;
    }

    async clearCompleted() {
        if (confirm(i18n.t('deleteAllConfirm'))) {
            this.tasks = this.tasks.filter(t => !t.completed);
            await this.saveTasks();
            this.render();
        }
    }

    saveTasks() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('IndexedDB not initialized');
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const objectStore = transaction.objectStore('tasks');

            // Clear only current user's tasks
            const index = objectStore.index('username');
            const range = IDBKeyRange.only(this.currentUser);
            index.openCursor(range).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    objectStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };

            // Add all current tasks
            this.tasks.forEach(task => {
                objectStore.add(task);
            });

            transaction.oncomplete = () => {
                console.log('Tasks saved to IndexedDB for user:', this.currentUser);
                resolve();
            };

            transaction.onerror = () => {
                console.error('Error saving tasks to IndexedDB');
                reject(transaction.error);
            };
        });
    }

    loadTasks() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('IndexedDB not initialized');
                reject(new Error('IndexedDB not initialized'));
                return;
            }

            const transaction = this.db.transaction(['tasks'], 'readonly');
            const objectStore = transaction.objectStore('tasks');
            const index = objectStore.index('username');
            const range = IDBKeyRange.only(this.currentUser);
            const request = index.getAll(range);

            request.onsuccess = () => {
                this.tasks = request.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                console.log('Tasks loaded from IndexedDB for user:', this.currentUser, this.tasks.length);
                resolve();
            };

            request.onerror = () => {
                console.error('Error loading tasks from IndexedDB');
                reject(request.error);
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
            navigator.serviceWorker.register('sw.js').catch(() => {
                console.log('Service Worker registration failed - offline features limited');
            });
        }
    }
}

const app = new TodoApp();

