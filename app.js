    async init() {
        await this.initIndexedDB();
        i18n.setDB(this.db);  // Pass the database to i18n
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

