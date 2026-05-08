const translations = {
    en: {
        appTitle: 'My To-Do List',
        subtitle: 'Stay organized and productive',
        taskPlaceholder: 'What needs to be done?',
        addBtn: 'Add Task',
        allFilter: 'All',
        activeFilter: 'Active',
        completedFilter: 'Completed',
        highPriorityFilter: 'High Priority',
        lowPriority: 'Low',
        mediumPriority: 'Medium',
        highPriority: 'High',
        editBtn: 'Edit',
        deleteBtn: 'Delete',
        clearBtn: 'Clear Completed',
        emptyState: 'No tasks yet. Add one to get started!',
        noTasksToShow: 'No tasks to show',
        deleteConfirm: 'Delete this task?',
        deleteAllConfirm: 'Delete all completed tasks?',
        editTitle: 'Edit Task',
        saveBtn: 'Save',
        cancelBtn: 'Cancel',
        taskCannotBeEmpty: 'Task cannot be empty',
        enterTask: 'Please enter a task',
        today: 'Today',
        tomorrow: 'Tomorrow',
        taskCount: 'tasks',
        task: 'task',
        selectProfile: 'Select or Create Profile',
        switchUser: 'Switch User',
        createProfile: 'Create Profile'
    },
    vi: {
        appTitle: 'Danh Sách Việc Cần Làm',
        subtitle: 'Luôn được tổ chức và năng suất',
        taskPlaceholder: 'Cần phải làm gì?',
        addBtn: 'Thêm Nhiệm Vụ',
        allFilter: 'Tất Cả',
        activeFilter: 'Đang Hoạt Động',
        completedFilter: 'Đã Hoàn Thành',
        highPriorityFilter: 'Ưu Tiên Cao',
        lowPriority: 'Thấp',
        mediumPriority: 'Trung Bình',
        highPriority: 'Cao',
        editBtn: 'Chỉnh Sửa',
        deleteBtn: 'Xóa',
        clearBtn: 'Xóa Đã Hoàn Thành',
        emptyState: 'Chưa có nhiệm vụ nào. Thêm một cái để bắt đầu!',
        noTasksToShow: 'Không có nhiệm vụ nào để hiển thị',
        deleteConfirm: 'Xóa nhiệm vụ này?',
        deleteAllConfirm: 'Xóa tất cả các nhiệm vụ đã hoàn thành?',
        editTitle: 'Chỉnh Sửa Nhiệm Vụ',
        saveBtn: 'Lưu',
        cancelBtn: 'Hủy Bỏ',
        taskCannotBeEmpty: 'Nhiệm vụ không thể trống',
        enterTask: 'Vui lòng nhập một nhiệm vụ',
        today: 'Hôm Nay',
        tomorrow: 'Ngày Mai',
        taskCount: 'nhiệm vụ',
        task: 'nhiệm vụ',
        selectProfile: 'Chọn hoặc Tạo Hồ Sơ',
        switchUser: 'Chuyển Người Dùng',
        createProfile: 'Tạo Hồ Sơ'
    },
    lg: {
        appTitle: 'Omusomo Gwa To-Do',
        subtitle: 'Kumala obulungi n\'okukola emirimu',
        taskPlaceholder: 'Kiki ekikwata mu kumala?',
        addBtn: 'Yongeza Omusomo',
        allFilter: 'Byonna',
        activeFilter: 'Ekirimu',
        completedFilter: 'Kyakumala',
        highPriorityFilter: 'Okukola Okw\'ebifo',
        lowPriority: 'Ku Bwabwavu',
        mediumPriority: 'Mu Makkati',
        highPriority: 'Okukola Okw\'ebifo',
        editBtn: 'Kyusa',
        deleteBtn: 'Siga',
        clearBtn: 'Siga Ebyakumala',
        emptyState: 'Tewali mirimú gyonna. Yongeza emu okwettanga!',
        noTasksToShow: 'Tewali mirimú gya kutegeeza',
        deleteConfirm: 'Siga omusomo guno?',
        deleteAllConfirm: 'Siga mirimú gyonna egyakumala?',
        editTitle: 'Kyusa Omusomo',
        saveBtn: 'Kuuma',
        cancelBtn: 'Gera Kigazi',
        taskCannotBeEmpty: 'Omusomo teguyinza kubeera tututuzzi',
        enterTask: 'Kyusa omusomo',
        today: 'Leero',
        tomorrow: 'Bukiluki',
        taskCount: 'mirimú',
        task: 'omusomo',
        selectProfile: 'Pili oba Tengeneza Profayiro',
        switchUser: 'Kyusa Muntu',
        createProfile: 'Tengeneza Profayiro'
    }
};

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.db = null;
    }

    setDB(db) {
        this.db = db;
    }

    async init() {
        await this.loadLanguage();
        this.applyLanguage(this.currentLanguage);
        this.setupLanguageButtons();
        this.setActiveButton(this.currentLanguage);
    }

    setupLanguageButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                this.setLanguage(lang);
            });
        });
    }

    setActiveButton(lang) {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector('[data-lang="' + lang + '"]');
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    async setLanguage(lang) {
        this.currentLanguage = lang;
        await this.saveLanguage(lang);
        this.setActiveButton(lang);
        this.applyLanguage(lang);
        
        if (window.app) {
            window.app.render();
        }
    }

    saveLanguage(lang) {
        return new Promise(function(resolve, reject) {
            if (!this.db) {
                console.log('Database not ready, skipping language save');
                resolve();
                return;
            }

            try {
                const transaction = this.db.transaction(['settings'], 'readwrite');
                const objectStore = transaction.objectStore('settings');
                const request = objectStore.put({ key: 'language', value: lang });

                request.onsuccess = function() {
                    console.log('Language saved to IndexedDB:', lang);
                    resolve();
                };

                request.onerror = function() {
                    console.error('Error saving language to IndexedDB');
                    resolve();
                };
            } catch (e) {
                console.error('Error in saveLanguage:', e);
                resolve();
            }
        }.bind(this));
    }

    loadLanguage() {
        return new Promise(function(resolve, reject) {
            if (!this.db) {
                console.log('Database not ready, using default language');
                this.currentLanguage = 'en';
                resolve();
                return;
            }

            try {
                const transaction = this.db.transaction(['settings'], 'readonly');
                const objectStore = transaction.objectStore('settings');
                const request = objectStore.get('language');

                request.onsuccess = function() {
                    if (request.result) {
                        this.currentLanguage = request.result.value;
                        console.log('Language loaded from IndexedDB:', this.currentLanguage);
                    } else {
                        this.currentLanguage = 'en';
                        console.log('No language found in IndexedDB, using default: en');
                    }
                    resolve();
                }.bind(this);

                request.onerror = function() {
                    console.error('Error loading language from IndexedDB');
                    this.currentLanguage = 'en';
                    resolve();
                }.bind(this);
            } catch (e) {
                console.error('Error in loadLanguage:', e);
                this.currentLanguage = 'en';
                resolve();
            }
        }.bind(this));
    }

    applyLanguage(lang) {
        const t = translations[lang];
        
        document.getElementById('appTitle').textContent = t.appTitle;
        document.getElementById('subtitle').textContent = t.subtitle;
        document.getElementById('taskInput').placeholder = t.taskPlaceholder;
        document.getElementById('addBtn').textContent = t.addBtn;
        document.getElementById('clearBtn').textContent = t.clearBtn;
        document.getElementById('switchUserBtn').textContent = t.switchUser;
        document.getElementById('userModalTitle').textContent = t.selectProfile;
        document.getElementById('createUserBtn').textContent = t.createProfile;
        
        document.querySelectorAll('.filter-btn').forEach(function(btn, index) {
            const filters = ['all', 'active', 'completed', 'high'];
            const filterKeys = ['allFilter', 'activeFilter', 'completedFilter', 'highPriorityFilter'];
            btn.textContent = t[filterKeys[index]];
        });
        
        document.querySelectorAll('#priorityInput option').forEach(function(option) {
            const key = option.dataset.label + 'Priority';
            option.textContent = t[key];
        });
    }

    t(key) {
        return translations[this.currentLanguage][key] || translations['en'][key];
    }
}

const i18n = new I18n();

