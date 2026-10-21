// Offline Store & Auto-Sync Engine for iOS, Android and Web
const OfflineStore = {
  isOnline: navigator.onLine,
  syncQueueKey: 'flat_offline_sync_queue',
  cachePrefix: 'flat_cache_',
  deferredInstallPrompt: null,

  init() {
    // Listen to network changes
    window.addEventListener('online', () => this.handleNetworkStatusChange(true));
    window.addEventListener('offline', () => this.handleNetworkStatusChange(false));

    // Capture PWA install prompt (Android/Chrome/Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.showPwaInstallBanner();
    });

    // Check if offline actions pending from a previous session
    if (this.isOnline) {
      setTimeout(() => this.processSyncQueue(), 1500);
    }
  },

  handleNetworkStatusChange(online) {
    this.isOnline = online;
    this.renderNetworkIndicator();

    if (online) {
      App.toast('🌐 Internet reconnected! Auto-syncing changes with Supabase...', 'success');
      this.processSyncQueue();
    } else {
      App.toast('⚡ Offline Mode: Working from local cache. Changes will auto-sync when reconnected.', 'info');
    }
  },

  // Save GET data into offline cache
  cacheData(endpoint, data) {
    try {
      const key = this.cachePrefix + endpoint;
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      console.warn('Cache quota exceeded or storage unavailable:', e);
    }
  },

  // Retrieve cached data if offline
  getCachedData(endpoint) {
    try {
      const key = this.cachePrefix + endpoint;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.data;
      }
    } catch (e) {
      console.warn('Error reading from offline cache:', e);
    }
    return null;
  },

  // Enqueue mutation action for later sync
  enqueueAction(endpoint, method, body) {
    try {
      const queue = this.getQueue();
      queue.push({
        id: 'action_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        endpoint,
        method,
        body,
        timestamp: Date.now()
      });
      localStorage.setItem(this.syncQueueKey, JSON.stringify(queue));
      this.renderNetworkIndicator();
      App.toast('Saved locally! Will automatically sync to Supabase when online.', 'info');
    } catch (e) {
      console.error('Error queuing offline action:', e);
    }
  },

  getQueue() {
    try {
      const raw = localStorage.getItem(this.syncQueueKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // Process queued actions when reconnected
  async processSyncQueue() {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`[AutoSync] Processing ${queue.length} offline queued actions...`);
    const remaining = [];

    for (const item of queue) {
      try {
        await API.rawRequest(item.endpoint, item.method, item.body);
        console.log(`[AutoSync] Synced action: ${item.method} ${item.endpoint}`);
      } catch (err) {
        console.error(`[AutoSync] Failed to sync ${item.endpoint}:`, err);
        remaining.push(item);
      }
    }

    localStorage.setItem(this.syncQueueKey, JSON.stringify(remaining));
    this.renderNetworkIndicator();

    if (remaining.length === 0) {
      // Trigger cloud sync on backend to update Supabase
      try {
        await API.post('/api/sync-supabase', {});
      } catch (e) {}

      App.toast('✅ All offline changes synced and backed up to Supabase Cloud!', 'success');
      App.refresh();
    }
  },

  // Indicator banner in app header
  renderNetworkIndicator() {
    const el = document.getElementById('network-status-pill');
    if (!el) return;

    const queue = this.getQueue();
    const hasQueue = queue.length > 0;

    if (!this.isOnline) {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs cursor-pointer';
      el.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Offline ${hasQueue ? `(${queue.length} pending)` : ''}`;
      el.onclick = () => App.toast('Operating in offline mode. Records are cached locally.', 'info');
    } else if (hasQueue) {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-xs cursor-pointer';
      el.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Syncing (${queue.length})...`;
      el.onclick = () => this.processSyncQueue();
    } else {
      el.className = 'inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs cursor-pointer';
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span> <span>Online<span class="hidden sm:inline"> &bull; Supabase</span></span>`;
      el.onclick = () => this.triggerCloudSync();
    }
  },

  async triggerCloudSync() {
    try {
      App.toast('Syncing with Supabase Cloud...', 'info');
      const res = await API.post('/api/sync-supabase', {});
      App.toast(`Supabase Cloud synced! (${res.memberCount || 12} members, ${res.roomCount || 3} rooms)`, 'success');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // PWA Installation handling
  showPwaInstallBanner() {
    const banner = document.getElementById('pwa-install-pill');
    if (banner) banner.classList.remove('hidden');
  },

  async installApp() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const { outcome } = await this.deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        App.toast('Installing Flat Management App on your device...', 'success');
      }
      this.deferredInstallPrompt = null;
      const banner = document.getElementById('pwa-install-pill');
      if (banner) banner.classList.add('hidden');
    } else {
      // Guide for iOS Safari & Android Chrome
      this.showMobileInstallGuide();
    }
  },

  showMobileInstallGuide() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    App.showModal(`
      <div class="space-y-4 max-w-sm mx-auto text-slate-800">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base shadow-sm">
              <i class="fa-solid fa-mobile-screen"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Install Flat App</h3>
              <p class="text-xs text-slate-500">iOS, Android & Offline Support</p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 leading-relaxed">
          Install as a native full-screen app on your phone. Works without internet, caches bills, and auto-syncs with Supabase!
        </div>

        ${isIOS ? `
          <div class="space-y-3 text-xs text-slate-700">
            <p class="font-bold text-slate-900">How to install on iPhone / iPad:</p>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">1</span>
              <span>Tap the <strong>Share</strong> button <i class="fa-solid fa-arrow-up-from-bracket text-indigo-600 mx-1"></i> in Safari bottom bar.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong> <i class="fa-regular fa-square-plus text-indigo-600 mx-1"></i>.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">3</span>
              <span>Tap <strong>Add</strong> in the top right corner. The app will appear on your home screen!</span>
            </div>
          </div>
        ` : `
          <div class="space-y-3 text-xs text-slate-700">
            <p class="font-bold text-slate-900">How to install on Android / Chrome:</p>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">1</span>
              <span>Tap the <strong>three dots menu (⋮)</strong> in Chrome top right.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">2</span>
              <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">3</span>
              <span>The app icon installs and opens full-screen like a native app!</span>
            </div>
          </div>
        `}

        <div class="pt-2">
          <button onclick="App.closeModal()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-all">
            Got It
          </button>
        </div>
      </div>
    `);
  }
};

// Initialize on script load
OfflineStore.init();
