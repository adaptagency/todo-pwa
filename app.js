class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.registerServiceWorker();
        this.render();
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCompleted());

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
    }

    addTask() {
        const text = document.getElementById('taskInput').value.trim();
        const date = document.getElementById('dateInput').value;
        const priority = document.getElementById('priorityInput').value;

        if (!text) {
            alert(i18n.t('enterTask'));
            return;
        }

        const task = {
            id: Date.now(),
            text,
            date: date || null,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.render();

        document.getElementById('taskInput').value = '';
        document.getElementById('dateInput').value = '';
        document.getElementById('priorityInput').value = 'medium';
    }

    deleteTask(id) {
        if (confirm(i18n.t('deleteConfirm'))) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveTasks();
            this.render();
        }
    }

    toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
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

        dialog.querySelector('.btn-save').addEventListener('click', () => {
            const newText = document.getElementById('editText').value.trim();
            if (!newText) {
                alert(i18n.t('taskCannotBeEmpty'));
                return;
            }
            task.text = newText;
            task.date = document.getElementById('editDate').value || null;
            task.priority = document.getElementById('editPriority').value;
            this.saveTasks();
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

    clearCompleted() {
        if (confirm(i18n.t('deleteAllConfirm'))) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.render();
        }
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('tasks');
        this.tasks = saved ? JSON.parse(saved) : [];
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

