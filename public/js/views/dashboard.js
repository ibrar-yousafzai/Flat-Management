// Admin Dashboard View - Responsive Telco/Fintech Design for Both Mobile & PC
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

      const pendingPayments = (paymentsData.payments || []).filter(p => p.status === 'pending');
      const totalOutstanding = members.reduce((acc, m) => acc + Math.max(0, m.outstanding_balance || 0), 0);
      const currency = settings.currency_symbol || 'Rs.';
      const insideCount = members.filter(m => m.type === 'Inside').length;
      const outsideCount = members.filter(m => m.type === 'Outside').length;
      const dueMembers = members.filter(m => (m.outstanding_balance || 0) > 0).slice(0, 5);

      return `
        <div class="space-y-5 pb-12">
          <!-- Responsive Grid: 1 column on Mobile, 12 columns on PC/Laptop -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            <!-- LEFT MAIN COLUMN (lg: 8 columns) -->
            <div class="lg:col-span-8 space-y-4">
              <!-- 1. Hero Status Card (Deep Cobalt Blue Gradient with Circular Gauge) -->
              <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
                <div class="flex items-center gap-4 sm:gap-6 relative z-10">
                  <!-- Circular Gauge Indicator -->
                  <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400/40 bg-blue-600/40 flex flex-col items-center justify-center text-center shrink-0 backdrop-blur-xs shadow-inner">
                    <span class="text-xs sm:text-sm font-black text-emerald-300">Live</span>
                    <span class="text-[9px] text-blue-200 mt-0.5">Oct 2024</span>
                  </div>

                  <!-- Admin Flat Info -->
                  <div class="space-y-1.5 min-w-0">
                    <div class="flex items-center gap-2">
                      <h2 class="text-base sm:text-xl font-black tracking-tight leading-tight truncate">${settings.flat_name || 'Flat Management System'}</h2>
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
              <div class="grid grid-cols-3 gap-2.5 sm:gap-4">
                <!-- Card 1: Members -->
                <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 sm:p-4 text-center flex flex-col justify-between shadow-xs hover:border-orange-400 transition-all">
                  <div>
                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                      <i class="fa-solid fa-users"></i>
                    </div>
                    <p class="text-[11px] font-bold text-slate-700">Members</p>
                    <p class="text-xs sm:text-base font-black text-orange-600 mt-0.5">${members.length}</p>
                  </div>
                  <button onclick="App.navigate('members')" class="mt-2.5 w-full py-1 sm:py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] sm:text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer">
                    Members
                  </button>
                </div>

                <!-- Card 2: Rooms -->
                <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 sm:p-4 text-center flex flex-col justify-between shadow-xs hover:border-orange-400 transition-all">
                  <div>
                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                      <i class="fa-solid fa-door-open"></i>
                    </div>
                    <p class="text-[11px] font-bold text-slate-700">Rooms</p>
                    <p class="text-xs sm:text-base font-black text-orange-600 mt-0.5">${rooms.length}</p>
                  </div>
                  <button onclick="App.navigate('rooms')" class="mt-2.5 w-full py-1 sm:py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] sm:text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer">
                    Rooms
                  </button>
                </div>

                <!-- Card 3: Bills -->
                <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 sm:p-4 text-center flex flex-col justify-between shadow-xs hover:border-orange-400 transition-all">
                  <div>
                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                      <i class="fa-solid fa-receipt"></i>
                    </div>
                    <p class="text-[11px] font-bold text-slate-700">Month Bills</p>
                    <p class="text-xs sm:text-base font-black text-orange-600 mt-0.5">${currency} ${(billsData.total_bills_amount || 0).toLocaleString()}</p>
                  </div>
                  <button onclick="App.navigate('bills')" class="mt-2.5 w-full py-1 sm:py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] sm:text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer">
                    Bills
                  </button>
                </div>
              </div>

              <!-- 3. PAYMENT REVIEW & TOTALS CARD -->
              <div class="bg-white rounded-3xl border border-blue-100 card-shadow p-5 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 class="text-xs font-black text-blue-700 uppercase tracking-wider">PAYMENT REVIEW & DUES</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold font-mono">October 2024</span>
                </div>
                
                <div class="grid grid-cols-3 gap-3 text-left">
                  <div>
                    <p class="text-base sm:text-2xl font-black text-slate-900">${currency} ${totalOutstanding.toLocaleString()}</p>
                    <span class="text-[10px] sm:text-xs text-slate-400 font-semibold block mt-0.5">Pending Dues</span>
                  </div>
                  <div>
                    <p class="text-xs sm:text-base font-bold text-slate-800">${billsData.bills ? billsData.bills.length : 0} items</p>
                    <span class="text-[10px] sm:text-xs text-slate-400 font-semibold block mt-0.5">Bills Active</span>
                  </div>
                  <div>
                    <p class="text-xs sm:text-base font-black ${pendingPayments.length > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-600'} uppercase">
                      ${pendingPayments.length > 0 ? `${pendingPayments.length} PENDING` : 'ALL CLEAR'}
                    </p>
                    <span class="text-[10px] sm:text-xs text-slate-400 font-semibold block mt-0.5">Review Status</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button onclick="App.openPaymentModal()" class="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                    <i class="fa-solid fa-money-bill-transfer"></i> Record Payment
                  </button>
                  <button onclick="App.navigate('payments')" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-list-check"></i> Review Ledger (${pendingPayments.length})
                  </button>
                </div>
              </div>

              <!-- 4. Quick Services & Daily Tools -->
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-3">
                <h3 class="text-xs sm:text-sm font-bold text-slate-900">Get Help & Quick Actions</h3>
                <div class="grid grid-cols-4 gap-2 pt-1 text-center">
                  <!-- Add Bill -->
                  <button onclick="App.openAddBillModal()" class="flex flex-col items-center gap-1.5 group p-2 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer">
                    <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <i class="fa-solid fa-plus-circle"></i>
                    </div>
                    <span class="text-[11px] font-semibold text-slate-700">Add Bill</span>
                  </button>

                  <!-- Add Food -->
                  <button onclick="App.openAddFoodModal()" class="flex flex-col items-center gap-1.5 group p-2 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer">
                    <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <i class="fa-solid fa-utensils"></i>
                    </div>
                    <span class="text-[11px] font-semibold text-slate-700">Weekly Food</span>
                  </button>

                  <!-- Invoices WhatsApp & PDF -->
                  <button onclick="App.navigate('reports')" class="flex flex-col items-center gap-1.5 group p-2 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer">
                    <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <i class="fa-brands fa-whatsapp"></i>
                    </div>
                    <span class="text-[11px] font-semibold text-slate-700">Invoices PDF</span>
                  </button>

                  <!-- Backup -->
                  <a href="/api/reports/database-backup" download class="flex flex-col items-center gap-1.5 group p-2 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer">
                    <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <i class="fa-solid fa-download"></i>
                    </div>
                    <span class="text-[11px] font-semibold text-slate-700">DB Backup</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- RIGHT SIDEBAR COLUMN (lg: 4 columns on PC, stacks below on Mobile) -->
            <div class="lg:col-span-4 space-y-4">
              <!-- Pending Dues Watchlist Card (Top Priority in Sidebar) -->
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-3">
                <div class="flex items-center justify-between border-b pb-2">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs">
                      <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Unpaid Dues Watchlist</h4>
                  </div>
                  <span class="text-[10px] text-rose-600 bg-rose-50 font-bold px-2 py-0.5 rounded-full border border-rose-200">${dueMembers.length} Members</span>
                </div>

                ${dueMembers.length > 0 ? `
                  <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    ${dueMembers.map(m => `
                      <div class="p-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="font-bold text-slate-800 text-xs truncate">${m.name}</div>
                          <div class="text-[10px] text-slate-400 font-mono">${m.room_name || 'Outside'} &bull; ${m.unique_id}</div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                          <div class="text-right mr-1">
                            <div class="text-xs font-black text-rose-600 font-mono">${currency} ${(m.outstanding_balance || 0).toLocaleString()}</div>
                          </div>
                          <button onclick="BillsView.quickRecordPay(${m.id}, ${m.outstanding_balance})" class="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer shadow-2xs active:scale-95" title="Record Payment">
                            Pay
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div class="p-6 text-center text-xs text-slate-400">
                    <i class="fa-solid fa-circle-check text-emerald-500 text-xl mb-1.5 block"></i>
                    All active members are fully cleared!
                  </div>
                `}
              </div>

              <!-- Flat Financial Accounts Quick Card -->
              <div class="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-5 text-white shadow-md space-y-3">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs">
                      <i class="fa-solid fa-building-columns"></i>
                    </div>
                    <span class="text-xs font-black tracking-wider uppercase">Official Accounts</span>
                  </div>
                  <button onclick="App.navigate('settings')" class="text-[10px] text-blue-300 hover:text-white transition-colors cursor-pointer">
                    Edit &rarr;
                  </button>
                </div>

                <div class="space-y-2 text-xs">
                  <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div class="text-[10px] text-blue-200 uppercase font-bold">${settings.bank_name || 'Bank Account'}</div>
                      <div class="font-bold text-white text-xs">${settings.account_title || 'Flat Manager'}</div>
                      <div class="font-mono text-[11px] text-blue-100 select-all">${settings.account_number || 'Not configured'}</div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="p-2 rounded-xl bg-white/5 border border-white/10">
                      <div class="text-[9px] text-amber-300 uppercase font-bold">JazzCash</div>
                      <div class="font-mono font-bold text-white text-xs mt-0.5 truncate">${settings.jazzcash_number || '-'}</div>
                    </div>
                    <div class="p-2 rounded-xl bg-white/5 border border-white/10">
                      <div class="text-[9px] text-emerald-300 uppercase font-bold">Easypaisa</div>
                      <div class="font-mono font-bold text-white text-xs mt-0.5 truncate">${settings.easypaisa_number || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">Error loading dashboard: ${err.message}</div>`;
    }
  }
};