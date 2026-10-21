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

  // Claude AI Theme & Dark / Light Mood Engine
  initTheme() {
    const saved = localStorage.getItem('flat_theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

        <!-- Main Body Content (With safe bottom padding on mobile screens) -->
        <main class="flex-1 w-full max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6">
          <div id="view-content" class="fade-in">
            <!-- Dynamic View Rendered Here -->
            <div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-600"></i></div>
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
  },

  renderNavbar() {
    const isMember = this.userType === 'member';
    const isSuperAdmin = this.currentUser?.role === 'super_admin';
    const isFoodManagerOnly = !isMember && !isSuperAdmin && this.currentUser?.can_manage_food && !this.currentUser?.can_manage_bills && !this.currentUser?.can_manage_rooms;

    let roleTitle = 'Admin Panel';
    if (isMember) roleTitle = 'Member Portal';
    else if (isSuperAdmin) roleTitle = 'Super Admin';
    else if (isFoodManagerOnly) roleTitle = 'Food Manager';

    return `
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 card-shadow no-print">
        <div class="w-full max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <!-- Brand & Network Pill -->
            <div class="flex items-center gap-2 sm:gap-3 cursor-pointer" onclick="App.navigate(App.userType === 'member' ? 'portal' : (isFoodManagerOnly ? 'food' : 'dashboard'))">
              <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${isFoodManagerOnly ? 'bg-amber-600' : 'bg-indigo-600'} text-white flex items-center justify-center font-black text-sm sm:text-lg shadow-sm">
                <i class="fa-solid ${isFoodManagerOnly ? 'fa-utensils' : 'fa-building'}"></i>
              </div>
              <div>
                <span class="font-black text-slate-900 text-sm sm:text-base leading-none block">Flat Manager</span>
                <span class="text-[9px] sm:text-[10px] ${isFoodManagerOnly ? 'text-amber-700' : 'text-indigo-600'} font-bold uppercase tracking-wider block mt-0.5">
                  ${roleTitle}
                </span>
              </div>
            </div>

            <!-- Network Status Pill (Visible on both Mobile & Desktop) -->
            <div class="flex items-center gap-1.5 sm:gap-2">
              <div id="network-status-pill" class="cursor-pointer"></div>
              <button onclick="OfflineStore.installApp()" title="Install App (PWA)" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 transition-all">
                <i class="fa-solid fa-download text-indigo-600"></i>
                <span>Install App</span>
              </button>
            </div>

            <!-- Desktop Navigation Links -->
            <nav class="hidden md:flex items-center space-x-1 text-xs font-semibold">
              ${isMember ? `
                <button onclick="App.navigate('portal')" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${this.currentView === 'portal' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-gauge-high"></i> Dashboard
                </button>
                <button onclick="App.navigate('reports')" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${this.currentView === 'reports' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-file-invoice"></i> My Statement
                </button>
              ` : (isFoodManagerOnly ? `
                <button onclick="App.navigate('food')" class="px-4 py-2 rounded-xl transition-all ${this.currentView === 'food' ? 'bg-amber-100 text-amber-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-utensils mr-1.5 text-amber-600"></i> Weekly Food Mess
                </button>
                <button onclick="App.navigate('payments')" class="px-4 py-2 rounded-xl transition-all ${this.currentView === 'payments' ? 'bg-amber-100 text-amber-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-money-bill-transfer mr-1.5 text-emerald-600"></i> Food Payments
                </button>
              ` : `
                <button onclick="App.navigate('dashboard')" class="px-3.5 py-2 rounded-xl transition-all ${this.currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  Dashboard
                </button>
                ${this.currentUser?.can_manage_bills ? `
                  <button onclick="App.navigate('bills')" class="px-3.5 py-2 rounded-xl transition-all ${this.currentView === 'bills' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    Bills & Splits
                  </button>
                ` : ''}
                ${this.currentUser?.can_manage_food ? `
                  <button onclick="App.navigate('food')" class="px-3.5 py-2 rounded-xl transition-all ${this.currentView === 'food' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    Weekly Food
                  </button>
                ` : ''}
                ${this.currentUser?.can_manage_payments ? `
                  <button onclick="App.navigate('payments')" class="px-3.5 py-2 rounded-xl transition-all ${this.currentView === 'payments' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    Payments
                  </button>
                ` : ''}
                <button onclick="App.navigate('reports')" class="px-3.5 py-2 rounded-xl transition-all ${this.currentView === 'reports' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                  Reports & PDF
                </button>

                <!-- Organized Manage Dropdown for Rooms, Members, Admins, Settings, Audit -->
                <div class="relative inline-block text-left" id="manage-dropdown-container">
                  <button onclick="App.toggleManageDropdown(event)" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${['rooms', 'members', 'admins', 'settings', 'audit'].includes(this.currentView) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    <span>Manage</span>
                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                  </button>
                  <div id="manage-dropdown-menu" class="hidden absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                    ${this.currentUser?.can_manage_rooms ? `
                      <button onclick="App.navigate('rooms'); App.closeManageDropdown()" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                        <i class="fa-solid fa-door-open text-purple-600 w-4 text-center"></i> Rooms Management
                      </button>
                    ` : ''}
                    ${this.currentUser?.can_manage_members ? `
                      <button onclick="App.navigate('members'); App.closeManageDropdown()" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                        <i class="fa-solid fa-users text-blue-600 w-4 text-center"></i> Members List & Dues
                      </button>
                    ` : ''}
                    ${isSuperAdmin ? `
                      <div class="border-t border-slate-100 my-1"></div>
                      <button onclick="App.navigate('admins'); App.closeManageDropdown()" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                        <i class="fa-solid fa-user-shield text-indigo-600 w-4 text-center"></i> Admin Roles & Access
                      </button>
                      <button onclick="App.navigate('audit'); App.closeManageDropdown()" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                        <i class="fa-solid fa-clock-rotate-left text-slate-600 w-4 text-center"></i> Security & Audit Log
                      </button>
                      <button onclick="App.navigate('settings'); App.closeManageDropdown()" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                        <i class="fa-solid fa-sliders text-amber-600 w-4 text-center"></i> Flat Settings
                      </button>
                    ` : ''}
                  </div>
                </div>
              `)}
            </nav>

            <!-- User Info, Theme Toggle & Logout -->
            <div class="flex items-center gap-1.5 sm:gap-2.5">
              <!-- Day / Night Mode Switcher -->
              <button onclick="App.toggleTheme()" title="Switch Day / Night Mood" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 flex items-center justify-center transition-all text-xs">
                <i class="fa-solid fa-moon text-amber-500 dark:hidden"></i>
                <i class="fa-solid fa-sun text-amber-400 hidden dark:inline"></i>
              </button>

              <!-- Mobile User Avatar Initial -->
              <div class="sm:hidden w-8 h-8 rounded-xl ${isFoodManagerOnly ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'} flex items-center justify-center font-bold text-xs" title="${this.currentUser.name}">
                ${(this.currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>

              <!-- Desktop User Info -->
              <div class="text-right hidden sm:block">
                <span class="text-xs font-bold text-slate-800 block">${this.currentUser.name}</span>
                <span class="text-[10px] text-slate-400 font-mono block">
                  ${isMember ? this.currentUser.unique_id : `@${this.currentUser.username}`}
                </span>
              </div>

              <button onclick="App.logout()" title="Sign Out" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-all text-xs">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
    `;
  },

  renderLoginView() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-3xl p-8 card-shadow space-y-6">
          <!-- Logo & Header -->
          <div class="text-center space-y-2">
            <div class="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-lg shadow-indigo-200">
              <i class="fa-solid fa-building"></i>
            </div>
            <h1 class="text-2xl font-black text-slate-900">Flat Management</h1>
            <p class="text-xs text-slate-500">Sign in to your administration dashboard or member portal</p>
          </div>

          <!-- Login Type Tabs -->
          <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
            <button id="tabAdmin" onclick="App.switchLoginTab('admin')" class="py-2.5 rounded-xl bg-white text-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-user-shield"></i> Admin Login
            </button>
            <button id="tabMember" onclick="App.switchLoginTab('member')" class="py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-user"></i> Member Portal
            </button>
          </div>

          <!-- ADMIN LOGIN FORM -->
          <form id="adminLoginForm" onsubmit="App.handleAdminLogin(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Username</label>
              <div class="relative">
                <i class="fa-solid fa-user absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="text" id="adminUser" required value="superadmin" placeholder="superadmin" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="password" id="adminPass" required value="admin123" placeholder="••••••••" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
              Sign In as Admin
            </button>

            <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
              <strong>Default Demo:</strong> Username: <code class="font-bold">superadmin</code> &bull; Password: <code class="font-bold">admin123</code>
            </div>
          </form>

          <!-- MEMBER LOGIN FORM -->
          <form id="memberLoginForm" onsubmit="App.handleMemberLogin(event)" class="space-y-4 hidden">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Unique Member ID</label>
              <div class="relative">
                <i class="fa-solid fa-id-card absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="text" id="memberIdInput" required placeholder="e.g. MEM-001 or MEM-002" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="password" id="memberPassInput" required placeholder="••••••••" class="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
              Sign In to Member Portal
            </button>

            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-950">
              <strong>Sample Member:</strong> ID: <code class="font-bold">MEM-001</code> &bull; Password: <code class="font-bold">flat123</code> (Murad)
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
      tabAdmin.className = 'py-2.5 rounded-xl bg-white text-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1.5';
      tabMember.className = 'py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
    } else {
      adminForm.classList.add('hidden');
      memberForm.classList.remove('hidden');
      tabMember.className = 'py-2.5 rounded-xl bg-white text-emerald-700 shadow-sm transition-all flex items-center justify-center gap-1.5';
      tabAdmin.className = 'py-2.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
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
    this.currentView = view;
    this.render();
  },

  refresh() {
    this.render();
  },

  // Modal helper
  showModal(contentHtml) {
    let modalEl = document.getElementById('global-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'global-modal';
      modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 card-shadow relative animate-in fade-in zoom-in-95 duration-150">
        ${contentHtml}
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
        <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-1.5 shadow-lg flex items-center justify-around no-print" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);">
          <button onclick="App.navigate('portal')" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${this.currentView === 'portal' ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
            <i class="fa-solid fa-gauge-high text-lg"></i>
            <span class="text-[10px] mt-0.5">My Portal</span>
          </button>
          <button onclick="App.navigate('reports')" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${this.currentView === 'reports' ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
            <i class="fa-solid fa-file-invoice text-lg"></i>
            <span class="text-[10px] mt-0.5">Statement</span>
          </button>
          <button onclick="OfflineStore.installApp()" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-slate-500 hover:text-indigo-600">
            <i class="fa-solid fa-download text-lg text-indigo-500"></i>
            <span class="text-[10px] mt-0.5">Install App</span>
          </button>
          <button onclick="App.logout()" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-slate-500 hover:text-rose-600">
            <i class="fa-solid fa-arrow-right-from-bracket text-lg"></i>
            <span class="text-[10px] mt-0.5">Logout</span>
          </button>
        </div>
      `;
    }

    if (isFoodManagerOnly) {
      return `
        <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-1.5 shadow-lg flex items-center justify-around no-print" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);">
          <button onclick="App.navigate('food')" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${this.currentView === 'food' ? 'text-amber-600 font-bold' : 'text-slate-500'}">
            <i class="fa-solid fa-utensils text-lg"></i>
            <span class="text-[10px] mt-0.5">Weekly Food</span>
          </button>
          <button onclick="App.navigate('payments')" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${this.currentView === 'payments' ? 'text-amber-600 font-bold' : 'text-slate-500'}">
            <i class="fa-solid fa-money-bill-transfer text-lg"></i>
            <span class="text-[10px] mt-0.5">Payments</span>
          </button>
          <button onclick="OfflineStore.installApp()" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-slate-500 hover:text-amber-600">
            <i class="fa-solid fa-download text-lg text-amber-500"></i>
            <span class="text-[10px] mt-0.5">Install App</span>
          </button>
          <button onclick="App.logout()" class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-slate-500 hover:text-rose-600">
            <i class="fa-solid fa-arrow-right-from-bracket text-lg"></i>
            <span class="text-[10px] mt-0.5">Logout</span>
          </button>
        </div>
      `;
    }

    // Default Admin Mobile Bottom Navigation
    const isMoreActive = ['rooms', 'members', 'reports', 'admins', 'settings', 'audit'].includes(this.currentView);

    return `
      <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-2xl flex items-center justify-around no-print" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);">
        <button onclick="App.navigate('dashboard')" class="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${this.currentView === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
          <i class="fa-solid fa-house text-lg"></i>
          <span class="text-[10px] mt-0.5">Home</span>
        </button>
        <button onclick="App.navigate('bills')" class="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${this.currentView === 'bills' ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
          <i class="fa-solid fa-file-invoice-dollar text-lg"></i>
          <span class="text-[10px] mt-0.5">Bills</span>
        </button>
        <button onclick="App.navigate('food')" class="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${this.currentView === 'food' ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
          <i class="fa-solid fa-utensils text-lg"></i>
          <span class="text-[10px] mt-0.5">Food</span>
        </button>
        <button onclick="App.navigate('payments')" class="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${this.currentView === 'payments' ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
          <i class="fa-solid fa-money-bill-transfer text-lg"></i>
          <span class="text-[10px] mt-0.5">Payments</span>
        </button>
        <button onclick="App.openMobileMoreMenu()" class="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${isMoreActive ? 'text-indigo-600 font-bold' : 'text-slate-500'}">
          <i class="fa-solid fa-bars text-lg"></i>
          <span class="text-[10px] mt-0.5">More</span>
        </button>
      </div>
    `;
  },

  openMobileMoreMenu() {
    const isSuperAdmin = this.currentUser?.role === 'super_admin';
    const queue = typeof OfflineStore !== 'undefined' ? OfflineStore.getQueue() : [];

    this.showModal(`
      <div class="space-y-4 text-slate-800">
        <!-- Header / User Info -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-sm leading-tight">${this.currentUser?.name}</h3>
              <p class="text-[11px] text-slate-500">@${this.currentUser?.username} &bull; <span class="capitalize text-indigo-600 font-semibold">${this.currentUser?.role?.replace('_', ' ')}</span></p>
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
              <p class="text-xs font-bold text-emerald-950">Supabase Cloud Sync</p>
              <p class="text-[10px] text-emerald-700">${queue.length > 0 ? `${queue.length} offline actions pending` : 'Cloud database connected'}</p>
            </div>
          </div>
          <button onclick="App.closeModal(); OfflineStore.triggerCloudSync();" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all">
            Sync Now
          </button>
        </div>

        <!-- Management Navigation Grid -->
        <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
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
            <i class="fa-solid fa-file-invoice text-indigo-600 text-base"></i>
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
        </div>

        <!-- Day / Night Mood Switcher Row -->
        <button onclick="App.toggleTheme(); App.closeModal();" class="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid ${this.isDarkMode() ? 'fa-sun text-amber-400' : 'fa-moon text-amber-500'} text-base"></i>
            <span class="font-bold text-xs">${this.isDarkMode() ? 'Night Mode (Black Velvet)' : 'Day Mode (Claude Editorial)'}</span>
          </div>
          <span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-700">
            Switch to ${this.isDarkMode() ? 'Day ☀️' : 'Night 🌙'}
          </span>
        </button>

        <!-- App & Session Actions -->
        <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button onclick="App.closeModal(); OfflineStore.installApp();" class="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-mobile-screen"></i> Install on Phone
          </button>
          <button onclick="App.closeModal(); App.logout();" class="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
          </button>
        </div>
      </div>
    `);
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
