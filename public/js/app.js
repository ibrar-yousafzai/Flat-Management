// Main Application Controller & Router
const App = {
  currentView: 'dashboard',
  userType: null, // 'admin' or 'member'
  currentUser: null,

  init() {
    this.initTheme();

    // Restore session from localStorage if present
    const savedType = localStorage.getItem('flat_userType');
    const savedUser = localStorage.getItem('flat_currentUser');

    if (savedType && savedUser) {
      this.userType = savedType;
      this.currentUser = JSON.parse(savedUser);
      const isFoodManagerOnly = this.userType === 'admin' && this.currentUser?.role !== 'super_admin' && this.currentUser?.can_manage_food && !this.currentUser?.can_manage_bills && !this.currentUser?.can_manage_rooms;
      this.currentView = this.userType === 'member' ? 'portal' : (isFoodManagerOnly ? 'food' : 'dashboard');
      this.setupSessionTimeout();
    } else {
      this.currentView = 'login';
    }

    this.render();
  },

  // Clean Theme Engine (Default Light, Optional Modern Dark)
  initTheme() {
    const saved = localStorage.getItem('flat_theme');
    const isDark = saved === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('flat_theme', 'light');
      this.toast('☀️ Day Mode activated (Claude Editorial)', 'info');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('flat_theme', 'dark');
      this.toast('🌙 Night Mode activated (Black Velvet)', 'info');
    }
    this.refresh();
  },

  isDarkMode() {
    return document.documentElement.classList.contains('dark');
  },

  // Inactivity timeout protection for shared phones
  setupSessionTimeout() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (!this.currentUser) return;

    const timeoutMinutes = 15; // 15 minutes of inactivity on shared phones
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      if (this.currentUser) {
        this.inactivityTimer = setTimeout(() => {
          this.handleInactivityLogout();
        }, timeoutMs);
      }
    };

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetTimer, { passive: true });
    });

    resetTimer();
  },

  handleInactivityLogout() {
    if (!this.currentUser) return;
    alert('⚠️ Shared Device Security Notice:\n\nYou have been automatically signed out after 15 minutes of inactivity to protect your private records on shared phones.');
    this.logout();
  },

  async render() {
    const appEl = document.getElementById('app');

    if (!this.currentUser) {
      appEl.innerHTML = this.renderLoginView();
      return;
    }

    // Render Navigation & Active View
    appEl.innerHTML = `
      <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <!-- Main Top Navbar -->
        ${this.renderNavbar()}

        <!-- Main Body Content (Fluid Responsive Container: Clean Single-Column on Mobile, Wide Multi-Column on PC) -->
        <main class="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-10">
          <div id="view-content" class="fade-in">
            <!-- Dynamic View Rendered Here -->
            <div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i></div>
          </div>
        </main>

        <!-- Mobile Bottom App Bar (Native iOS / Android experience) -->
        ${this.renderMobileBottomNav()}

        <!-- Desktop Footer -->
        <footer class="hidden md:block border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 no-print">
          Flat Management System &bull; Supabase Cloud Database &bull; PWA Offline Mode
        </footer>
      </div>
    `;

    // Render the specific view asynchronously
    const contentEl = document.getElementById('view-content');
    let viewHtml = '';

    if (this.userType === 'member') {
      if (this.currentView === 'reports') {
        viewHtml = await ReportsView.render();
      } else {
        viewHtml = await PortalView.render();
      }
    } else {
      switch (this.currentView) {
        case 'dashboard': viewHtml = await DashboardView.render(); break;
        case 'rooms': viewHtml = await RoomsView.render(); break;
        case 'members': viewHtml = await MembersView.render(); break;
        case 'bills': viewHtml = await BillsView.render(); break;
        case 'food': viewHtml = await FoodView.render(); break;
        case 'payments': viewHtml = await PaymentsView.render(); break;
        case 'reports': viewHtml = await ReportsView.render(); break;
        case 'admins': viewHtml = await AdminsView.render(); break;
        case 'settings': viewHtml = await SettingsView.render(); break;
        case 'audit': viewHtml = await AuditView.render(); break;
        default: viewHtml = await DashboardView.render();
      }
    }

    contentEl.innerHTML = viewHtml;

    // Render Network status indicator after view renders
    if (typeof OfflineStore !== 'undefined') {
      OfflineStore.renderNetworkIndicator();
    }

    // Initialize in-app notification center & badge counter
    if (typeof Notifications !== 'undefined') {
      Notifications.init();
    }
  },

  renderNavbar() {
    const isMember = this.userType === 'member';
    const isSuperAdmin = this.currentUser?.role === 'super_admin';
    const isFoodManagerOnly = !isMember && !isSuperAdmin && this.currentUser?.can_manage_food && !this.currentUser?.can_manage_bills && !this.currentUser?.can_manage_rooms;
    const userName = (this.currentUser?.name || 'User').toLowerCase();
    const isHome = this.currentView === 'dashboard' || this.currentView === 'portal';

    const viewTitles = {
      dashboard: 'Dashboard',
      portal: 'Member Portal',
      food: 'Weekly Food Mess',
      bills: 'Bills & Utilities',
      members: 'Members Directory',
      rooms: 'Rooms & Rents',
      payments: 'Payments & Ledger',
      reports: 'Reports & Statements',
      admins: 'Admin Roles & Access',
      settings: 'Flat Settings',
      audit: 'Security & Audit Log'
    };
    const currentTitle = viewTitles[this.currentView] || 'Flat Management';

    // Desktop Nav Items for Admin
    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge' },
      { id: 'food', label: 'Food Mess', icon: 'fa-utensils' },
      { id: 'bills', label: 'Bills', icon: 'fa-receipt' },
      { id: 'members', label: 'Members', icon: 'fa-users' },
      { id: 'rooms', label: 'Rooms', icon: 'fa-door-open' },
      { id: 'payments', label: 'Payments', icon: 'fa-money-bill-transfer' },
      { id: 'reports', label: 'Reports', icon: 'fa-chart-pie' }
    ];

    return `
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 card-shadow no-print">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <!-- Left Side: Brand Logo (Desktop) OR Back/User (Mobile) -->
            <div class="flex items-center gap-3">
              <!-- Desktop Brand Header -->
              <div class="hidden md:flex items-center gap-2.5 cursor-pointer select-none" onclick="App.navigate('${isMember ? 'portal' : 'dashboard'}')">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-600 text-white flex items-center justify-center text-base shadow-sm">
                  <i class="fa-solid fa-building-user"></i>
                </div>
                <div>
                  <h1 class="text-sm font-black text-slate-900 tracking-tight leading-none">Flat Management</h1>
                  <span class="text-[10px] text-blue-600 font-bold block mt-0.5">Cloud Sync Active</span>
                </div>
              </div>

              <!-- Mobile Header: Back Button or User Pill -->
              <div class="md:hidden">
                ${isHome ? `
                  <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 cursor-pointer transition-all" onclick="App.openProfileModal()">
                    <i class="fa-regular fa-user-circle text-base text-slate-700"></i>
                    <span class="truncate max-w-[120px] font-bold">${userName}</span>
                  </div>
                ` : `
                  <div class="flex items-center gap-2 cursor-pointer" onclick="App.goBack()">
                    <button onclick="event.stopPropagation(); App.goBack();" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 flex items-center justify-center transition-all text-xs shadow-2xs cursor-pointer active:scale-95">
                      <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div class="min-w-0">
                      <h2 class="text-xs font-black text-slate-900 leading-tight truncate">${currentTitle}</h2>
                      <span class="text-[9px] text-blue-600 font-bold block leading-none">← Back</span>
                    </div>
                  </div>
                `}
              </div>
            </div>

            <!-- Center (Desktop Only): Main Navigation Bar -->
            ${!isMember ? `
              <nav class="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
                ${navItems.map(item => `
                  <button onclick="App.navigate('${item.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${this.currentView === item.id ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}">
                    <i class="fa-solid ${item.icon} text-[11px]"></i>
                    <span>${item.label}</span>
                  </button>
                `).join('')}
              </nav>
            ` : ''}

            <!-- Right Side Tools: AI Assistant, Search, Notifications, User/Menu -->
            <div class="flex items-center gap-1.5 sm:gap-2">
              <!-- AI Automation Hub Pill (Desktop & Mobile) -->
              <button onclick="AIAutomation.openHub()" class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-[11px] sm:text-xs shadow-xs transition-all active:scale-95 cursor-pointer" title="AI Smart Automation">
                <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                <span class="hidden sm:inline">AI Automation</span>
              </button>

              <!-- Search Icon Button -->
              <button onclick="App.openSearchModal()" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all text-xs sm:text-sm shadow-2xs cursor-pointer" title="Search">
                <i class="fa-solid fa-magnifying-glass text-xs"></i>
              </button>

              <!-- In-App Notification Bell with Badge -->
              <button id="navbar-notif-btn" onclick="Notifications.openDrawer()" class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all text-xs sm:text-sm shadow-2xs cursor-pointer" title="Notifications & Alerts">
                <i class="fa-regular fa-bell text-xs sm:text-sm"></i>
                <span id="notif-badge-pill" class="hidden absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-black text-[9px] items-center justify-center border-2 border-white animate-pulse">0</span>
              </button>

              <!-- Desktop User Pill / Logout -->
              <div class="hidden md:inline-flex items-center gap-2 pl-2 border-l border-slate-200">
                <button onclick="App.openProfileModal()" class="px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                  <i class="fa-regular fa-user-circle text-sm text-slate-600"></i>
                  <span>${userName}</span>
                </button>
              </div>

              <!-- Mobile Hamburger Menu Button -->
              <button onclick="App.openMenuDrawer()" class="md:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all text-xs shadow-2xs cursor-pointer" title="More Options">
                <i class="fa-solid fa-bars text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
    `;
  },

  renderLoginView() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 card-shadow space-y-6 border border-slate-100">
          <!-- Logo & Header -->
          <div class="text-center space-y-2">
            <div class="w-14 h-14 bg-gradient-to-tr from-blue-700 to-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-md shadow-blue-500/20">
              <i class="fa-solid fa-building-user"></i>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Flat Management</h1>
            <p class="text-xs text-slate-500">Sign in to your administration dashboard or member portal</p>
          </div>

          <!-- Login Type Tabs -->
          <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
            <button id="tabAdmin" type="button" onclick="App.switchLoginTab('admin')" class="py-2.5 rounded-xl bg-white text-blue-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-user-shield"></i> Admin Login
            </button>
            <button id="tabMember" type="button" onclick="App.switchLoginTab('member')" class="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-user"></i> Member Portal
            </button>
          </div>

          <!-- ADMIN LOGIN FORM -->
          <form id="adminLoginForm" onsubmit="App.handleAdminLogin(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Username</label>
              <div class="relative">
                <i class="fa-solid fa-user absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="text" id="adminUser" required value="superadmin" placeholder="superadmin" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="password" id="adminPass" required value="admin123" placeholder="••••••••" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" />
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In as Admin
            </button>

            <!-- 1-Tap Demo Quick Fill -->
            <div class="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-center justify-between text-xs">
              <div class="text-[11px] text-blue-900">
                <span class="font-bold">Demo Login:</span> superadmin / admin123
              </div>
              <button type="button" onclick="App.fillLoginDemo('admin')" class="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 font-bold text-[10px] rounded-lg border border-blue-200 transition-all cursor-pointer">
                Fill Demo
              </button>
            </div>
          </form>

          <!-- MEMBER LOGIN FORM -->
          <form id="memberLoginForm" onsubmit="App.handleMemberLogin(event)" class="space-y-4 hidden">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-600 uppercase">Member Name or ID *</label>
                <span class="text-[10px] text-emerald-600 font-bold">Name, ID or Phone</span>
              </div>
              <div class="relative">
                <i class="fa-solid fa-id-card absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="text" id="memberIdInput" required placeholder="e.g. Abbas Khan or FL4907" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none font-bold text-slate-800" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Password *</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="password" id="memberPassInput" required placeholder="Your Member ID (e.g. fl4907) or flat123" class="w-full pl-9 pr-10 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none" />
                <button type="button" onclick="App.togglePasswordVisibility('memberPassInput')" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
                  <i class="fa-regular fa-eye"></i>
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-1">Default password is your Member ID (e.g. <code>fl4907</code>) or <code>flat123</code></p>
            </div>

            <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Member Portal
            </button>

            <!-- 1-Tap Active Flat Members Quick Fill -->
            <div class="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-100 space-y-1.5 text-xs">
              <div class="text-[11px] text-emerald-950 font-bold flex items-center justify-between">
                <span>Quick Member Login:</span>
                <span class="text-[10px] text-emerald-700">Tap to fill</span>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <button type="button" onclick="App.fillMemberSpecific('Abbas Khan', 'fl4907')" class="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 cursor-pointer">
                  👤 Abbas Khan
                </button>
                <button type="button" onclick="App.fillMemberSpecific('Hamza', 'fl3150')" class="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 cursor-pointer">
                  👤 Hamza
                </button>
                <button type="button" onclick="App.fillMemberSpecific('Ibrar Khan', 'fl5166')" class="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-200 cursor-pointer">
                  👤 Ibrar Khan
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  switchLoginTab(tab) {
    const adminForm = document.getElementById('adminLoginForm');
    const memberForm = document.getElementById('memberLoginForm');
    const tabAdmin = document.getElementById('tabAdmin');
    const tabMember = document.getElementById('tabMember');

    if (tab === 'admin') {
      adminForm.classList.remove('hidden');
      memberForm.classList.add('hidden');
      tabAdmin.className = 'py-2.5 rounded-xl bg-white text-blue-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer';
      tabMember.className = 'py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';
    } else {
      adminForm.classList.add('hidden');
      memberForm.classList.remove('hidden');
      tabMember.className = 'py-2.5 rounded-xl bg-white text-emerald-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer';
      tabAdmin.className = 'py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';
    }
  },

  fillLoginDemo(type) {
    if (type === 'admin') {
      this.switchLoginTab('admin');
      const userEl = document.getElementById('adminUser');
      const passEl = document.getElementById('adminPass');
      if (userEl) userEl.value = 'superadmin';
      if (passEl) passEl.value = 'admin123';
      this.toast('Filled Super Admin demo credentials', 'info');
    } else {
      this.switchLoginTab('member');
      const memEl = document.getElementById('memberIdInput');
      const passEl = document.getElementById('memberPassInput');
      if (memEl) memEl.value = 'MEM-001';
      if (passEl) passEl.value = 'flat123';
      this.toast('Filled Sample Member demo credentials', 'info');
    }
  },

  async handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;

    try {
      const res = await API.post('/api/auth/admin/login', { username, password });
      this.userType = 'admin';
      this.currentUser = res.user;
      localStorage.setItem('flat_token', res.token);
      localStorage.setItem('flat_userType', 'admin');
      localStorage.setItem('flat_currentUser', JSON.stringify(res.user));
      const isFoodManagerOnly = res.user.role !== 'super_admin' && res.user.can_manage_food && !res.user.can_manage_bills && !res.user.can_manage_rooms;
      this.currentView = isFoodManagerOnly ? 'food' : 'dashboard';
      this.toast(`Welcome back, ${res.user.name}!`, 'success');
      this.setupSessionTimeout();
      this.render();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  async handleMemberLogin(e) {
    e.preventDefault();
    const unique_id = document.getElementById('memberIdInput').value;
    const password = document.getElementById('memberPassInput').value;

    try {
      const res = await API.post('/api/auth/member/login', { unique_id, password });
      this.userType = 'member';
      this.currentUser = res.user;
      localStorage.setItem('flat_token', res.token);
      localStorage.setItem('flat_userType', 'member');
      localStorage.setItem('flat_currentUser', JSON.stringify(res.user));
      this.currentView = 'portal';
      this.toast(`Welcome, ${res.user.name}!`, 'success');
      this.setupSessionTimeout();
      this.render();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  logout() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.userType = null;
    this.currentUser = null;
    localStorage.removeItem('flat_token');
    localStorage.removeItem('flat_userType');
    localStorage.removeItem('flat_currentUser');
    this.render();
  },

  navigate(view) {
    if (this.currentView !== view) {
      if (!this.viewHistory) this.viewHistory = [];
      this.viewHistory.push(this.currentView);
      this.currentView = view;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  goBack() {
    if (this.viewHistory && this.viewHistory.length > 0) {
      this.currentView = this.viewHistory.pop();
    } else {
      this.currentView = (this.userType === 'member') ? 'portal' : 'dashboard';
    }
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  refresh() {
    this.render();
  },

  getDefaultMonth() {
    return '2024-10';
  },

  formatMonth(monthStr) {
    if (!monthStr) return 'October 2024';
    let [y, m] = String(monthStr).split('-');
    if (y === '2026') y = '2024';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const idx = parseInt(m || '10', 10) - 1;
    const name = monthNames[idx] || 'October';
    return `${name} ${y || '2024'}`;
  },

  formatDisplayDate(dateStr) {
    if (!dateStr) return '22 Oct 2024';
    const clean = String(dateStr).replace('2026-', '2024-');
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '22 Oct 2024';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${monthNames[d.getMonth()]} 2024`;
  },

  togglePasswordVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
      el.type = el.type === 'password' ? 'text' : 'password';
    }
  },

  fillMemberSpecific(nameOrId, password) {
    this.switchLoginTab('member');
    const memEl = document.getElementById('memberIdInput');
    const passEl = document.getElementById('memberPassInput');
    if (memEl) memEl.value = nameOrId;
    if (passEl) passEl.value = password;
    this.toast(`Filled credentials for ${nameOrId}`, 'info');
  },

  // Responsive Modal helper (Native Bottom-Sheet on Mobile, Centered Card on PC)
  showModal(contentHtml, maxWidthClass = 'max-w-2xl') {
    let modalEl = document.getElementById('global-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'global-modal';
      modalEl.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="bg-white rounded-t-3xl sm:rounded-3xl ${maxWidthClass} w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col card-shadow relative animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div class="overflow-y-auto p-4 sm:p-6 flex-1">
          ${contentHtml}
        </div>
      </div>
    `;
    modalEl.classList.remove('hidden');
  },

  closeModal() {
    const modalEl = document.getElementById('global-modal');
    if (modalEl) modalEl.classList.add('hidden');
  },

  // Toast Notification helper
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'bg-emerald-600 text-white' : (type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white');
    toast.className = `${colorClass} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all animate-bounce`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  },

  // Global Quick Action Shortcuts
  async openPaymentModal() {
    const members = await API.get('/api/members?status=Active');
    PaymentsView.openRecordPaymentModal(members);
  },

  async openAddMemberModal() {
    const rooms = await API.get('/api/rooms');
    MembersView.openCreateModal(rooms);
  },

  async openAddBillModal() {
    const [rooms, members] = await Promise.all([
      API.get('/api/rooms'),
      API.get('/api/members?status=Active')
    ]);
    BillsView.openCreateBillModal(rooms, members);
  },

  async openAddFoodModal() {
    const members = await API.get('/api/members?status=Active');
    FoodView.openCreateModal(members);
  },

  openInvoiceModal(memberId, month) {
    ReportsView.selectedMemberId = memberId;
    ReportsView.selectedMonth = month;
    this.navigate('reports');
  },

  renderMobileBottomNav() {
    const isMember = this.userType === 'member';
    const isSuperAdmin = this.currentUser?.role === 'super_admin';
    const isFoodManagerOnly = !isMember && !isSuperAdmin && this.currentUser?.can_manage_food && !this.currentUser?.can_manage_bills && !this.currentUser?.can_manage_rooms;

    if (isMember) {
      return `
        <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-2xl flex items-center justify-between no-print" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);">
          <!-- Dashboard / Home (Peach Pill Active) -->
          <button onclick="App.navigate('portal')" class="transition-all ${this.currentView === 'portal' ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 px-2 py-1'}">
            <i class="fa-solid fa-house ${this.currentView === 'portal' ? 'text-sm' : 'text-base'}"></i>
            <span class="${this.currentView === 'portal' ? 'text-xs' : 'text-[10px] mt-0.5'}">Dashboard</span>
          </button>

          <!-- Billing / Statement -->
          <button onclick="App.navigate('reports')" class="transition-all ${this.currentView === 'reports' ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 px-2 py-1'}">
            <i class="fa-solid fa-file-invoice-dollar ${this.currentView === 'reports' ? 'text-sm' : 'text-base'}"></i>
            <span class="${this.currentView === 'reports' ? 'text-xs' : 'text-[10px] mt-0.5'}">Billing</span>
          </button>

          <!-- Services (Bank, Claim, Mess) -->
          <button onclick="App.openServicesModal()" class="transition-all flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 px-2 py-1">
            <i class="fa-solid fa-shapes text-base"></i>
            <span class="text-[10px] mt-0.5">Services</span>
          </button>

          <!-- WhatsApp Support -->
          <button onclick="App.openWhatsAppSupport()" class="transition-all flex flex-col items-center justify-center text-slate-500 hover:text-emerald-600 px-2 py-1">
            <i class="fa-brands fa-whatsapp text-base text-emerald-600"></i>
            <span class="text-[10px] mt-0.5">Support</span>
          </button>

          <!-- More Options -->
          <button onclick="App.openMenuDrawer()" class="transition-all flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 px-2 py-1">
            <i class="fa-solid fa-bars text-base"></i>
            <span class="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      `;
    }

    if (isFoodManagerOnly) {
      return `
        <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 shadow-2xl flex items-center justify-around no-print" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);">
          <button onclick="App.navigate('food')" class="transition-all ${this.currentView === 'food' ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 px-2 py-1'}">
            <i class="fa-solid fa-utensils ${this.currentView === 'food' ? 'text-sm' : 'text-base'}"></i>
            <span class="${this.currentView === 'food' ? 'text-xs' : 'text-[10px] mt-0.5'}">Food Mess</span>
          </button>
          <button onclick="App.navigate('payments')" class="transition-all ${this.currentView === 'payments' ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 px-2 py-1'}">
            <i class="fa-solid fa-money-bill-transfer ${this.currentView === 'payments' ? 'text-sm' : 'text-base'}"></i>
            <span class="${this.currentView === 'payments' ? 'text-xs' : 'text-[10px] mt-0.5'}">Payments</span>
          </button>
          <button onclick="App.openMenuDrawer()" class="transition-all flex flex-col items-center justify-center text-slate-500 px-2 py-1">
            <i class="fa-solid fa-bars text-base"></i>
            <span class="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      `;
    }

    // Default Admin Mobile Bottom Navigation
    const isBillsActive = this.currentView === 'bills';
    const isFoodActive = this.currentView === 'food';
    const isPaymentsActive = this.currentView === 'payments';
    const isDashboardActive = this.currentView === 'dashboard';

    return `
      <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-2xl flex items-center justify-between no-print" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);">
        <!-- Dashboard / Home -->
        <button onclick="App.navigate('dashboard')" class="transition-all ${isDashboardActive ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 px-2 py-1'}">
          <i class="fa-solid fa-house ${isDashboardActive ? 'text-sm' : 'text-base'}"></i>
          <span class="${isDashboardActive ? 'text-xs' : 'text-[10px] mt-0.5'}">Home</span>
        </button>

        <!-- Bills -->
        <button onclick="App.navigate('bills')" class="transition-all ${isBillsActive ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 px-2 py-1'}">
          <i class="fa-solid fa-file-invoice-dollar ${isBillsActive ? 'text-sm' : 'text-base'}"></i>
          <span class="${isBillsActive ? 'text-xs' : 'text-[10px] mt-0.5'}">Bills</span>
        </button>

        <!-- Food -->
        <button onclick="App.navigate('food')" class="transition-all ${isFoodActive ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 px-2 py-1'}">
          <i class="fa-solid fa-utensils ${isFoodActive ? 'text-sm' : 'text-base'}"></i>
          <span class="${isFoodActive ? 'text-xs' : 'text-[10px] mt-0.5'}">Food</span>
        </button>

        <!-- Payments -->
        <button onclick="App.navigate('payments')" class="transition-all ${isPaymentsActive ? 'bg-[#FED7AA]/50 text-[#EA580C] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs' : 'flex flex-col items-center justify-center text-slate-500 px-2 py-1'}">
          <i class="fa-solid fa-money-bill-transfer ${isPaymentsActive ? 'text-sm' : 'text-base'}"></i>
          <span class="${isPaymentsActive ? 'text-xs' : 'text-[10px] mt-0.5'}">Payments</span>
        </button>

        <!-- More -->
        <button onclick="App.openMenuDrawer()" class="transition-all flex flex-col items-center justify-center text-slate-500 px-2 py-1">
          <i class="fa-solid fa-bars text-base"></i>
          <span class="text-[10px] mt-0.5">More</span>
        </button>
      </div>
    `;
  },

  // Menu Drawer (Accessible via hamburger icon or 'More' tab)
  openMenuDrawer() {
    const isMember = this.userType === 'member';
    const isSuperAdmin = this.currentUser?.role === 'super_admin';
    const isFoodManagerOnly = !isMember && !isSuperAdmin && this.currentUser?.can_manage_food && !this.currentUser?.can_manage_bills && !this.currentUser?.can_manage_rooms;
    const queue = typeof OfflineStore !== 'undefined' ? OfflineStore.getQueue() : [];
    const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

    this.showModal(`
      <div class="space-y-4 text-slate-800">
        <!-- Header / User Info -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl ${isMember ? 'bg-blue-600' : 'bg-indigo-600'} text-white flex items-center justify-center font-bold text-base shadow-sm">
              <i class="fa-solid ${isMember ? 'fa-user' : 'fa-user-shield'}"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-sm leading-tight">${this.currentUser?.name}</h3>
              <p class="text-[11px] text-slate-500">${isMember ? this.currentUser?.unique_id : `@${this.currentUser?.username}`} &bull; <span class="capitalize ${isMember ? 'text-blue-600' : 'text-indigo-600'} font-semibold">${isMember ? 'Member' : (this.currentUser?.role?.replace('_', ' ') || 'Admin')}</span></p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- Supabase Cloud Sync Quick Action -->
        <div class="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs shadow-sm">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-emerald-950">Cloud Sync (Supabase)</p>
              <p class="text-[10px] text-emerald-700">${queue.length > 0 ? `${queue.length} offline actions queued` : 'Real-time database sync active'}</p>
            </div>
          </div>
          <button onclick="App.closeModal(); OfflineStore.triggerCloudSync();" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all">
            Sync Now
          </button>
        </div>

        <!-- Management Navigation Grid -->
        <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
          ${isMember ? `
            <button onclick="App.closeModal(); App.navigate('portal');" class="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-house text-blue-600 text-base"></i>
              <span>Dashboard</span>
            </button>
            <button onclick="App.closeModal(); App.navigate('reports');" class="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-file-invoice text-blue-600 text-base"></i>
              <span>Statements & PDF</span>
            </button>
            <button onclick="App.closeModal(); PortalView.openBankAccountsModal();" class="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-building-columns text-amber-600 text-base"></i>
              <span>Bank Accounts</span>
            </button>
            <button onclick="App.closeModal(); PortalView.openClaimPaymentModal();" class="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-receipt text-emerald-600 text-base"></i>
              <span>Claim Payment</span>
            </button>
          ` : `
            <button onclick="App.closeModal(); App.navigate('dashboard');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-house text-indigo-600 text-base"></i>
              <span>Dashboard</span>
            </button>
            <button onclick="App.closeModal(); App.navigate('bills');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-file-invoice-dollar text-indigo-600 text-base"></i>
              <span>Bills & Utilities</span>
            </button>
            <button onclick="App.closeModal(); App.navigate('food');" class="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-utensils text-amber-600 text-base"></i>
              <span>Weekly Food</span>
            </button>
            <button onclick="App.closeModal(); App.navigate('payments');" class="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-money-bill-transfer text-emerald-600 text-base"></i>
              <span>Payments</span>
            </button>

            ${this.currentUser?.can_manage_rooms ? `
              <button onclick="App.closeModal(); App.navigate('rooms');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
                <i class="fa-solid fa-door-open text-indigo-600 text-base"></i>
                <span>Rooms & Rents</span>
              </button>
            ` : ''}

            ${this.currentUser?.can_manage_members ? `
              <button onclick="App.closeModal(); App.navigate('members');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
                <i class="fa-solid fa-users text-indigo-600 text-base"></i>
                <span>Members</span>
              </button>
            ` : ''}

            <button onclick="App.closeModal(); App.navigate('reports');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
              <i class="fa-solid fa-file-pdf text-indigo-600 text-base"></i>
              <span>Reports & PDF</span>
            </button>

            ${isSuperAdmin ? `
              <button onclick="App.closeModal(); App.navigate('admins');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
                <i class="fa-solid fa-user-gear text-indigo-600 text-base"></i>
                <span>Admins</span>
              </button>
              <button onclick="App.closeModal(); App.navigate('settings');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
                <i class="fa-solid fa-sliders text-indigo-600 text-base"></i>
                <span>Settings</span>
              </button>
              <button onclick="App.closeModal(); App.navigate('audit');" class="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-left transition-all flex items-center gap-2.5">
                <i class="fa-solid fa-shield-halved text-indigo-600 text-base"></i>
                <span>Audit Log</span>
              </button>
            ` : ''}
          `}
        </div>

        <!-- Lock Screen / Push Notifications Toggle Row -->
        <button onclick="App.togglePushNotifications();" class="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid fa-bell text-rose-500 text-base"></i>
            <div>
              <span class="font-bold text-xs block">Lock Screen Alerts</span>
              <span class="text-[10px] text-slate-500 block">Banner & lock screen notifications outside app</span>
            </div>
          </div>
          <span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${notifPermission === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${notifPermission === 'granted' ? 'Active ✓' : 'Enable'}
          </span>
        </button>

        <!-- Day / Night Mood Switcher Row -->
        <button onclick="App.toggleTheme(); App.closeModal();" class="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid ${this.isDarkMode() ? 'fa-sun text-amber-400' : 'fa-moon text-amber-500'} text-base"></i>
            <span class="font-bold text-xs">${this.isDarkMode() ? 'Night Mode (Black Velvet)' : 'Day Mode (Clean)'}</span>
          </div>
          <span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-700">
            Switch to ${this.isDarkMode() ? 'Day ☀️' : 'Night 🌙'}
          </span>
        </button>

        <!-- App & Session Actions -->
        <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button onclick="App.closeModal(); OfflineStore.installApp();" class="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-mobile-screen"></i> Install App
          </button>
          <button onclick="App.closeModal(); App.logout();" class="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
          </button>
        </div>
      </div>
    `);
  },

  openMobileMoreMenu() {
    this.openMenuDrawer();
  },

  // Oval profile pill modal (matching screenshot header profile)
  openProfileModal() {
    const isMember = this.userType === 'member';
    const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

    this.showModal(`
      <div class="space-y-4 text-slate-800">
        <!-- Top Profile Card -->
        <div class="text-center p-4 bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-blue-100">
          <div class="w-16 h-16 rounded-full ${isMember ? 'bg-blue-600' : 'bg-indigo-600'} text-white text-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
            <i class="fa-solid ${isMember ? 'fa-user' : 'fa-user-shield'}"></i>
          </div>
          <h2 class="text-lg font-black text-slate-900">${this.currentUser?.name}</h2>
          <p class="text-xs text-blue-700 font-mono font-bold mt-0.5">
            ${isMember ? `Member ID: ${this.currentUser?.unique_id}` : `@${this.currentUser?.username} &bull; ${this.currentUser?.role?.replace('_', ' ')}`}
          </p>
          <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Status: Active & Verified
          </div>
        </div>

        <!-- Details Grid -->
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
          ${isMember ? `
            <div class="flex justify-between py-1 border-b border-slate-200/60">
              <span class="text-slate-500">Flat Location:</span>
              <span class="font-bold text-slate-800">Flat Management (Active)</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60">
              <span class="text-slate-500">Contact / WhatsApp:</span>
              <span class="font-bold text-slate-800">${this.currentUser?.phone || 'On File'}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">App Mode:</span>
              <span class="font-bold text-emerald-600">Offline PWA Supported ✓</span>
            </div>
          ` : `
            <div class="flex justify-between py-1 border-b border-slate-200/60">
              <span class="text-slate-500">System Role:</span>
              <span class="font-bold text-slate-800 capitalize">${this.currentUser?.role?.replace('_', ' ')}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60">
              <span class="text-slate-500">Database Engine:</span>
              <span class="font-bold text-emerald-600">Supabase Cloud + Local Cache</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Push Notifications:</span>
              <span class="font-bold ${notifPermission === 'granted' ? 'text-emerald-600' : 'text-amber-600'}">${notifPermission === 'granted' ? 'Enabled (Lock Screen Active)' : 'Disabled'}</span>
            </div>
          `}
        </div>

        <!-- Quick Preferences -->
        <div class="space-y-2">
          <button onclick="App.toggleTheme();" class="w-full p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition-all">
            <span class="flex items-center gap-2">
              <i class="fa-solid ${this.isDarkMode() ? 'fa-sun text-amber-500' : 'fa-moon text-indigo-500'}"></i>
              Theme Mood
            </span>
            <span class="text-[10px] text-slate-500">${this.isDarkMode() ? 'Night Mode' : 'Day Mode'}</span>
          </button>

          <button onclick="OfflineStore.installApp();" class="w-full p-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-between transition-all">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-mobile-screen"></i>
              Add to Mobile Home Screen
            </span>
            <span class="text-[10px] text-blue-600 font-semibold">Install PWA</span>
          </button>
        </div>

        <!-- Logout Action -->
        <div class="pt-2 border-t border-slate-100 flex gap-2">
          <button onclick="App.closeModal()" class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all">
            Close
          </button>
          <button onclick="App.closeModal(); App.logout();" class="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all">
            Sign Out
          </button>
        </div>
      </div>
    `);
  },

  // Interactive Live Search Modal
  async openSearchModal() {
    this.showModal(`
      <div class="space-y-4 text-slate-800">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <div class="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <i class="fa-solid fa-magnifying-glass text-blue-600"></i>
            <span>Quick Search</span>
          </div>
          <button onclick="App.closeModal()" class="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>

        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
          <input type="text" id="quickSearchInput" oninput="App.handleLiveSearch(this.value)" placeholder="Search members, bills, payments, rooms..." autofocus class="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div id="quickSearchResults" class="max-h-72 overflow-y-auto space-y-1.5 text-xs">
          <div class="p-4 text-center text-slate-400">
            <i class="fa-solid fa-keyboard text-2xl mb-1 text-slate-300 block"></i>
            Type above to quickly search records
          </div>
        </div>
      </div>
    `);

    setTimeout(() => {
      const input = document.getElementById('quickSearchInput');
      if (input) input.focus();
    }, 150);
  },

  async handleLiveSearch(query) {
    const resultsContainer = document.getElementById('quickSearchResults');
    if (!resultsContainer) return;
    const q = (query || '').trim().toLowerCase();

    if (!q) {
      resultsContainer.innerHTML = `
        <div class="p-4 text-center text-slate-400">
          <i class="fa-solid fa-keyboard text-2xl mb-1 text-slate-300 block"></i>
          Type above to quickly search records
        </div>
      `;
      return;
    }

    try {
      const isMember = this.userType === 'member';
      if (isMember) {
        const portalData = await API.get('/api/portal/dashboard');
        const bills = portalData.recentBills || [];
        const payments = portalData.recentPayments || [];

        const filteredBills = bills.filter(b => (b.month || '').toLowerCase().includes(q) || (b.bill_type || '').toLowerCase().includes(q));
        const filteredPayments = payments.filter(p => (p.payment_month || '').toLowerCase().includes(q) || (p.payment_method || '').toLowerCase().includes(q));

        if (filteredBills.length === 0 && filteredPayments.length === 0) {
          resultsContainer.innerHTML = `<div class="p-4 text-center text-slate-400">No records found matching "${query}"</div>`;
          return;
        }

        let html = '';
        filteredBills.forEach(b => {
          html += `
            <div onclick="App.closeModal(); App.navigate('reports');" class="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 cursor-pointer flex items-center justify-between transition-all">
              <div>
                <span class="font-bold text-slate-800">${b.month} Bill</span>
                <span class="text-[10px] text-slate-500 block">${b.bill_type || 'Monthly Rent & Utilities'}</span>
              </div>
              <span class="font-black text-rose-600">Rs ${Number(b.member_amount || b.total_amount || 0).toLocaleString()}</span>
            </div>
          `;
        });
        filteredPayments.forEach(p => {
          html += `
            <div onclick="App.closeModal(); App.navigate('reports');" class="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 cursor-pointer flex items-center justify-between transition-all">
              <div>
                <span class="font-bold text-slate-800">Payment (${p.payment_month || 'Recent'})</span>
                <span class="text-[10px] text-slate-500 block">${p.payment_method || 'Online'} &bull; ${p.payment_date || ''}</span>
              </div>
              <span class="font-black text-emerald-600">Rs ${Number(p.amount || 0).toLocaleString()}</span>
            </div>
          `;
        });
        resultsContainer.innerHTML = html;
      } else {
        // Admin Search: members, bills, payments
        const [members, bills] = await Promise.all([
          API.get('/api/members'),
          API.get('/api/bills')
        ]);

        const filteredMembers = (members || []).filter(m => (m.name || '').toLowerCase().includes(q) || (m.unique_id || '').toLowerCase().includes(q));
        const filteredBills = (bills || []).filter(b => (b.month || '').toLowerCase().includes(q) || (b.bill_type || '').toLowerCase().includes(q));

        if (filteredMembers.length === 0 && filteredBills.length === 0) {
          resultsContainer.innerHTML = `<div class="p-4 text-center text-slate-400">No members or bills found matching "${query}"</div>`;
          return;
        }

        let html = '';
        filteredMembers.forEach(m => {
          html += `
            <div onclick="App.closeModal(); App.navigate('members');" class="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 cursor-pointer flex items-center justify-between transition-all">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  ${(m.name || 'M').charAt(0)}
                </div>
                <div>
                  <span class="font-bold text-slate-800 block">${m.name}</span>
                  <span class="text-[10px] text-slate-500 font-mono">${m.unique_id || ''} &bull; Room ${m.room_number || '-'}</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">${m.status || 'Active'}</span>
            </div>
          `;
        });
        filteredBills.slice(0, 5).forEach(b => {
          html += `
            <div onclick="App.closeModal(); App.navigate('bills');" class="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 cursor-pointer flex items-center justify-between transition-all">
              <div>
                <span class="font-bold text-slate-800">${b.month} Bill</span>
                <span class="text-[10px] text-slate-500 block">${b.bill_type || 'Utilities'}</span>
              </div>
              <span class="font-black text-indigo-600">Rs ${Number(b.total_amount || 0).toLocaleString()}</span>
            </div>
          `;
        });
        resultsContainer.innerHTML = html;
      }
    } catch (err) {
      console.warn('Search error:', err);
    }
  },

  // Services Modal (Quick shortcuts: Bank accounts, Invoice PDF, Food mess, WhatsApp help)
  openServicesModal() {
    this.showModal(`
      <div class="space-y-4 text-slate-800">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <div class="flex items-center gap-2 font-bold text-sm text-slate-900">
            <i class="fa-solid fa-shapes text-orange-500"></i>
            <span>Services & Quick Actions</span>
          </div>
          <button onclick="App.closeModal()" class="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2.5 text-xs font-semibold">
          <button onclick="App.closeModal(); PortalView.openBankAccountsModal();" class="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-left transition-all flex flex-col items-start gap-2 shadow-2xs">
            <div class="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center text-sm shadow-xs">
              <i class="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <span class="font-black text-amber-950 block">Bank Accounts</span>
              <span class="text-[10px] text-amber-700 block">Copy IBAN & Pay</span>
            </div>
          </button>

          <button onclick="App.closeModal(); PortalView.generateMemberPDF();" class="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-left transition-all flex flex-col items-start gap-2 shadow-2xs">
            <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm shadow-xs">
              <i class="fa-solid fa-file-pdf"></i>
            </div>
            <div>
              <span class="font-black text-blue-950 block">Invoice PDF</span>
              <span class="text-[10px] text-blue-700 block">Download Monthly PDF</span>
            </div>
          </button>

          <button onclick="App.closeModal(); PortalView.openClaimPaymentModal();" class="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 text-left transition-all flex flex-col items-start gap-2 shadow-2xs">
            <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm shadow-xs">
              <i class="fa-solid fa-receipt"></i>
            </div>
            <div>
              <span class="font-black text-emerald-950 block">Claim Payment</span>
              <span class="text-[10px] text-emerald-700 block">Submit Transfer Slip</span>
            </div>
          </button>

          <button onclick="App.closeModal(); App.openWhatsAppSupport();" class="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border border-green-200 text-left transition-all flex flex-col items-start gap-2 shadow-2xs">
            <div class="w-8 h-8 rounded-xl bg-green-600 text-white flex items-center justify-center text-sm shadow-xs">
              <i class="fa-brands fa-whatsapp"></i>
            </div>
            <div>
              <span class="font-black text-green-950 block">WhatsApp Support</span>
              <span class="text-[10px] text-green-700 block">Direct Admin Chat</span>
            </div>
          </button>
        </div>
      </div>
    `);
  },

  // Open Direct WhatsApp Support
  async openWhatsAppSupport() {
    try {
      const settings = await API.get('/api/settings');
      const phone = settings?.contact_phone || settings?.emergency_phone || '923001234567';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const userText = encodeURIComponent(`Hello Admin, I am ${this.currentUser?.name} (${this.currentUser?.unique_id || 'Member'}). I need assistance regarding Flat Management.`);
      window.open(`https://wa.me/${cleanPhone}?text=${userText}`, '_blank');
    } catch (e) {
      window.open(`https://wa.me/?text=Hello%20Admin,%20I%20need%20assistance%20with%20Flat%20Management`, '_blank');
    }
  },

  // Request & Toggle Outside-App Lock Screen / Push Notifications
  async togglePushNotifications() {
    if (typeof Notifications !== 'undefined') {
      await Notifications.requestPushPermission();
    } else {
      App.toast('Notification service is starting...', 'info');
    }
  },

  toggleManageDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('manage-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  },

  closeManageDropdown() {
    const menu = document.getElementById('manage-dropdown-menu');
    if (menu) menu.classList.add('hidden');
  }
};

// Global click listener to close open dropdowns
window.addEventListener('click', (e) => {
  const manageContainer = document.getElementById('manage-dropdown-container');
  if (manageContainer && !manageContainer.contains(e.target)) {
    const menu = document.getElementById('manage-dropdown-menu');
    if (menu) menu.classList.add('hidden');
  }

  const backupContainer = document.getElementById('backup-dropdown-container');
  if (backupContainer && !backupContainer.contains(e.target)) {
    const menu = document.getElementById('backup-dropdown-menu');
    if (menu) menu.classList.add('hidden');
  }
});

// Bootstrap application on window load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
