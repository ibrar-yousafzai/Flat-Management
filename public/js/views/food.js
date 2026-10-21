// Weekly Food View - Week-to-Week Mess & Grocery Ledger
const FoodView = {
  currentMonth: new Date().toISOString().slice(0, 7),
  activeMembersCache: [],
  visibleLimit: 6,

  async render() {
    try {
      const [entries, members, settings] = await Promise.all([
        API.get(`/api/food?month=${this.currentMonth}`),
        API.get('/api/members?status=Active'),
        API.get('/api/settings')
      ]);

      this.activeMembersCache = members;
      const currency = settings.currency_symbol || 'Rs.';
      const totalFoodMonth = entries.reduce((acc, e) => acc + Number(e.total_amount || 0), 0);
      const visibleEntries = entries.slice(0, this.visibleLimit || 6);

      // Format month for display (e.g. October 2026)
      const [yearStr, monthStr] = this.currentMonth.split('-');
      const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const monthDisplay = isNaN(monthDate.getTime()) ? this.currentMonth : monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      return `
        <div class="space-y-4 max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto pb-12">
          <!-- 1. Hero Card: Deep Cobalt Blue Gradient with Circular Status Gauge -->
          <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div class="flex items-center gap-4 sm:gap-6 relative z-10">
              <!-- Left: Circular Gauge Indicator -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400/50 bg-amber-500/20 flex flex-col items-center justify-center text-center shrink-0 backdrop-blur-xs shadow-inner">
                <span class="text-xs sm:text-sm font-black text-amber-300">Food Mess</span>
                <span class="text-[9px] text-blue-200 mt-0.5">${monthDisplay}</span>
              </div>

              <!-- Right: Details -->
              <div class="space-y-1.5 min-w-0">
                <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Weekly Food & Grocery Mess</h2>
                <div class="space-y-1 text-xs text-blue-100">
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-calendar-week text-amber-300 w-3.5 text-center"></i>
                    <span>Separate Week-to-Week Ledger</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-users text-blue-300 w-3.5 text-center"></i>
                    <span>${members.length} Active Participating Members</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Three Warm Peach Metric Cards in ONE Row (Matching Reference Screenshot) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Card 1: Total Mess -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-2xl text-center shadow-2xs flex flex-col justify-between">
              <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xs mb-1">
                <i class="fa-solid fa-utensils"></i>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block">Total Mess</span>
                <span class="text-sm font-black text-amber-950 block mt-0.5">${currency} ${totalFoodMonth.toLocaleString()}</span>
              </div>
              <button onclick="FoodView.goToCurrentMonth()" class="mt-2 w-full py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95">
                Month
              </button>
            </div>

            <!-- Card 2: Batches -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-2xl text-center shadow-2xs flex flex-col justify-between">
              <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xs mb-1">
                <i class="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block">Batches</span>
                <span class="text-sm font-black text-amber-950 block mt-0.5">${entries.length} Weeks</span>
              </div>
              <button onclick="document.getElementById('foodBatchesList')?.scrollIntoView({ behavior: 'smooth' })" class="mt-2 w-full py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95">
                Batches
              </button>
            </div>

            <!-- Card 3: Active Members -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-2xl text-center shadow-2xs flex flex-col justify-between">
              <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xs mb-1">
                <i class="fa-solid fa-users"></i>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block">In Mess</span>
                <span class="text-sm font-black text-amber-950 block mt-0.5">${members.length}</span>
              </div>
              <button onclick="FoodView.openFoodReminderModal()" class="mt-2 w-full py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95">
                Remind
              </button>
            </div>
          </div>

          <!-- 3. Primary Review Card: WEEKLY MESS SETTLEMENT & REVIEW -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 card-shadow space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <span class="text-[11px] font-black text-blue-700 uppercase tracking-wider">Weekly Mess Settlement</span>
              <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button onclick="FoodView.prevMonth()" title="Previous Month" class="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <input type="month" value="${this.currentMonth}" onchange="FoodView.changeMonth(this.value)" class="text-[11px] font-bold bg-transparent outline-none cursor-pointer" />
                <button onclick="FoodView.nextMonth()" title="Next Month" class="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 text-left">
              <div>
                <span class="text-sm sm:text-base font-black text-slate-900 block">${currency} ${totalFoodMonth.toLocaleString()}</span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Month Expenses</span>
              </div>
              <div>
                <span class="text-sm sm:text-base font-black text-slate-900 block">${entries.length} items</span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Weekly Batches</span>
              </div>
              <div>
                <span class="text-sm sm:text-base font-black text-emerald-600 block">WEEK-BY-WEEK</span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Settlement Rule</span>
              </div>
            </div>

            <button onclick="FoodView.openCreateModal()" class="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer">
              <i class="fa-solid fa-plus-circle"></i>
              <span>Record Weekly Food Batch</span>
            </button>
          </div>

          <!-- 4. Quick Actions: 4 Circular App Icons in a Neat Row -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 card-shadow space-y-3">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Get Help & Quick Actions</h3>
            <div class="grid grid-cols-4 gap-2 pt-1 text-center">
              <button onclick="FoodView.openCreateModal()" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-solid fa-plus"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Add Batch</span>
              </button>

              <button onclick="FoodView.openFoodReminderModal()" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-brands fa-whatsapp"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Remind</span>
              </button>

              <button onclick="App.navigate('reports')" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-solid fa-file-pdf"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Invoices</span>
              </button>

              <button onclick="FoodView.goToCurrentMonth()" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-solid fa-calendar-day"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Current</span>
              </button>
            </div>
          </div>

          <!-- 5. Food Entries List -->
          <div id="foodBatchesList" class="space-y-3 pt-1">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Weekly Batches (${monthDisplay})</h3>
              <span class="text-[11px] text-slate-400 font-bold">${entries.length} Recorded</span>
            </div>
            ${visibleEntries.length > 0 ? visibleEntries.map(entry => {
              const customMembersCount = entry.members.filter(m => m.is_custom).length;
              const paidCount = entry.paid_count || 0;
              const unpaidCount = entry.unpaid_count !== undefined ? entry.unpaid_count : (entry.member_count - paidCount);
              const paidAmount = entry.paid_amount || 0;
              const unpaidAmount = entry.unpaid_amount !== undefined ? entry.unpaid_amount : Math.max(0, entry.total_amount - paidAmount);
              const percentPaid = entry.member_count > 0 ? Math.round((paidCount / entry.member_count) * 100) : 0;

              return `
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 hover:border-amber-300 transition-all space-y-4">
                <!-- Batch Top Row -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                        ${entry.date}
                      </span>
                      <h3 class="font-bold text-slate-800 text-sm">${entry.title}</h3>
                      ${entry.week_label ? `<span class="text-xs text-slate-400 font-medium">(${entry.week_label})</span>` : ''}
                      ${customMembersCount > 0 ? `<span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300"><i class="fa-solid fa-user-clock mr-1"></i>${customMembersCount} Mid-Week</span>` : ''}
                    </div>
                    ${entry.notes ? `<p class="text-xs text-slate-500 mt-1">${entry.notes}</p>` : ''}
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <div class="text-right mr-1">
                      <div class="text-base sm:text-lg font-black text-slate-900">${currency} ${entry.total_amount.toLocaleString()}</div>
                      <div class="text-[10px] text-slate-500 font-bold">${currency} ${entry.per_person.toLocaleString()} avg / person (${entry.member_count} members)</div>
                    </div>
                    ${unpaidCount > 0 ? `
                      <button onclick="FoodView.markAllPaid(${entry.id})" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer" title="Mark all members paid for this week">
                        <i class="fa-solid fa-check-double mr-1"></i>All Paid
                      </button>
                    ` : ''}
                    <button onclick="FoodView.openEditModalById(${entry.id})" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 flex items-center justify-center transition-all text-xs" title="Edit Batch">
                      <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button onclick="FoodView.deleteEntry(${entry.id}, '${entry.title.replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all text-xs" title="Delete Batch">
                      <i class="fa-regular fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                <!-- Collection Progress Bar -->
                <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-emerald-700 flex items-center gap-1">
                      <i class="fa-solid fa-circle-check"></i>
                      <span>${paidCount} / ${entry.member_count} Paid (${currency} ${paidAmount.toLocaleString()})</span>
                    </span>
                    <span class="${unpaidCount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                      ${unpaidCount > 0 ? `${unpaidCount} Unpaid (${currency} ${unpaidAmount.toLocaleString()})` : 'All Cleared ✓'}
                    </span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-emerald-500 h-2 rounded-full transition-all duration-300" style="width: ${percentPaid}%"></div>
                  </div>
                </div>

                <!-- Participating Members with 1-Tap Paid Toggle -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Member Dues & Payment Status</p>
                    <span class="text-[10px] text-slate-500 font-bold">Tap to toggle Paid / Unpaid</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${entry.members.map(m => `
                      <div class="p-2.5 rounded-2xl border ${m.is_paid === 1 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/40 border-rose-200'} flex items-center justify-between gap-2 transition-all">
                        <div class="min-w-0">
                          <div class="font-bold text-slate-800 text-xs truncate flex items-center gap-1">
                            <span>${m.member_name}</span>
                            ${m.is_custom ? '<span class="text-[9px] bg-amber-200 text-amber-900 font-bold px-1 rounded">Custom</span>' : ''}
                          </div>
                          <div class="text-[10px] text-slate-500 font-mono">
                            ${currency} ${Number(m.amount).toLocaleString()} &bull; ${m.room_name || 'Outside'}
                          </div>
                        </div>

                        <div class="flex items-center gap-1.5 shrink-0">
                          ${m.is_paid === 1 ? `
                            <button onclick="FoodView.toggleMemberPaid(${m.id})" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95" title="Paid. Tap to change back to Unpaid">
                              <i class="fa-solid fa-check text-[9px]"></i> PAID
                            </button>
                          ` : `
                            <button onclick="FoodView.toggleMemberPaid(${m.id})" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs hover:bg-rose-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95" title="Unpaid. Tap to mark as Paid">
                              <i class="fa-solid fa-hand-holding-dollar text-[9px]"></i> PAY
                            </button>
                            <button onclick="FoodView.sendSingleMemberWhatsApp('${m.member_name.replace(/'/g, "\\'")}', '${m.whatsapp || ''}', ${m.amount}, '${entry.title.replace(/'/g, "\\'")}', '${entry.date}')" class="w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center text-[10px] transition-all cursor-pointer active:scale-95" title="Send WhatsApp reminder for Rs. ${m.amount}">
                              <i class="fa-brands fa-whatsapp"></i>
                            </button>
                          `}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
            }).join('') : `
              <div class="bg-white p-12 text-center rounded-2xl border border-slate-200 card-shadow">
                <div class="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl mb-3">
                  <i class="fa-solid fa-utensils"></i>
                </div>
                <h3 class="text-base font-bold text-slate-800">No food expenses recorded for ${monthDisplay}</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click the button below to record weekly groceries and mess batches. Food expenses are settled week-by-week.
                </p>
                <button onclick="FoodView.openCreateModal()" class="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow transition-all">
                  <i class="fa-solid fa-plus mr-1"></i> Record Weekly Food
                </button>
              </div>
            `}

            <!-- Food Entries Show More / Pagination Toolbar -->
            ${entries.length > 6 ? `
              <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span class="text-slate-500 font-medium">Showing ${Math.min(this.visibleLimit || 6, entries.length)} of ${entries.length} weekly batches</span>
                <div class="flex items-center gap-2">
                  ${(this.visibleLimit || 6) < entries.length ? `
                    <button onclick="FoodView.showMore()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                      <i class="fa-solid fa-chevron-down text-xs"></i> Show More (+6)
                    </button>
                    <button onclick="FoodView.showAll()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl transition-all">
                      Show All
                    </button>
                  ` : ''}
                  ${(this.visibleLimit || 6) > 6 ? `
                    <button onclick="FoodView.showLess()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl transition-all">
                      Show Less
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading food expenses: ${err.message}</div>`;
    }
  },

  showMore() {
    this.visibleLimit = (this.visibleLimit || 6) + 6;
    App.refresh();
  },

  showAll() {
    this.visibleLimit = 9999;
    App.refresh();
  },

  showLess() {
    this.visibleLimit = 6;
    App.refresh();
  },

  // Month navigation helpers
  changeMonth(month) {
    if (!month) return;
    this.currentMonth = month;
    this.visibleLimit = 6;
    App.refresh();
  },

  prevMonth() {
    const [y, m] = this.currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.changeMonth(newMonth);
  },

  nextMonth() {
    const [y, m] = this.currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.changeMonth(newMonth);
  },

  goToCurrentMonth() {
    this.changeMonth(new Date().toISOString().slice(0, 7));
  },

  // Create Modal with Per-Head Calculator and Mid-Week Manual Partial Overrides
  async openCreateModal(membersList) {
    const members = membersList || this.activeMembersCache || (await API.get('/api/members?status=Active'));
    this.activeMembersCache = members;

    const today = new Date().toISOString().slice(0, 10);

    App.showModal(`
      <div class="space-y-4 max-w-2xl mx-auto">
        <div class="flex items-center justify-between border-b pb-3">
          <div>
            <h3 class="text-lg font-bold text-slate-800">🍲 Record Weekly Food & Mess Expense</h3>
            <p class="text-xs text-slate-500">Auto-calculate per-head amount or enter custom partial shares for mid-week joiners</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form id="foodCreateForm" onsubmit="FoodView.submitCreate(event)" class="space-y-3.5">
          <!-- Date and Week Label -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Expense Date *</label>
              <input type="date" id="newFoodDate" value="${today}" onchange="FoodView.handleDateChange(this.value)" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Week Label (Optional)</label>
              <input type="text" id="newFoodWeekLabel" placeholder="e.g. Week 1, Oct 1-7" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Expense Title *</label>
            <input type="text" id="newFoodTitle" value="Weekly Grocery & Food Mess" placeholder="e.g. Weekly Grocery & Food Mess" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800" />
          </div>

          <!-- Compact Smart Split Calculator Card -->
          <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3 shadow-2xs">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-black text-amber-900 uppercase flex items-center gap-1.5">
                <i class="fa-solid fa-calculator text-amber-600"></i> Smart Split Calculator
              </span>
              <span class="text-[10px] text-amber-700 font-bold">Auto-syncs per head</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-amber-900 uppercase mb-0.5">
                  Per Head (Rs.)
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-2 text-xs font-bold text-amber-700">Rs.</span>
                  <input type="number" id="foodPerHead" placeholder="e.g. 3000" min="0" step="any" oninput="FoodView.handlePerHeadInput()" class="w-full pl-8 pr-2.5 py-1.5 text-sm font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs" />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-amber-900 uppercase mb-0.5">
                  Total Mess Amount *
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-2 text-xs font-bold text-amber-700">Rs.</span>
                  <input type="number" id="foodTotalAmount" placeholder="e.g. 36000" required min="1" step="any" oninput="FoodView.handleTotalAmountInput()" class="w-full pl-8 pr-2.5 py-1.5 text-sm font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs" />
                </div>
              </div>
            </div>
          </div>

          <!-- Participating Members & Mid-Week Overrides -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <label class="block text-xs font-bold text-slate-700 uppercase">Participating Members (${members.length})</label>
                <span class="text-[11px] text-slate-400 font-normal">|</span>
                <button type="button" onclick="FoodView.toggleAllMembers(true)" class="text-[11px] font-semibold text-amber-700 hover:underline">Select All</button>
                <span class="text-[11px] text-slate-300">/</span>
                <button type="button" onclick="FoodView.toggleAllMembers(false)" class="text-[11px] font-semibold text-slate-500 hover:underline">Deselect All</button>
              </div>
              <span class="text-[11px] text-amber-700 font-medium">
                <i class="fa-solid fa-circle-info mr-0.5"></i> Edit share for mid-week arrivals
              </span>
            </div>

            <div class="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50 text-xs">
              ${members.map(m => `
                <div id="memberRow_${m.id}" class="py-2 flex items-center justify-between gap-3 px-1.5 rounded-lg transition-colors hover:bg-white">
                  <label class="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input type="checkbox" id="memCheck_${m.id}" name="foodMember" value="${m.id}" checked onchange="FoodView.handleMemberToggle(${m.id})" class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                    <div>
                      <div class="font-bold text-slate-800">${m.name} <span class="font-mono text-slate-400 text-[10px]">(${m.unique_id})</span></div>
                      <div class="text-[10px] text-slate-400">${m.type || 'Member'} ${m.room_name ? `• ${m.room_name}` : ''}</div>
                    </div>
                  </label>

                  <div class="flex items-center gap-1.5">
                    <span id="customBadge_${m.id}" class="hidden text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 whitespace-nowrap">
                      Mid-Week
                    </span>
                    <button type="button" id="resetBtn_${m.id}" onclick="FoodView.resetMemberToStandard(${m.id})" title="Reset back to standard per-head" class="hidden text-xs text-slate-400 hover:text-amber-700 p-1">
                      <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    <div class="w-28 relative">
                      <span class="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rs.</span>
                      <input type="number" id="memberShare_${m.id}" data-id="${m.id}" data-is-custom="false" placeholder="0" min="0" step="any" oninput="FoodView.handleMemberCustomInput(${m.id})" class="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Real-Time Live Calculation Breakdown Summary Banner -->
          <div id="foodCalcSummary" class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
            <div id="foodCalcSummaryText" class="flex items-center gap-1.5">
              <i class="fa-solid fa-bolt text-amber-600"></i>
              <span>Enter per-head amount (e.g. 3000) above to auto-calculate</span>
            </div>
            <div id="foodCalcSummaryTotal" class="font-black text-amber-900 font-mono text-sm">
              Rs. 0
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Groceries Purchased (Optional)</label>
            <input type="text" id="newFoodNotes" placeholder="e.g. Rice, Chicken, Oil, Vegetables, Spices" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <span class="text-[11px] text-slate-400">
              <i class="fa-solid fa-lock text-[10px] mr-1"></i>Kept separate from monthly room bills
            </span>
            <div class="flex items-center gap-2">
              <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-check"></i> Save Weekly Food
              </button>
            </div>
          </div>
        </form>
      </div>
    `);

    // Set default per-head to 3000 if not filled yet, or let user type
    // Trigger initial calculation
    setTimeout(() => {
      const perHeadEl = document.getElementById('foodPerHead');
      if (perHeadEl) {
        perHeadEl.value = 3000;
        this.handlePerHeadInput();
      }
    }, 50);
  },

  // Open Edit Modal by Entry ID
  async openEditModalById(entryId) {
    try {
      const [entries, members] = await Promise.all([
        API.get(`/api/food?month=${this.currentMonth}`),
        API.get('/api/members?status=Active')
      ]);
      const entry = entries.find(e => e.id === entryId);
      if (!entry) {
        App.toast('Entry not found', 'error');
        return;
      }
      this.openEditModal(entry, members);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Edit Modal with Per-Head and Custom Shares
  openEditModal(entry, members) {
    this.activeMembersCache = members;

    // Create maps from entry.members
    const splitMap = {};
    for (const sm of entry.members) {
      splitMap[sm.member_id] = sm;
    }

    App.showModal(`
      <div class="space-y-4 max-w-2xl mx-auto">
        <div class="flex items-center justify-between border-b pb-3">
          <div>
            <h3 class="text-lg font-bold text-slate-800">Edit Weekly Food: ${entry.title}</h3>
            <p class="text-xs text-slate-500">Update amounts, per-head calculation, or mid-week arrival shares</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form id="foodEditForm" onsubmit="FoodView.submitEdit(event, ${entry.id})" class="space-y-3.5">
          <!-- Date and Week Label -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Expense Date *</label>
              <input type="date" id="editFoodDate" value="${entry.date}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Week Label</label>
              <input type="text" id="editFoodWeekLabel" value="${entry.week_label || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Expense Title *</label>
            <input type="text" id="editFoodTitle" value="${entry.title}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800" />
          </div>

          <!-- Dual Linked Calculator Card: Per-Head & Total Pool -->
          <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                <i class="fa-solid fa-calculator text-amber-600"></i> Smart Split Calculator
              </span>
              <span class="text-[11px] text-amber-700 font-medium">Type in either field to sync</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                  Per Head Amount (Rs.)
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-xs font-bold text-amber-700">Rs.</span>
                  <input type="number" id="foodPerHead" value="${entry.per_person || ''}" min="0" step="any" oninput="FoodView.handlePerHeadInput()" class="w-full pl-10 pr-3 py-2 text-base font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-inner" />
                </div>
                <p class="text-[10px] text-amber-700 mt-1">Updates all non-custom members</p>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                  Total Mess Amount (Rs.) *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-xs font-bold text-amber-700">Rs.</span>
                  <input type="number" id="foodTotalAmount" value="${entry.total_amount}" required min="1" step="any" oninput="FoodView.handleTotalAmountInput()" class="w-full pl-10 pr-3 py-2 text-base font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-inner" />
                </div>
                <p class="text-[10px] text-amber-700 mt-1">Total pool auto-updates from member shares</p>
              </div>
            </div>
          </div>

          <!-- Participating Members & Mid-Week Overrides -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <label class="block text-xs font-bold text-slate-700 uppercase">Participating Members (${members.length})</label>
                <span class="text-[11px] text-slate-400 font-normal">|</span>
                <button type="button" onclick="FoodView.toggleAllMembers(true)" class="text-[11px] font-semibold text-amber-700 hover:underline">Select All</button>
                <span class="text-[11px] text-slate-300">/</span>
                <button type="button" onclick="FoodView.toggleAllMembers(false)" class="text-[11px] font-semibold text-slate-500 hover:underline">Deselect All</button>
              </div>
              <span class="text-[11px] text-amber-700 font-medium">
                <i class="fa-solid fa-circle-info mr-0.5"></i> Edit share for mid-week arrivals
              </span>
            </div>

            <div class="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50 text-xs">
              ${members.map(m => {
                const split = splitMap[m.id];
                const isParticipating = !!split;
                const isCustom = split ? !!split.is_custom : false;
                const shareAmount = split ? split.amount : '';

                return `
                <div id="memberRow_${m.id}" class="py-2 flex items-center justify-between gap-3 px-1.5 rounded-lg transition-colors hover:bg-white">
                  <label class="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input type="checkbox" id="memCheck_${m.id}" name="foodMember" value="${m.id}" ${isParticipating ? 'checked' : ''} onchange="FoodView.handleMemberToggle(${m.id})" class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                    <div>
                      <div class="font-bold text-slate-800">${m.name} <span class="font-mono text-slate-400 text-[10px]">(${m.unique_id})</span></div>
                      <div class="text-[10px] text-slate-400">${m.type || 'Member'} ${m.room_name ? `• ${m.room_name}` : ''}</div>
                    </div>
                  </label>

                  <div class="flex items-center gap-1.5">
                    <span id="customBadge_${m.id}" class="${isCustom ? '' : 'hidden'} text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 whitespace-nowrap">
                      Mid-Week
                    </span>
                    <button type="button" id="resetBtn_${m.id}" onclick="FoodView.resetMemberToStandard(${m.id})" title="Reset back to standard per-head" class="${isCustom ? '' : 'hidden'} text-xs text-slate-400 hover:text-amber-700 p-1">
                      <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    <div class="w-28 relative">
                      <span class="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rs.</span>
                      <input type="number" id="memberShare_${m.id}" data-id="${m.id}" data-is-custom="${isCustom ? 'true' : 'false'}" value="${shareAmount}" placeholder="0" min="0" step="any" ${isParticipating ? '' : 'disabled'} oninput="FoodView.handleMemberCustomInput(${m.id})" class="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Real-Time Live Calculation Breakdown Summary Banner -->
          <div id="foodCalcSummary" class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
            <div id="foodCalcSummaryText" class="flex items-center gap-1.5">
              <i class="fa-solid fa-bolt text-amber-600"></i>
              <span>Summary active</span>
            </div>
            <div id="foodCalcSummaryTotal" class="font-black text-amber-900 font-mono text-sm">
              Rs. ${Number(entry.total_amount).toLocaleString()}
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Groceries Purchased</label>
            <input type="text" id="editFoodNotes" value="${entry.notes || ''}" placeholder="e.g. Rice, Chicken, Oil, Vegetables" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <span class="text-[11px] text-slate-400">
              <i class="fa-solid fa-lock text-[10px] mr-1"></i>Kept separate from monthly room bills
            </span>
            <div class="flex items-center gap-2">
              <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-check"></i> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    `);

    setTimeout(() => {
      this.updateSummary();
    }, 50);
  },

  // Handlers for reactive sync between Per-Head, Total, and Individual Shares
  handleDateChange(val) {
    if (!val) return;
    const weekLabelEl = document.getElementById('newFoodWeekLabel');
    if (weekLabelEl && !weekLabelEl.value) {
      const d = new Date(val);
      const dayNum = d.getDate();
      const weekIndex = Math.ceil(dayNum / 7);
      const monthShort = d.toLocaleString('default', { month: 'short' });
      weekLabelEl.value = `Week ${weekIndex} (${monthShort} ${dayNum})`;
    }
  },

  handlePerHeadInput() {
    const perHeadVal = parseFloat(document.getElementById('foodPerHead')?.value) || 0;
    const checkboxes = document.querySelectorAll('input[name="foodMember"]:checked');

    checkboxes.forEach(cb => {
      const mId = cb.value;
      const shareInput = document.getElementById(`memberShare_${mId}`);
      if (shareInput && shareInput.dataset.isCustom !== 'true') {
        shareInput.value = perHeadVal > 0 ? perHeadVal : '';
      }
    });

    this.recalcTotalFromShares();
    this.updateSummary();
  },

  handleTotalAmountInput() {
    const totalVal = parseFloat(document.getElementById('foodTotalAmount')?.value) || 0;
    const checkboxes = document.querySelectorAll('input[name="foodMember"]:checked');

    let customSum = 0;
    const standardInputs = [];

    checkboxes.forEach(cb => {
      const mId = cb.value;
      const shareInput = document.getElementById(`memberShare_${mId}`);
      if (shareInput) {
        if (shareInput.dataset.isCustom === 'true') {
          customSum += parseFloat(shareInput.value) || 0;
        } else {
          standardInputs.push(shareInput);
        }
      }
    });

    const remaining = Math.max(0, totalVal - customSum);
    const standardPerHead = standardInputs.length > 0 ? Math.round((remaining / standardInputs.length) * 100) / 100 : 0;

    const perHeadEl = document.getElementById('foodPerHead');
    if (perHeadEl) {
      perHeadEl.value = standardPerHead > 0 ? standardPerHead : '';
    }

    standardInputs.forEach(input => {
      input.value = standardPerHead > 0 ? standardPerHead : '';
    });

    this.updateSummary();
  },

  handleMemberCustomInput(mId) {
    const shareInput = document.getElementById(`memberShare_${mId}`);
    const badge = document.getElementById(`customBadge_${mId}`);
    const resetBtn = document.getElementById(`resetBtn_${mId}`);
    if (!shareInput) return;

    // Mark as custom mid-week
    shareInput.dataset.isCustom = 'true';
    if (badge) badge.classList.remove('hidden');
    if (resetBtn) resetBtn.classList.remove('hidden');
    shareInput.classList.add('border-amber-400', 'bg-amber-50/50');

    this.recalcTotalFromShares();
    this.updateSummary();
  },

  resetMemberToStandard(mId) {
    const shareInput = document.getElementById(`memberShare_${mId}`);
    const badge = document.getElementById(`customBadge_${mId}`);
    const resetBtn = document.getElementById(`resetBtn_${mId}`);
    const perHeadVal = parseFloat(document.getElementById('foodPerHead')?.value) || 0;

    if (shareInput) {
      shareInput.dataset.isCustom = 'false';
      shareInput.value = perHeadVal > 0 ? perHeadVal : '';
      shareInput.classList.remove('border-amber-400', 'bg-amber-50/50');
    }
    if (badge) badge.classList.add('hidden');
    if (resetBtn) resetBtn.classList.add('hidden');

    this.recalcTotalFromShares();
    this.updateSummary();
  },

  handleMemberToggle(mId) {
    const cb = document.getElementById(`memCheck_${mId}`);
    const shareInput = document.getElementById(`memberShare_${mId}`);
    const badge = document.getElementById(`customBadge_${mId}`);
    const resetBtn = document.getElementById(`resetBtn_${mId}`);
    const perHeadVal = parseFloat(document.getElementById('foodPerHead')?.value) || 0;

    if (!cb || !shareInput) return;

    if (cb.checked) {
      shareInput.disabled = false;
      if (shareInput.dataset.isCustom !== 'true') {
        shareInput.value = perHeadVal > 0 ? perHeadVal : '';
      }
    } else {
      shareInput.disabled = true;
      shareInput.value = '';
      shareInput.dataset.isCustom = 'false';
      if (badge) badge.classList.add('hidden');
      if (resetBtn) resetBtn.classList.add('hidden');
      shareInput.classList.remove('border-amber-400', 'bg-amber-50/50');
    }

    this.recalcTotalFromShares();
    this.updateSummary();
  },

  toggleAllMembers(checkAll) {
    const checkboxes = document.querySelectorAll('input[name="foodMember"]');
    const perHeadVal = parseFloat(document.getElementById('foodPerHead')?.value) || 0;

    checkboxes.forEach(cb => {
      cb.checked = checkAll;
      const mId = cb.value;
      const shareInput = document.getElementById(`memberShare_${mId}`);
      const badge = document.getElementById(`customBadge_${mId}`);
      const resetBtn = document.getElementById(`resetBtn_${mId}`);

      if (shareInput) {
        shareInput.disabled = !checkAll;
        if (checkAll) {
          if (shareInput.dataset.isCustom !== 'true') {
            shareInput.value = perHeadVal > 0 ? perHeadVal : '';
          }
        } else {
          shareInput.value = '';
          shareInput.dataset.isCustom = 'false';
          if (badge) badge.classList.add('hidden');
          if (resetBtn) resetBtn.classList.add('hidden');
          shareInput.classList.remove('border-amber-400', 'bg-amber-50/50');
        }
      }
    });

    this.recalcTotalFromShares();
    this.updateSummary();
  },

  recalcTotalFromShares() {
    const checkboxes = document.querySelectorAll('input[name="foodMember"]:checked');
    let total = 0;

    checkboxes.forEach(cb => {
      const mId = cb.value;
      const shareInput = document.getElementById(`memberShare_${mId}`);
      if (shareInput) {
        const val = parseFloat(shareInput.value) || 0;
        total += val;
      }
    });

    const totalEl = document.getElementById('foodTotalAmount');
    if (totalEl) {
      totalEl.value = total > 0 ? total : '';
    }
  },

  updateSummary() {
    const checkboxes = document.querySelectorAll('input[name="foodMember"]:checked');
    const totalEl = document.getElementById('foodTotalAmount');
    const perHeadEl = document.getElementById('foodPerHead');
    const summaryText = document.getElementById('foodCalcSummaryText');
    const summaryTotal = document.getElementById('foodCalcSummaryTotal');

    if (!summaryText || !summaryTotal) return;

    let standardCount = 0;
    let customCount = 0;
    let customSum = 0;
    let grandTotal = 0;

    checkboxes.forEach(cb => {
      const mId = cb.value;
      const shareInput = document.getElementById(`memberShare_${mId}`);
      if (shareInput) {
        const val = parseFloat(shareInput.value) || 0;
        grandTotal += val;
        if (shareInput.dataset.isCustom === 'true') {
          customCount++;
          customSum += val;
        } else {
          standardCount++;
        }
      }
    });

    const perHeadVal = parseFloat(perHeadEl?.value) || 0;

    if (checkboxes.length === 0) {
      summaryText.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-600"></i> No members selected`;
      summaryTotal.innerText = 'Rs. 0';
      return;
    }

    let detailStr = '';
    if (customCount === 0) {
      detailStr = `${standardCount} full-week members @ Rs. ${perHeadVal.toLocaleString()}`;
    } else if (standardCount === 0) {
      detailStr = `${customCount} mid-week custom members`;
    } else {
      detailStr = `${standardCount} full members @ Rs. ${perHeadVal.toLocaleString()} + ${customCount} mid-week custom (Rs. ${customSum.toLocaleString()})`;
    }

    summaryText.innerHTML = `<i class="fa-solid fa-bolt text-amber-600"></i> <span>${detailStr}</span>`;
    summaryTotal.innerText = `Rs. ${grandTotal.toLocaleString()}`;
  },

  // Submit Create
  async submitCreate(e) {
    e.preventDefault();
    const date = document.getElementById('newFoodDate').value;
    const week_label = document.getElementById('newFoodWeekLabel').value;
    const title = document.getElementById('newFoodTitle').value;
    const total_amount = document.getElementById('foodTotalAmount').value;
    const notes = document.getElementById('newFoodNotes').value;

    const checkedBoxes = document.querySelectorAll('input[name="foodMember"]:checked');
    const member_ids = Array.from(checkedBoxes).map(cb => Number(cb.value));

    if (member_ids.length === 0) {
      App.toast('Please select at least one participating member', 'error');
      return;
    }

    const amount = Number(total_amount);
    if (isNaN(amount) || amount <= 0) {
      App.toast('Please enter a valid total amount or per-head amount', 'error');
      return;
    }

    const custom_shares = {};
    for (const mId of member_ids) {
      const shareInput = document.getElementById(`memberShare_${mId}`);
      if (shareInput && shareInput.dataset.isCustom === 'true') {
        const val = Number(shareInput.value);
        if (!isNaN(val) && val >= 0) {
          custom_shares[mId] = val;
        }
      }
    }

    try {
      await API.post('/api/food', {
        date,
        week_label,
        title,
        total_amount: amount,
        member_ids,
        custom_shares,
        notes,
        actor_name: App.currentUser?.name || 'Admin'
      });

      // Automatically jump to the month of the recorded entry so user sees it immediately
      this.currentMonth = date.slice(0, 7);

      App.toast('Weekly food expense recorded successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Submit Edit
  async submitEdit(e, id) {
    e.preventDefault();
    const date = document.getElementById('editFoodDate').value;
    const week_label = document.getElementById('editFoodWeekLabel').value;
    const title = document.getElementById('editFoodTitle').value;
    const total_amount = document.getElementById('foodTotalAmount').value;
    const notes = document.getElementById('editFoodNotes').value;

    const checkedBoxes = document.querySelectorAll('input[name="foodMember"]:checked');
    const member_ids = Array.from(checkedBoxes).map(cb => Number(cb.value));

    if (member_ids.length === 0) {
      App.toast('Please select at least one participating member', 'error');
      return;
    }

    const amount = Number(total_amount);
    if (isNaN(amount) || amount <= 0) {
      App.toast('Please enter a valid total amount or per-head amount', 'error');
      return;
    }

    const custom_shares = {};
    for (const mId of member_ids) {
      const shareInput = document.getElementById(`memberShare_${mId}`);
      if (shareInput && shareInput.dataset.isCustom === 'true') {
        const val = Number(shareInput.value);
        if (!isNaN(val) && val >= 0) {
          custom_shares[mId] = val;
        }
      }
    }

    try {
      await API.put(`/api/food/${id}`, {
        date,
        week_label,
        title,
        total_amount: amount,
        member_ids,
        custom_shares,
        notes,
        actor_name: App.currentUser?.name || 'Admin'
      });

      // Jump to the month of the edited entry
      this.currentMonth = date.slice(0, 7);

      App.toast('Weekly food expense updated successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteEntry(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await API.delete(`/api/food/${id}`);
      App.toast('Food entry deleted', 'info');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Food Dues Reminder Modal
  async openFoodReminderModal() {
    try {
      const [members, consolidated, settings] = await Promise.all([
        API.get('/api/members?status=Active'),
        API.get(`/api/reports/month-consolidated/${this.currentMonth}`),
        API.get('/api/settings')
      ]);

      this.cachedSettings = settings || {};

      const foodMap = {};
      for (const r of (consolidated.rows || [])) {
        foodMap[r.member.id] = r.food_balance;
      }

      const dueMembers = members.map(m => ({
        ...m,
        food_due: foodMap[m.id] || 0
      })).filter(m => m.food_due > 0);

      App.showModal(`
        <div class="space-y-4 max-w-2xl mx-auto">
          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-utensils"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-800">Send Food Mess Reminders</h3>
                <p class="text-xs text-slate-500">Month: <strong>${this.currentMonth}</strong> &bull; Direct 1-Click WhatsApp & PDF Invoices</p>
              </div>
            </div>
            <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Info banner -->
          <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
            <i class="fa-brands fa-whatsapp text-emerald-600 text-sm mt-0.5"></i>
            <div>
              Click <strong>"WhatsApp"</strong> next to any member to instantly jump to their private chat with their food dues breakdown pre-filled. You can also view or print their <strong>PDF Statement</strong>.
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs px-1 mb-2">
              <span class="text-slate-600 font-bold">Members with Unpaid Food Dues (${dueMembers.length}):</span>
              <button onclick="FoodView.toggleSelectAllFood(this)" class="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px]">Select / Deselect All for Email</button>
            </div>

            <div class="max-h-80 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
              ${dueMembers.length > 0 ? dueMembers.map(m => {
                const hasPhone = m.whatsapp && m.whatsapp.trim().length > 0;
                return `
                  <div class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-3">
                      <input type="checkbox" name="foodReminderMember" value="${m.id}" ${m.email ? 'checked' : 'disabled'} class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 shrink-0" />
                      <div>
                        <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>${m.name}</span>
                          <span class="font-mono text-slate-400 text-[10px]">(${m.unique_id})</span>
                          <span class="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600">${m.room_name || 'Outside'}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span class="font-mono ${hasPhone ? 'text-emerald-700 font-semibold' : 'text-rose-500 italic'}">
                            <i class="fa-brands fa-whatsapp text-xs mr-0.5"></i>${hasPhone ? m.whatsapp : 'No WhatsApp saved'}
                          </span>
                          ${m.email ? `<span>&bull;</span><span class="text-slate-400 truncate max-w-[150px]">${m.email}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between sm:justify-end gap-2.5">
                      <div class="text-right mr-1">
                        <div class="text-xs font-black text-amber-700 font-mono">Rs. ${Number(m.food_due).toLocaleString()}</div>
                        <div class="text-[9px] text-slate-400 uppercase font-semibold">Food Due</div>
                      </div>

                      <div class="flex items-center gap-1.5">
                        <button onclick="FoodView.copyWhatsAppFoodForMember(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.food_due}, '${m.unique_id}')" title="Copy formatted text" class="p-2 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                          <i class="fa-regular fa-copy text-xs"></i> <span class="hidden sm:inline">Copy</span>
                        </button>

                        <button onclick="FoodView.sendWhatsAppFoodToMember(${m.id}, '${m.name.replace(/'/g, "\\'")}', '${m.whatsapp || ''}', ${m.food_due}, '${m.unique_id}')" ${hasPhone ? '' : 'disabled'} title="${hasPhone ? 'Direct to WhatsApp' : 'No phone saved'}" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5">
                          <i class="fa-brands fa-whatsapp text-sm"></i>
                          <span>WhatsApp</span>
                        </button>

                        <button onclick="App.openInvoiceModal(${m.id}, '${this.currentMonth}')" title="View / Print PDF Statement" class="p-2 sm:px-2.5 sm:py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                          <i class="fa-solid fa-file-invoice text-xs"></i> <span class="hidden sm:inline">PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="py-8 text-center text-xs text-slate-400">All members have cleared their food mess dues! 🎉</div>
              `}
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onclick="FoodView.copyWhatsAppFoodBroadcast()" class="w-full sm:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-bullhorn text-emerald-600 text-xs"></i> Copy Group Broadcast Text
            </button>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50">Close</button>
              <button type="button" onclick="FoodView.sendBatchFoodEmail()" ${dueMembers.length === 0 ? 'disabled' : ''} class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 disabled:opacity-50">
                <i class="fa-solid fa-paper-plane text-xs"></i> Send Email Reminders
              </button>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  toggleSelectAllFood(btn) {
    const checkboxes = document.querySelectorAll('input[name="foodReminderMember"]:not(:disabled)');
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    checkboxes.forEach(cb => cb.checked = anyUnchecked);
  },

  getMemberWhatsAppMessage(m, settings = {}) {
    const flatName = settings.flat_name || 'Flat Management';
    return `*🍲 Flat Mess Food Dues Reminder*\n` +
      `*Flat:* ${flatName}\n` +
      `*Period:* ${this.currentMonth}\n\n` +
      `Assalam-o-Alaikum *${m.name}* (${m.unique_id || ''}),\n\n` +
      `Your outstanding weekly food grocery mess share is *Rs. ${Number(m.food_due).toLocaleString()}*.\n\n` +
      `Since groceries and vegetable supplies are purchased week-to-week, please clear your food mess dues as soon as possible so meals continue smoothly.\n\n` +
      `📄 *View / Download Statement:* ${window.location.origin}/#reports\n` +
      `After payment, please upload your receipt proof under "Payment for Food Mess" in your portal.\n\n` +
      `Thank you!`;
  },

  cleanPhoneNumber(phone) {
    if (!phone) return '';
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.startsWith('03')) {
      p = '92' + p.slice(1);
    }
    return p;
  },

  sendWhatsAppFoodToMember(memberId, name, phone, foodDue, uniqueId) {
    const m = { id: memberId, name, whatsapp: phone, food_due: foodDue, unique_id: uniqueId };
    const text = this.getMemberWhatsAppMessage(m, this.cachedSettings || {});
    const cleanPhone = this.cleanPhoneNumber(phone);
    if (!cleanPhone) {
      this.copyTextToClipboard(encodeURIComponent(text), `Copied food reminder for ${name}! Please paste into WhatsApp.`);
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    App.toast(`Opened WhatsApp chat for ${name}!`, 'success');
  },

  copyWhatsAppFoodForMember(memberId, name, foodDue, uniqueId) {
    const m = { id: memberId, name, food_due: foodDue, unique_id: uniqueId };
    const text = this.getMemberWhatsAppMessage(m, this.cachedSettings || {});
    this.copyTextToClipboard(encodeURIComponent(text), `Copied food reminder for ${name} to clipboard!`);
  },

  copyTextToClipboard(encodedText, successMsg) {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text).then(() => {
      App.toast(successMsg || 'Copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy message text:', text);
    });
  },

  async sendBatchFoodEmail() {
    const checkboxes = document.querySelectorAll('input[name="foodReminderMember"]:checked');
    const memberIds = Array.from(checkboxes).map(cb => Number(cb.value));

    if (memberIds.length === 0) {
      App.toast('Please select at least one member with email.', 'error');
      return;
    }

    try {
      App.toast('Dispatching food mess reminders...', 'info');
      const res = await API.post('/api/reports/batch-send-emails', {
        month: this.currentMonth,
        member_ids: memberIds,
        email_type: 'food'
      });
      App.toast(res.message, 'success');
      App.closeModal();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  copyWhatsAppFoodBroadcast() {
    const msg = `*🍲 Flat Mess Food Dues Reminder*\n\nDear Flatmates,\nWeekly food mess dues have been posted for this period. As food grocery expenses are paid week-to-week, *please pay your food dues as soon as possible* so groceries can continue uninterrupted.\n\nPlease check your member portal and submit receipt proof under "Payment for Food Mess".\nThank you!`;
    navigator.clipboard.writeText(msg).then(() => {
      App.toast('WhatsApp reminder copied to clipboard! Paste into your flat WhatsApp group.', 'success');
    }).catch(() => {
      prompt('Copy message text:', msg);
    });
  },

  async toggleMemberPaid(splitId) {
    try {
      const res = await API.patch(`/api/food/splits/${splitId}/toggle-paid`);
      const statusText = res.is_paid === 1 ? 'PAID' : 'UNPAID';
      App.toast(`${res.member_name} marked ${statusText}`, 'success');
      await App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async markAllPaid(foodId) {
    if (!confirm('Mark all participating members as PAID for this weekly food batch?')) return;
    try {
      const res = await API.post(`/api/food/${foodId}/mark-all-paid`);
      App.toast(res.message || 'All members marked as paid', 'success');
      await App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  sendSingleMemberWhatsApp(name, phone, amount, title, date) {
    const flatName = (this.cachedSettings && this.cachedSettings.flat_name) || 'Flat Management';
    const text = `*🍲 Food Mess Payment Reminder*\n` +
      `*Flat:* ${flatName}\n` +
      `*Batch:* ${title} (${date})\n\n` +
      `Assalam-o-Alaikum *${name}*,\n\n` +
      `Your share of *Rs. ${Number(amount).toLocaleString()}* for weekly mess groceries (${title}) is currently unpaid.\n` +
      `Since food supplies are bought week-to-week, please clear your share at your earliest so mess groceries continue uninterrupted.\n\n` +
      `Thank you!`;
    const cleanPhone = this.cleanPhoneNumber(phone);
    if (!cleanPhone) {
      this.copyTextToClipboard(encodeURIComponent(text), `Copied reminder for ${name}! Please paste into WhatsApp.`);
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    App.toast(`Opened WhatsApp chat for ${name}!`, 'success');
  }
};
