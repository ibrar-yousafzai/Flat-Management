// Admin Dashboard View - Clean Telco/Fintech Design
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
      const insideCount = members.filter(m => m.type === 'Inside').length;
      const outsideCount = members.filter(m => m.type === 'Outside').length;

      return `
        <div class="space-y-4 max-w-xl mx-auto pb-12">
          <!-- 1. Hero Status Card (Deep Cobalt Blue Gradient with Circular Gauge) -->
          <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div class="flex items-center gap-4 sm:gap-6 relative z-10">
              <!-- Left: Circular Gauge Indicator -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400/40 bg-blue-600/40 flex flex-col items-center justify-center text-center shrink-0 backdrop-blur-xs shadow-inner">
                <span class="text-xs sm:text-sm font-black text-emerald-300">Live</span>
                <span class="text-[9px] text-blue-200 mt-0.5">${currentMonth}</span>
              </div>

              <!-- Right: Admin Flat Info -->
              <div class="space-y-1.5 min-w-0">
                <div class="flex items-center gap-2">
                  <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight truncate">${settings.flat_name || 'Flat Management System'}</h2>
                </div>
                <div class="space-y-1 text-xs text-blue-100">
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-users text-blue-300 w-3.5 text-center"></i>
                    <span><strong>${members.length}</strong> Total Members (${insideCount} In &bull; ${outsideCount} Out)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-door-open text-blue-300 w-3.5 text-center"></i>
                    <span><strong>${rooms.length}</strong> Active Rooms</span>
                  </div>
                  ${pendingPayments.length > 0 ? `
                    <div class="flex items-center gap-1.5 text-amber-300 font-bold">
                      <i class="fa-solid fa-bell text-amber-400 animate-bounce w-3.5 text-center"></i>
                      <span>${pendingPayments.length} Payment Review Pending</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 3 Warm Peach Metric Cards in a Clean Row -->
          <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
            <!-- Card 1: Members -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 text-center flex flex-col justify-between shadow-xs">
              <div>
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                  <i class="fa-solid fa-users"></i>
                </div>
                <p class="text-[11px] font-bold text-slate-700">Members</p>
                <p class="text-xs sm:text-sm font-black text-orange-600 mt-0.5">${members.length}</p>
              </div>
              <button onclick="App.navigate('members')" class="mt-2.5 w-full py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all">
                Members
              </button>
            </div>

            <!-- Card 2: Rooms -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 text-center flex flex-col justify-between shadow-xs">
              <div>
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                  <i class="fa-solid fa-door-open"></i>
                </div>
                <p class="text-[11px] font-bold text-slate-700">Rooms</p>
                <p class="text-xs sm:text-sm font-black text-orange-600 mt-0.5">${rooms.length}</p>
              </div>
              <button onclick="App.navigate('rooms')" class="mt-2.5 w-full py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all">
                Rooms
              </button>
            </div>

            <!-- Card 3: Bills -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 text-center flex flex-col justify-between shadow-xs">
              <div>
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                  <i class="fa-solid fa-receipt"></i>
                </div>
                <p class="text-[11px] font-bold text-slate-700">Month Bills</p>
                <p class="text-xs sm:text-sm font-black text-orange-600 mt-0.5">${currency} ${(billsData.total_bills_amount || 0).toLocaleString()}</p>
              </div>
              <button onclick="App.navigate('bills')" class="mt-2.5 w-full py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all">
                Bills
              </button>
            </div>
          </div>

          <!-- 3. PAYMENT REVIEW & TOTALS CARD -->
          <div class="bg-white rounded-2xl border border-blue-100 card-shadow p-4 sm:p-5 space-y-3.5">
            <h3 class="text-xs font-black text-blue-700 uppercase tracking-wider">PAYMENT REVIEW & DUES</h3>
            
            <div class="grid grid-cols-3 gap-2 text-left pb-1">
              <div>
                <p class="text-base sm:text-xl font-black text-slate-900">${currency} ${totalOutstanding.toLocaleString()}</p>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">Pending Dues</span>
              </div>
              <div>
                <p class="text-xs sm:text-sm font-bold text-slate-800">${billsData.bills ? billsData.bills.length : 0} items</p>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">Bills Active</span>
              </div>
              <div>
                <p class="text-xs sm:text-sm font-black ${pendingPayments.length > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-600'} uppercase">
                  ${pendingPayments.length > 0 ? `${pendingPayments.length} PENDING` : 'ALL CLEAR'}
                </p>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">Review Status</span>
              </div>
            </div>

            <button onclick="App.openPaymentModal()" class="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-money-bill-transfer"></i> RECORD PAYMENT / REVIEW
            </button>
          </div>

          <!-- 4. Quick Services & Daily Tools -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-4 sm:p-5 space-y-3">
            <h3 class="text-xs sm:text-sm font-bold text-slate-900">Get Help & Quick Actions</h3>
            <div class="flex items-center justify-around gap-2 pt-1">
              <!-- Add Bill -->
              <button onclick="App.openAddBillModal()" class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-solid fa-plus-circle"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">Add Bill</span>
              </button>

              <!-- Add Food -->
              <button onclick="App.openAddFoodModal()" class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-solid fa-utensils"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">Weekly Food</span>
              </button>

              <!-- Invoices WhatsApp & PDF -->
              <button onclick="App.navigate('reports')" class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-brands fa-whatsapp"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">Invoices PDF</span>
              </button>

              <!-- Backup -->
              <a href="/api/reports/database-backup" download class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-solid fa-download"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">DB Backup</span>
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">Error loading dashboard: ${err.message}</div>`;
    }
  }
};
