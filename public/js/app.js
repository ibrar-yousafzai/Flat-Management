// Main Application Controller & Router
const App = {
  currentView: 'dashboard',
  userType: null, // 'admin' or 'member'
  currentUser: null,

  init() {
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

        <!-- Main Body Content -->
        <main class="flex-1 w-full max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div id="view-content" class="fade-in">
            <!-- Dynamic View Rendered Here -->
            <div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-600"></i></div>
          </div>
        </main>

        <!-- Footer -->
        <footer class="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 no-print">
          Flat Management System &bull; Secure Multi-Admin & Member Portal
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
  },

  renderNavbar() {
    const isMember = this.userType === 'member';
    const isSuperAdmin = this.currentUser?.role === 'super_admin';
    const isFoodManagerOnly = !isMember && !isSuperAdmin && this.currentUser?.can_manage_food && !this.currentUser?.can_manage_bills && !this.currentUser?.can_manage_rooms;

    let roleTitle = 'Admin Panel';
    if (isMember) roleTitle = 'Member Portal';
    else if (isSuperAdmin) roleTitle = 'Super Admin';
    else if (isFoodManagerOnly) roleTitle = 'Weekly Food Manager';

    return `
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 card-shadow no-print">
        <div class="w-full max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Logo / Brand -->
            <div class="flex items-center gap-3 cursor-pointer" onclick="App.navigate(App.userType === 'member' ? 'portal' : (isFoodManagerOnly ? 'food' : 'dashboard'))">
              <div class="w-10 h-10 rounded-xl ${isFoodManagerOnly ? 'bg-amber-600' : 'bg-indigo-600'} text-white flex items-center justify-center font-black text-lg shadow-md">
                <i class="fa-solid ${isFoodManagerOnly ? 'fa-utensils' : 'fa-building'}"></i>
              </div>
              <div>
                <span class="font-extrabold text-slate-900 text-base leading-none block">Flat Manager</span>
                <span class="text-[10px] ${isFoodManagerOnly ? 'text-amber-700' : 'text-indigo-600'} font-bold uppercase tracking-wider block mt-0.5">
                  ${roleTitle}
                </span>
              </div>
            </div>

            <!-- Desktop Navigation Links -->
            <nav class="hidden md:flex items-center space-x-1 text-xs font-semibold">
              ${isMember ? `
                <button onclick="App.navigate('portal')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'portal' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-gauge-high mr-1"></i> My Dashboard
                </button>
                <button onclick="App.navigate('reports')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-file-invoice mr-1"></i> My Statement
                </button>
              ` : (isFoodManagerOnly ? `
                <button onclick="App.navigate('food')" class="px-4 py-2 rounded-xl transition-all ${this.currentView === 'food' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-utensils mr-1.5 text-amber-600"></i> Weekly Food Mess
                </button>
                <button onclick="App.navigate('payments')" class="px-4 py-2 rounded-xl transition-all ${this.currentView === 'payments' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  <i class="fa-solid fa-money-bill-transfer mr-1.5 text-emerald-600"></i> Food Payments & Approvals
                </button>
              ` : `
                <button onclick="App.navigate('dashboard')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                  Dashboard
                </button>
                ${this.currentUser?.can_manage_rooms ? `
                  <button onclick="App.navigate('rooms')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'rooms' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Rooms
                  </button>
                ` : ''}
                ${this.currentUser?.can_manage_members ? `
                  <button onclick="App.navigate('members')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'members' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Members
                  </button>
                ` : ''}
                ${this.currentUser?.can_manage_bills ? `
                  <button onclick="App.navigate('bills')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'bills' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Bills & Splits
                  </button>
                ` : ''}
                ${this.currentUser?.can_manage_food ? `
                  <button onclick="App.navigate('food')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'food' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Weekly Food
                  </button>
                ` : ''}
                ${this.currentUser?.can_manage_payments ? `
                  <button onclick="App.navigate('payments')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'payments' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Payments
                  </button>
                ` : ''}
                <button onclick="App.navigate('reports')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                  Reports & PDF
                </button>
                ${isSuperAdmin ? `
                  <button onclick="App.navigate('admins')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'admins' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Admins
                  </button>
                  <button onclick="App.navigate('settings')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Settings
                  </button>
                  <button onclick="App.navigate('audit')" class="px-3 py-2 rounded-xl transition-all ${this.currentView === 'audit' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}">
                    Audit Log
                  </button>
                ` : ''}
              `)}
            </nav>

            <!-- User Info & Logout -->
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <span class="text-xs font-bold text-slate-800 block">${this.currentUser.name}</span>
                <span class="text-[10px] text-slate-400 font-mono block">
                  ${isMember ? this.currentUser.unique_id : `@${this.currentUser.username}`}
                </span>
              </div>
              <button onclick="App.logout()" title="Sign Out" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-all text-xs">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Scrollable Navigation Bar -->
        <div class="md:hidden flex items-center overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-medium space-x-2">
          ${isMember ? `
            <button onclick="App.navigate('portal')" class="px-3 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'portal' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Dashboard</button>
            <button onclick="App.navigate('reports')" class="px-3 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Invoices</button>
          ` : (isFoodManagerOnly ? `
            <button onclick="App.navigate('food')" class="px-3 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'food' ? 'bg-amber-600 text-white' : 'text-slate-600'}">Weekly Food</button>
            <button onclick="App.navigate('payments')" class="px-3 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'payments' ? 'bg-amber-600 text-white' : 'text-slate-600'}">Food Payments</button>
          ` : `
            <button onclick="App.navigate('dashboard')" class="px-2.5 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Dashboard</button>
            <button onclick="App.navigate('bills')" class="px-2.5 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'bills' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Bills</button>
            <button onclick="App.navigate('food')" class="px-2.5 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'food' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Food</button>
            <button onclick="App.navigate('payments')" class="px-2.5 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'payments' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Payments</button>
            <button onclick="App.navigate('reports')" class="px-2.5 py-1.5 rounded-lg whitespace-nowrap ${this.currentView === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-600'}">Reports</button>
          `)}
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
  }
};

// Bootstrap application on window load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
