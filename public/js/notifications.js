// In-App Notification Center Controller
const Notifications = {
  list: [],
  unreadCount: 0,
  activeFilter: 'all', // 'all', 'bill', 'food', 'payment', 'announcement'
  pollingInterval: null,

  async init() {
    if (!App.currentUser) return;
    await this.fetchNotifications();

    // Start background poller every 30 seconds
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      if (App.currentUser) this.fetchNotifications();
    }, 30000);
  },

  async fetchNotifications() {
    try {
      const res = await API.get('/api/notifications');
      const prevIds = new Set(this.list.map(n => n.id));
      this.list = res.notifications || [];
      this.unreadCount = Number(res.unread_count || 0);
      this.updateBadge();

      // Check if newly arrived unread notifications should trigger native phone notification
      const newItems = this.list.filter(n => n.is_read === 0 && !prevIds.has(n.id));
      if (newItems.length > 0 && prevIds.size > 0) {
        const top = newItems[0];
        this.showDeviceNotification(top.title, top.message);
      }
    } catch (e) {
      // Quiet fail if network offline
    }
  },

  // Request browser / phone native notification permission & Web Push Subscription
  async requestDevicePermission() {
    await this.subscribeDevicePush();
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  async subscribeDevicePush() {
    if (!('Notification' in window)) {
      App.toast('Device notifications are not supported on this browser', 'info');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        App.toast('Notification permission was dismissed or blocked', 'info');
        return;
      }

      // Check for ServiceWorker and PushManager
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const keyRes = await API.get('/api/notifications/vapid-public-key');
          const publicKey = keyRes.publicKey;

          if (publicKey) {
            const swReg = await navigator.serviceWorker.ready;
            let subscription = await swReg.pushManager.getSubscription();

            if (!subscription) {
              subscription = await swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(publicKey)
              });
            }

            await API.post('/api/notifications/subscribe-push', { subscription: subscription.toJSON() });
          }
        } catch (pushErr) {
          console.warn('Web push registration fallback:', pushErr);
        }
      }

      App.toast('🔔 Lock Screen, Notification Center & Banner alerts enabled!', 'success');
      this.showDeviceNotification('Flat Notifications Active', 'Lock Screen and Top Banner alerts are now enabled on your device!');

      const banner = document.getElementById('notif-perm-banner');
      if (banner) banner.classList.add('hidden');
    } catch (e) {
      App.toast(e.message, 'error');
    }
  },

  // Instant Test Alert to phone Lock Screen & Top Banner
  async testLockScreenPush() {
    try {
      App.toast('Sending test alert to Lock Screen & Banner...', 'info');
      const res = await API.post('/api/notifications/test-push', {});
      if (res && res.delivered_devices > 0) {
        App.toast(`⚡ Push delivered to ${res.delivered_devices} device(s)! Lock your phone to test.`, 'success');
      } else {
        this.showDeviceNotification('🔔 Lock Screen & Banner Alert', 'Flat Management notifications are working on your mobile screen!');
        App.toast('🔔 Alert triggered! Check your notification center & banner.', 'success');
      }
    } catch (err) {
      this.showDeviceNotification('🔔 Lock Screen & Banner Alert', 'Flat Management notifications are working on your mobile screen!');
    }
  },

  // iOS Add to Home Screen Instructions
  openIosInstallGuide() {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i class="fa-brands fa-apple text-base"></i>
            </div>
            <h3 class="text-base font-black text-slate-900">Lock Screen Alerts on iPhone</h3>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 text-sm">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="text-xs text-slate-600 space-y-3">
          <p>Apple requires web apps to be added to your home screen to show notifications on the <strong>Lock Screen</strong>, <strong>Notification Center</strong>, & <strong>Banner</strong>.</p>
          <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
              <span>In Safari, tap the <strong>Share</strong> button <i class="fa-solid fa-arrow-up-from-bracket text-indigo-600"></i> at the bottom.</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong> <i class="fa-solid fa-plus-square text-indigo-600"></i>.</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
              <span>Open the FlatApp from your home screen and tap <strong>"Enable Alerts"</strong>!</span>
            </div>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <button onclick="App.closeModal()" class="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs">
            Got It
          </button>
        </div>
      </div>
    `);
  },

  // Trigger Native Phone Screen Notification (iOS / Android / Desktop)
  showDeviceNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: '/icons/icon.svg',
            badge: '/icons/icon.svg',
            vibrate: [200, 100, 200]
          });
        });
      } else {
        new Notification(title, {
          body,
          icon: '/icons/icon.svg'
        });
      }
    } catch (e) {}
  },

  updateBadge() {
    const badgeEl = document.getElementById('notif-badge-pill');
    const bellBtn = document.getElementById('navbar-notif-btn');

    if (!badgeEl || !bellBtn) return;

    if (this.unreadCount > 0) {
      badgeEl.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
      badgeEl.classList.remove('hidden');
      badgeEl.classList.add('flex');
    } else {
      badgeEl.classList.add('hidden');
      badgeEl.classList.remove('flex');
    }
  },

  // Open the Notification Drawer
  async openDrawer() {
    await this.fetchNotifications();

    let drawerEl = document.getElementById('notif-drawer-modal');
    if (!drawerEl) {
      drawerEl = document.createElement('div');
      drawerEl.id = 'notif-drawer-modal';
      drawerEl.className = 'fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity';
      document.body.appendChild(drawerEl);
    }

    drawerEl.innerHTML = this.renderDrawerHtml();
    drawerEl.classList.remove('hidden');
  },

  closeDrawer() {
    const drawerEl = document.getElementById('notif-drawer-modal');
    if (drawerEl) drawerEl.classList.add('hidden');
  },

  setFilter(filter) {
    this.activeFilter = filter;
    const bodyEl = document.getElementById('notif-drawer-list');
    if (bodyEl) {
      bodyEl.innerHTML = this.renderListItems();
    }

    // Update filter tabs UI
    ['all', 'bill', 'food', 'payment', 'announcement'].forEach(f => {
      const tab = document.getElementById(`notif-filter-${f}`);
      if (tab) {
        if (f === filter) {
          tab.className = 'px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs';
        } else {
          tab.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600';
        }
      }
    });
  },

  async markAllRead() {
    try {
      await API.post('/api/notifications/mark-read', { all: true });
      this.list.forEach(n => n.is_read = 1);
      this.unreadCount = 0;
      this.updateBadge();
      const bodyEl = document.getElementById('notif-drawer-list');
      if (bodyEl) bodyEl.innerHTML = this.renderListItems();
      App.toast('All notifications marked as read', 'success');
    } catch (e) {
      App.toast(e.message, 'error');
    }
  },

  async markSingleRead(id) {
    try {
      await API.post('/api/notifications/mark-read', { notification_id: id });
      const item = this.list.find(n => n.id === id);
      if (item && item.is_read === 0) {
        item.is_read = 1;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateBadge();
        const itemEl = document.getElementById(`notif-item-${id}`);
        if (itemEl) itemEl.classList.remove('bg-indigo-50/40', 'border-indigo-100');
      }
    } catch (e) {}
  },

  renderDrawerHtml() {
    const isAdmin = App.userType === 'admin';

    return `
      <div class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <!-- Drawer Header -->
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
              <i class="fa-solid fa-bell"></i>
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900 leading-tight">Notifications</h2>
              <p class="text-[11px] text-slate-400">Updates for rent, bills, food mess & payments</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            ${this.unreadCount > 0 ? `
              <button onclick="Notifications.markAllRead()" class="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all" title="Mark all read">
                Mark all read
              </button>
            ` : ''}
            <button onclick="Notifications.closeDrawer()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Mobile Device Screen Push Notification Permission Banner -->
        ${'Notification' in window && Notification.permission !== 'granted' ? `
          <div id="notif-perm-banner" class="p-3 bg-gradient-to-r from-indigo-50 to-amber-50 border-b border-indigo-100 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 text-slate-700">
              <i class="fa-solid fa-mobile-screen-button text-indigo-600 text-sm"></i>
              <span>Allow <strong>Lock Screen</strong>, <strong>Notification Center</strong> & <strong>Banner</strong> alerts!</span>
            </div>
            <button onclick="Notifications.requestDevicePermission()" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all shrink-0">
              Allow
            </button>
          </div>
        ` : `
          <div class="px-3.5 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5 text-emerald-800">
              <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
              <span>Lock Screen & Banner: <strong>Allowed</strong></span>
            </div>
            <button onclick="Notifications.testLockScreenPush()" class="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] rounded-lg shadow-2xs transition-all flex items-center gap-1">
              <i class="fa-solid fa-bolt text-amber-500"></i> Test Alert
            </button>
          </div>
        `}

        <!-- iOS iPhone Tip Banner (if applicable) -->
        <div class="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span class="flex items-center gap-1.5"><i class="fa-brands fa-apple text-slate-400"></i> iPhone or iPad?</span>
          <button onclick="Notifications.openIosInstallGuide()" class="text-indigo-600 font-bold hover:underline">
            Lock Screen Guide &rarr;
          </button>
        </div>

        <!-- Filter Categories Bar -->
        <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button id="notif-filter-all" onclick="Notifications.setFilter('all')" class="px-3 py-1 rounded-full text-xs font-bold ${this.activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
            All
          </button>
          <button id="notif-filter-bill" onclick="Notifications.setFilter('bill')" class="px-3 py-1 rounded-full text-xs font-semibold ${this.activeFilter === 'bill' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
            Bills
          </button>
          <button id="notif-filter-food" onclick="Notifications.setFilter('food')" class="px-3 py-1 rounded-full text-xs font-semibold ${this.activeFilter === 'food' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
            Food Mess
          </button>
          <button id="notif-filter-payment" onclick="Notifications.setFilter('payment')" class="px-3 py-1 rounded-full text-xs font-semibold ${this.activeFilter === 'payment' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
            Payments
          </button>
          <button id="notif-filter-announcement" onclick="Notifications.setFilter('announcement')" class="px-3 py-1 rounded-full text-xs font-semibold ${this.activeFilter === 'announcement' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
            Notices
          </button>
        </div>

        <!-- Notification List -->
        <div id="notif-drawer-list" class="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-2">
          ${this.renderListItems()}
        </div>

        <!-- Drawer Footer (Admin Broadcast Button) -->
        ${isAdmin ? `
          <div class="p-3 border-t border-slate-100 bg-white">
            <button onclick="Notifications.openSendModal()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
              <i class="fa-solid fa-paper-plane"></i> Send Notification / Notice
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderListItems() {
    let filtered = this.list;
    if (this.activeFilter !== 'all') {
      filtered = this.list.filter(n => n.category === this.activeFilter);
    }

    if (filtered.length === 0) {
      return `
        <div class="py-16 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl mb-3">
            <i class="fa-regular fa-bell"></i>
          </div>
          <p class="text-xs font-bold text-slate-700">No notifications here</p>
          <p class="text-[11px] text-slate-400 mt-0.5">You're completely up to date!</p>
        </div>
      `;
    }

    return filtered.map(n => {
      let icon = 'fa-bell';
      let iconColor = 'bg-slate-100 text-slate-600';
      if (n.category === 'bill') {
        icon = 'fa-file-invoice-dollar';
        iconColor = 'bg-indigo-50 text-indigo-600';
      } else if (n.category === 'food') {
        icon = 'fa-utensils';
        iconColor = 'bg-amber-50 text-amber-600';
      } else if (n.category === 'payment') {
        icon = 'fa-circle-check';
        iconColor = 'bg-emerald-50 text-emerald-600';
      } else if (n.category === 'rent') {
        icon = 'fa-door-open';
        iconColor = 'bg-purple-50 text-purple-600';
      } else if (n.category === 'announcement') {
        icon = 'fa-bullhorn';
        iconColor = 'bg-rose-50 text-rose-600';
      }

      const timeAgo = this.formatTimeAgo(n.created_at);

      return `
        <div id="notif-item-${n.id}" onclick="Notifications.markSingleRead(${n.id})" class="p-3 rounded-2xl border transition-all cursor-pointer ${n.is_read === 0 ? 'bg-indigo-50/30 border-indigo-100 hover:bg-indigo-50/60' : 'bg-white border-slate-100 hover:bg-slate-50'}">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-xl ${iconColor} flex items-center justify-center text-xs shrink-0 mt-0.5">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <h4 class="text-xs font-bold text-slate-800 truncate">${n.title}</h4>
                ${n.is_read === 0 ? `<span class="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>` : ''}
              </div>
              <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">${n.message}</p>
              <div class="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                <span><i class="fa-solid fa-user-circle text-[9px]"></i> ${n.actor_name || 'System'}</span>
                <span>${timeAgo}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr.replace(' ', 'T') + 'Z');
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return dateStr.slice(0, 10);
  },

  // Admin opens modal to send a custom announcement or alert
  async openSendModal() {
    this.closeDrawer();

    let members = [];
    try {
      members = await API.get('/api/members?status=Active');
    } catch (e) {}

    const html = `
      <div class="space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i class="fa-solid fa-paper-plane"></i>
            </div>
            <h3 class="text-base font-black text-slate-900">Broadcast Notice / Alert</h3>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 text-sm">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onsubmit="Notifications.handleSendSubmit(event)" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Audience</label>
            <select id="notifTargetSelect" class="w-full text-xs font-semibold px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">📢 All Flat Members (Broadcast)</option>
              ${members.map(m => `<option value="member_${m.id}">👤 Specific: ${m.name} (${m.unique_id})</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
            <select id="notifCategorySelect" class="w-full text-xs font-semibold px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="announcement">📢 Announcement / Notice</option>
              <option value="bill">📄 Rent / Bill Notice</option>
              <option value="food">🍲 Weekly Food Mess Alert</option>
              <option value="payment">💰 Payment Reminder</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Title</label>
            <input type="text" id="notifTitleInput" required placeholder="e.g. Electricity Bill Due Soon" class="w-full text-xs px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Notification Message</label>
            <textarea id="notifMessageInput" required rows="3" placeholder="Write message to display in member's app notifications..." class="w-full text-xs px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-paper-plane"></i> Send Notification
            </button>
          </div>
        </form>
      </div>
    `;

    App.showModal(html);
  },

  async handleSendSubmit(e) {
    e.preventDefault();
    const targetVal = document.getElementById('notifTargetSelect').value;
    const category = document.getElementById('notifCategorySelect').value;
    const title = document.getElementById('notifTitleInput').value;
    const message = document.getElementById('notifMessageInput').value;

    let target_type = 'all';
    let target_id = null;
    if (targetVal.startsWith('member_')) {
      target_type = 'member';
      target_id = Number(targetVal.replace('member_', ''));
    }

    try {
      await API.post('/api/notifications/send', {
        title,
        message,
        category,
        target_type,
        target_id
      });

      App.closeModal();
      App.toast('Notification sent successfully to app members!', 'success');
      await this.fetchNotifications();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
