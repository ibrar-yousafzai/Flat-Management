// Weekly Food View - Week-to-Week Mess & Grocery Ledger
const FoodView = {
  currentMonth: new Date().toISOString().slice(0, 7),
  activeMembersCache: [],

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

      // Format month for display (e.g. October 2026)
      const [yearStr, monthStr] = this.currentMonth.split('-');
      const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const monthDisplay = isNaN(monthDate.getTime()) ? this.currentMonth : monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      return `
        <div class="space-y-6">
          <!-- Header -->
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-1">
                <i class="fa-solid fa-calendar-week text-amber-600"></i> Separate Week-to-Week Ledger (Not counted in monthly flat bills)
              </span>
              <h1 class="text-2xl font-bold text-slate-800">Weekly Food & Grocery Mess</h1>
              <p class="text-sm text-slate-500 mt-0.5">
                Calculate per-head food expenses, handle mid-week arrivals with custom shares, and settle dues week-by-week.
              </p>
            </div>
            
            <div class="flex flex-wrap items-center gap-2">
              <!-- Month Navigation Controls -->
              <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onclick="FoodView.prevMonth()" title="Previous Month" class="px-2.5 py-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold transition-all">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <input type="month" value="${this.currentMonth}" onchange="FoodView.changeMonth(this.value)" class="text-xs font-bold bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none cursor-pointer" />
                <button onclick="FoodView.nextMonth()" title="Next Month" class="px-2.5 py-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold transition-all">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button onclick="FoodView.goToCurrentMonth()" title="Jump to Current Month" class="ml-1 px-2 py-1.5 hover:bg-white text-slate-500 hover:text-amber-700 rounded-lg text-[11px] font-semibold transition-all">
                  Current
                </button>
              </div>

              <button onclick="FoodView.openFoodReminderModal()" class="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-bullhorn text-xs"></i> Send Reminders
              </button>

              <button onclick="FoodView.openCreateModal()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-plus"></i> Record Weekly Food
              </button>
            </div>
          </div>

          <!-- Total Food Summary Card -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Mess Dues (${monthDisplay})</p>
                <p class="text-2xl font-bold text-amber-900 mt-1">${currency} ${totalFoodMonth.toLocaleString()}</p>
                <p class="text-[11px] text-slate-500 mt-0.5">Kept separate from flat rent bills</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-utensils"></i>
              </div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Weekly Batches</p>
                <p class="text-2xl font-bold text-indigo-600 mt-1">${entries.length} ${entries.length === 1 ? 'Week' : 'Weeks'}</p>
                <p class="text-[11px] text-slate-500 mt-0.5">Week-by-week settlements</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-calendar-week"></i>
              </div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 card-shadow flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Mess Members</p>
                <p class="text-2xl font-bold text-emerald-600 mt-1">${members.length} Members</p>
                <p class="text-[11px] text-slate-500 mt-0.5">Supports mid-week joiner overrides</p>
              </div>
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                <i class="fa-solid fa-users"></i>
              </div>
            </div>
          </div>

          <!-- Food Entries List -->
          <div class="space-y-4">
            ${entries.length > 0 ? entries.map(entry => {
              const customMembersCount = entry.members.filter(m => m.is_custom).length;
              return `
              <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-5 hover:border-amber-200 transition-all">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                        ${entry.date}
                      </span>
                      <h3 class="font-bold text-slate-800 text-sm">${entry.title}</h3>
                      ${entry.week_label ? `<span class="text-xs text-slate-400 font-medium">(${entry.week_label})</span>` : ''}
                      ${customMembersCount > 0 ? `<span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300"><i class="fa-solid fa-user-clock mr-1"></i>${customMembersCount} Mid-Week ${customMembersCount === 1 ? 'Override' : 'Overrides'}</span>` : ''}
                    </div>
                    ${entry.notes ? `<p class="text-xs text-slate-500 mt-1">${entry.notes}</p>` : ''}
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <div class="text-right mr-2">
                      <div class="text-lg font-bold text-slate-800">${currency} ${entry.total_amount.toLocaleString()}</div>
                      <div class="text-[11px] text-emerald-700 font-semibold">${currency} ${entry.per_person.toLocaleString()} avg / person (${entry.member_count} members)</div>
                    </div>
                    <button onclick="FoodView.openEditModalById(${entry.id})" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all" title="Edit Food Entry">
                      <i class="fa-regular fa-pen-to-square text-sm"></i>
                    </button>
                    <button onclick="FoodView.deleteEntry(${entry.id}, '${entry.title.replace(/'/g, "\\'")}')" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Entry">
                      <i class="fa-regular fa-trash-can text-sm"></i>
                    </button>
                  </div>
                </div>

                <!-- Participating Members Chips with Custom Flag -->
                <div class="pt-3">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Member Shares for this Week</p>
                    <span class="text-[11px] text-slate-400">${entry.members.length} members</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    ${entry.members.map(m => `
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${m.is_custom ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700'} border text-xs font-medium">
                        <i class="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                        <span>${m.member_name}</span>
                        <span class="font-mono ${m.is_custom ? 'text-amber-800' : 'text-slate-500'}">(${currency} ${Number(m.amount).toLocaleString()})</span>
                        ${m.is_custom ? '<span class="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">Mid-Week</span>' : ''}
                      </span>
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
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading food expenses: ${err.message}</div>`;
    }
  },

  // Month navigation helpers
  changeMonth(month) {
    if (!month) return;
    this.currentMonth = month;
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
                  <input type="number" id="foodPerHead" placeholder="e.g. 3000" min="0" step="any" oninput="FoodView.handlePerHeadInput()" class="w-full pl-10 pr-3 py-2 text-base font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-inner" />
                </div>
                <p class="text-[10px] text-amber-700 mt-1">E.g. Enter 3000 to apply to all selected members</p>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                  Total Mess Amount (Rs.) *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-xs font-bold text-amber-700">Rs.</span>
                  <input type="number" id="foodTotalAmount" placeholder="e.g. 30000" required min="1" step="any" oninput="FoodView.handleTotalAmountInput()" class="w-full pl-10 pr-3 py-2 text-base font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-inner" />
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

      const foodMap = {};
      for (const r of (consolidated.rows || [])) {
        foodMap[r.member.id] = r.food_balance;
      }

      const dueMembers = members.map(m => ({
        ...m,
        food_due: foodMap[m.id] || 0
      })).filter(m => m.food_due > 0);

      App.showModal(`
        <div class="space-y-4 max-w-lg mx-auto">
          <div class="flex items-center justify-between border-b pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-utensils"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-800">Send Food Mess Reminders</h3>
                <p class="text-xs text-slate-500">Notify members with outstanding weekly grocery dues</p>
              </div>
            </div>
            <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs px-1 mb-1.5">
              <span class="text-slate-500 font-semibold">Members with Unpaid Food Dues:</span>
              <span class="text-slate-400 font-mono">${dueMembers.length} members</span>
            </div>

            <div class="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl p-2 divide-y divide-slate-100 bg-slate-50">
              ${dueMembers.length > 0 ? dueMembers.map(m => `
                <label class="flex items-center justify-between p-2.5 rounded-xl hover:bg-white transition-all cursor-pointer">
                  <div class="flex items-center gap-3">
                    <input type="checkbox" name="foodReminderMember" value="${m.id}" ${m.email ? 'checked' : 'disabled'} class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                    <div>
                      <div class="font-bold text-slate-800 text-xs">${m.name} <span class="font-mono text-slate-400 text-[10px]">(${m.unique_id})</span></div>
                      <div class="text-[11px] text-slate-500">${m.email ? `<span class="text-slate-600">${m.email}</span>` : '<span class="text-rose-500 italic">No email saved (WhatsApp only)</span>'}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs font-black text-amber-700 font-mono">Rs. ${m.food_due.toLocaleString()}</div>
                    <div class="text-[10px] text-slate-400">Due</div>
                  </div>
                </label>
              `).join('') : `
                <div class="py-6 text-center text-xs text-slate-400">All members have cleared their food mess dues! 🎉</div>
              `}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <button type="button" onclick="FoodView.copyWhatsAppFoodBroadcast()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5">
              <i class="fa-brands fa-whatsapp text-sm"></i> Copy WhatsApp Message
            </button>

            <div class="flex items-center gap-2">
              <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onclick="FoodView.sendBatchFoodEmail()" ${dueMembers.length === 0 ? 'disabled' : ''} class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 disabled:opacity-50">
                <i class="fa-solid fa-paper-plane text-xs"></i> Email Reminder
              </button>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
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
  }
};
