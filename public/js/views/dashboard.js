// Dashboard View
const DashboardView = {
  async render() {
    const currentMonth = new Date().toISOString().slice(0, 7);

    try {
      const [members, rooms, billsData, paymentsData, settings] = await Promise.all([
        API.get('/api/members?status=Active'),
        API.get('/api/rooms'),
        API.get(`/api/bills?month=${currentMonth}`),
        API.get('/api/payments?status=all'),
        API.get('/api/settings')
      ]);

      const pendingPayments = paymentsData.payments.filter(p => p.status === 'pending');
      const totalOutstanding = members.reduce((acc, m) => acc + Math.max(0, m.outstanding_balance || 0), 0);
      const currency = settings.currency_symbol || 'Rs.';

      let html = `
        <div class="space-y-5">
          <!-- Organized Command Header Card (Unified, replaces 3 stacked giant banners) -->
          <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 sm:p-7 relative overflow-hidden">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5 relative z-10">
              <!-- Left: Title, Badges & Alert -->
              <div class="space-y-1.5 sm:space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Flat Month: ${currentMonth}
                  </span>

                  ${pendingPayments.length > 0 ? `
                    <button onclick="App.navigate('payments')" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all cursor-pointer shadow-xs">
                      <i class="fa-solid fa-bell text-amber-600 animate-bounce"></i>
                      <span>${pendingPayments.length} Payment${pendingPayments.length > 1 ? 's' : ''} Pending Review &rarr;</span>
                    </button>
                  ` : ''}
                </div>

                <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">${settings.flat_name || 'Flat Management System'}</h1>
                <p class="text-xs sm:text-sm text-slate-500">Automated rent dividing, weekly food tracking, payments & member portal</p>
              </div>

              <!-- Right: Quick Action Buttons -->
              <div class="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <button onclick="App.openPaymentModal()" class="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                  <i class="fa-solid fa-money-bill-transfer"></i> Record Payment
                </button>
                <button onclick="App.navigate('bills')" class="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                  <i class="fa-solid fa-file-invoice-dollar"></i> Monthly Bills
                </button>
                ${App.currentUser?.role === 'super_admin' ? `
                  <div class="relative inline-block text-left" id="backup-dropdown-container">
                    <button onclick="DashboardView.toggleBackupMenu(event)" class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5" title="Export & Backup">
                      <i class="fa-solid fa-download text-indigo-600"></i>
                      <span>Backup</span>
                      <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                    </button>
                    <div id="backup-dropdown-menu" class="hidden absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30">
                      <a href="/api/reports/export-excel/${currentMonth}" download class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <i class="fa-solid fa-file-excel text-emerald-600 text-sm"></i> Export Excel (${currentMonth})
                      </a>
                      <a href="/api/reports/database-backup" download class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100">
                        <i class="fa-solid fa-database text-indigo-600 text-sm"></i> SQLite DB Backup (.db)
                      </a>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- 4 Main KPI Cards (Responsive 2x2 grid on mobile, 4 on desktop) -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <!-- Active Members -->
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Members</p>
                <p class="text-2xl font-bold text-slate-800 mt-1">${members.length}</p>
                <p class="text-xs text-slate-500 mt-1">
                  <span class="text-emerald-600 font-semibold">${members.filter(m => m.type === 'Inside').length} Inside</span> &bull; 
                  <span>${members.filter(m => m.type === 'Outside').length} Outside</span>
                </p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-users"></i>
              </div>
            </div>

            <!-- Total Rooms -->
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rooms</p>
                <p class="text-2xl font-bold text-slate-800 mt-1">${rooms.length}</p>
                <p class="text-xs text-slate-500 mt-1">
                  Total Fixed Rent: ${currency} ${rooms.reduce((acc, r) => acc + r.base_rent, 0).toLocaleString()}
                </p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-door-open"></i>
              </div>
            </div>

            <!-- Month Bills Total -->
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">${currentMonth} Bills Total</p>
                <p class="text-2xl font-bold text-slate-800 mt-1">${currency} ${billsData.total_bills_amount.toLocaleString()}</p>
                <p class="text-xs text-slate-500 mt-1">${billsData.bills.length} active bill items</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-receipt"></i>
              </div>
            </div>

            <!-- Outstanding Dues -->
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Dues</p>
                <p class="text-2xl font-bold text-rose-600 mt-1">${currency} ${totalOutstanding.toLocaleString()}</p>
                <p class="text-xs text-slate-500 mt-1">Total pending from members</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-hand-holding-dollar"></i>
              </div>
            </div>
          </div>

          <!-- Rooms Occupancy & Rent Split Grid -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-bold text-slate-800">Room Status & Current Occupants</h2>
                <p class="text-xs text-slate-500">Fixed room rents are automatically split equally between sharing members</p>
              </div>
              <button onclick="App.navigate('rooms')" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                Manage Rooms <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              ${rooms.map(room => `
                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-all">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-slate-800">${room.name}</span>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      ${currency} ${room.base_rent.toLocaleString()} / mo
                    </span>
                  </div>
                  <div class="text-xs text-slate-500 mb-3">
                    ${room.occupant_count > 0 
                      ? `<strong class="text-slate-700">${room.occupant_count} member(s)</strong> &bull; Share: <strong class="text-emerald-700 font-bold">${currency} ${room.rent_per_person.toLocaleString()}</strong> each`
                      : '<span class="text-rose-500 italic">No occupants currently</span>'}
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    ${room.occupants.length > 0 ? room.occupants.map(o => `
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-sm">
                        <i class="fa-solid fa-user text-slate-400 text-[10px]"></i> ${o.name}
                      </span>
                    `).join('') : '<span class="text-xs text-slate-400">Empty Room</span>'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Quick Navigation Actions -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onclick="App.openAddMemberModal()" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all text-left group">
              <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-user-plus"></i>
              </div>
              <h4 class="font-bold text-slate-800 text-sm">Add Member</h4>
              <p class="text-xs text-slate-500">Create ID & set room</p>
            </button>

            <button onclick="App.openAddBillModal()" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all text-left group">
              <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-plus-circle"></i>
              </div>
              <h4 class="font-bold text-slate-800 text-sm">Add Bill</h4>
              <p class="text-xs text-slate-500">Wifi, cook, electricity</p>
            </button>

            <button onclick="App.openAddFoodModal()" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all text-left group">
              <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-utensils"></i>
              </div>
              <h4 class="font-bold text-slate-800 text-sm">Weekly Food</h4>
              <p class="text-xs text-slate-500">Record weekly groceries</p>
            </button>

            <button onclick="App.navigate('reports')" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all text-left group">
              <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
                <i class="fa-brands fa-whatsapp"></i>
              </div>
              <h4 class="font-bold text-slate-800 text-sm">PDF & WhatsApp</h4>
              <p class="text-xs text-slate-500">1-click share invoice</p>
            </button>
          </div>
        </div>
      `;

      return html;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading dashboard: ${err.message}</div>`;
    }
  },

  toggleBackupMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('backup-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  }
};
