// Member Self-Service Portal View - Clean, Step-by-Step Mobile Experience
const PortalView = {
  currentTab: 'overview', // 'overview', 'food', 'accounts', 'history'
  visiblePaymentsLimit: 6,

  async render() {
    const member = App.currentUser;
    if (!member || App.userType !== 'member') {
      return `<div class="p-8 text-center text-slate-500">Please sign in with your Unique Member ID to view your personal portal.</div>`;
    }

    try {
      const [data, settings] = await Promise.all([
        API.get(`/api/members/${member.id}`),
        API.get('/api/settings')
      ]);

      const m = data.member;
      const b = data.balance;
      const currency = settings.currency_symbol || 'Rs.';

      // Compute Total Combined Balance
      const totalCombinedDue = (b.bills_balance || 0) + (b.food_balance || 0);

      // Due Date computation for bills
      const currentMonth = new Date().toISOString().slice(0, 7);
      const dueDay = parseInt(settings.monthly_bills_due_day || '10', 10);
      const dueDate = `${currentMonth}-${String(dueDay).padStart(2, '0')}`;
      const todayStr = new Date().toISOString().slice(0, 10);
      const isOverdue = todayStr > dueDate && b.bills_balance > 0;

      return `
        <div class="space-y-4 max-w-2xl mx-auto pb-10">
          <!-- 1. Sleek Compact Member Profile Card -->
          <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 card-shadow">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                  ${m.name.charAt(0).toUpperCase()}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 class="text-base sm:text-lg font-black text-slate-900 truncate">${m.name}</h1>
                    <span class="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      ${m.unique_id}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">
                    <span>${m.room_name || 'Outside Member'}</span>
                    ${m.security_deposit > 0 ? ` &bull; <span class="text-emerald-700 font-semibold">Deposit: ${currency} ${m.security_deposit.toLocaleString()}</span>` : ''}
                  </p>
                </div>
              </div>

              <!-- Quick Statement / Logout Button -->
              <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="App.navigate('reports')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1" title="Official Statement">
                  <i class="fa-solid fa-file-invoice"></i> <span class="hidden sm:inline">Statement</span>
                </button>
              </div>
            </div>

            <!-- Net Outstanding Summary Pill -->
            <div class="pt-3 flex items-center justify-between">
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Pending Dues</span>
                <p class="text-2xl font-black mt-0.5 ${totalCombinedDue > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                  ${currency} ${totalCombinedDue.toLocaleString()}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'bills')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-money-bill-transfer"></i> Pay Bills
                </button>
                <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'food')" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-utensils"></i> Pay Food
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Step-by-Step Segmented Navigation Tabs -->
          <div class="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-center">
            <button onclick="PortalView.switchTab('overview')" class="py-2 rounded-xl text-xs font-bold transition-all ${this.currentTab === 'overview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              Summary
            </button>
            <button onclick="PortalView.switchTab('food')" class="py-2 rounded-xl text-xs font-bold transition-all ${this.currentTab === 'food' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              Food Mess
            </button>
            <button onclick="PortalView.switchTab('accounts')" class="py-2 rounded-xl text-xs font-bold transition-all ${this.currentTab === 'accounts' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              Accounts
            </button>
            <button onclick="PortalView.switchTab('history')" class="py-2 rounded-xl text-xs font-bold transition-all ${this.currentTab === 'history' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              Receipts
            </button>
          </div>

          <!-- 3. Tab Content Panels -->
          <div id="portal-tab-content">
            ${this.renderActiveTab(data, settings, currency, isOverdue, dueDate)}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">Error loading your portal: ${err.message}</div>`;
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    App.refresh();
  },

  renderActiveTab(data, settings, currency, isOverdue, dueDate) {
    const m = data.member;
    const b = data.balance;

    switch (this.currentTab) {
      case 'overview':
        return this.renderOverviewTab(m, b, currency, isOverdue, dueDate);
      case 'food':
        return this.renderFoodTab(m, b, data.food, currency);
      case 'accounts':
        return this.renderAccountsTab(m, settings);
      case 'history':
        return this.renderHistoryTab(data.payments, currency);
      default:
        return this.renderOverviewTab(m, b, currency, isOverdue, dueDate);
    }
  },

  // TAB 1: SUMMARY & DUES OVERVIEW
  renderOverviewTab(m, b, currency, isOverdue, dueDate) {
    return `
      <div class="space-y-3.5">
        <!-- Monthly Flat Bills Card -->
        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 card-shadow">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-building"></i>
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Monthly Flat Bills & Rent</h3>
                <p class="text-[10px] text-slate-400">Rent, Wifi, Cook, Power</p>
              </div>
            </div>

            ${b.bills_balance <= 0 ? `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Cleared
              </span>
            ` : (isOverdue ? `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                Overdue (${dueDate})
              </span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Due: ${dueDate}
              </span>
            `)}
          </div>

          <div class="py-3 flex items-center justify-between">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400">Bills Net Due</span>
              <p class="text-2xl font-black mt-0.5 ${b.bills_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                ${currency} ${b.bills_balance.toLocaleString()}
              </p>
            </div>
            <div class="text-right text-xs text-slate-500 space-y-0.5">
              <div>Assigned: <strong class="text-slate-800">${currency} ${b.bills_total.toLocaleString()}</strong></div>
              <div>Paid: <strong class="text-emerald-600">${currency} ${b.bills_payments_total.toLocaleString()}</strong></div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
            <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'bills')" class="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plus-circle"></i> Submit Bills Payment
            </button>
            <button onclick="App.navigate('reports')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all" title="View Full Ledger">
              <i class="fa-solid fa-list-check"></i>
            </button>
          </div>
        </div>

        <!-- Weekly Food Mess Card -->
        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 card-shadow">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-utensils"></i>
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Weekly Food Mess</h3>
                <p class="text-[10px] text-slate-400">Grocery mess & vegetables</p>
              </div>
            </div>

            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Settled Weekly
            </span>
          </div>

          <div class="py-3 flex items-center justify-between">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400">Food Mess Balance</span>
              <p class="text-2xl font-black mt-0.5 ${b.food_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}">
                ${currency} ${b.food_balance.toLocaleString()}
              </p>
            </div>
            <div class="text-right text-xs text-slate-500 space-y-0.5">
              <div>Mess Shares: <strong class="text-slate-800">${currency} ${b.food_total.toLocaleString()}</strong></div>
              <div>Mess Paid: <strong class="text-emerald-600">${currency} ${b.food_payments_total.toLocaleString()}</strong></div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
            <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'food')" class="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plus-circle"></i> Submit Food Payment
            </button>
            <button onclick="PortalView.switchTab('food')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all" title="View Mess Food Details">
              <i class="fa-solid fa-basket-shopping"></i>
            </button>
          </div>
        </div>

        <!-- 1-Tap Statement Link Card -->
        <div class="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white flex items-center justify-between shadow-sm">
          <div>
            <h4 class="text-xs font-bold">Official Invoice & PDF Ledger</h4>
            <p class="text-[10px] text-slate-300">Download or print full itemized statement</p>
          </div>
          <button onclick="App.navigate('reports')" class="px-3.5 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1.5">
            <i class="fa-solid fa-file-pdf text-rose-600"></i> View Statement
          </button>
        </div>
      </div>
    `;
  },

  // TAB 2: WEEKLY FOOD MESS BREAKDOWN
  renderFoodTab(m, b, foodEntries = [], currency) {
    return `
      <div class="space-y-3.5">
        <!-- Top Food Card -->
        <div class="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-amber-800">Your Current Food Balance</span>
            <p class="text-2xl font-black text-amber-700 mt-0.5">${currency} ${b.food_balance.toLocaleString()}</p>
            <p class="text-[11px] text-amber-800/80 mt-0.5">Total Mess Paid: ${currency} ${b.food_payments_total.toLocaleString()}</p>
          </div>
          <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'food')" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-plus-circle"></i> Pay Food
          </button>
        </div>

        <!-- Itemized Food Grocery List -->
        <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
          <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Itemized Grocery Splits</h3>
            <span class="text-[11px] text-slate-400">${foodEntries.length} recorded entries</span>
          </div>

          <div class="divide-y divide-slate-100">
            ${foodEntries.length > 0 ? foodEntries.map(f => `
              <div class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 class="text-xs font-bold text-slate-800">${f.title || 'Weekly Mess Food'}</h4>
                  <p class="text-[10px] text-slate-400 mt-0.5">Date: <span class="font-mono">${f.date || f.month}</span></p>
                </div>
                <div class="text-right">
                  <span class="text-xs font-black text-amber-700">${currency} ${Number(f.amount || 0).toLocaleString()}</span>
                  <span class="block text-[9px] text-slate-400">your share</span>
                </div>
              </div>
            `).join('') : `
              <div class="p-8 text-center text-xs text-slate-400">
                No weekly food expenses recorded yet.
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  // TAB 3: OFFICIAL PAYMENT ACCOUNTS (1-TAP COPY)
  renderAccountsTab(m, settings) {
    const bankName = settings.bank_name || 'Meezan Bank';
    const accTitle = settings.account_title || 'Flat Manager Account';
    const accNumber = settings.account_number || '0101-0105892341';
    const iban = settings.iban || '';
    const jazzcash = settings.jazzcash_number || '0300-1234567';
    const easypaisa = settings.easypaisa_number || '0345-1234567';

    return `
      <div class="space-y-3">
        <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-info text-indigo-600"></i>
            <span>Tap <strong>Copy</strong> to quickly paste in your banking app</span>
          </div>
        </div>

        <!-- 1. Bank Account Card -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 card-shadow space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-building-columns"></i>
              </div>
              <div>
                <span class="text-[10px] uppercase font-bold text-blue-600">${bankName}</span>
                <h4 class="text-xs font-bold text-slate-900">${accTitle}</h4>
              </div>
            </div>
            <button onclick="PortalView.copyToClipboard('${accNumber}', 'Account Number')" class="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold rounded-lg border border-slate-200 transition-all flex items-center gap-1">
              <i class="fa-regular fa-copy"></i> Copy
            </button>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-xl font-mono text-xs text-slate-800 font-bold select-all flex items-center justify-between">
            <span>A/C: ${accNumber}</span>
          </div>
          ${iban ? `
            <div class="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-xl font-mono text-slate-600">
              <span class="truncate">IBAN: ${iban}</span>
              <button onclick="PortalView.copyToClipboard('${iban}', 'IBAN')" class="text-indigo-600 hover:text-indigo-800 font-bold ml-2 shrink-0">
                <i class="fa-regular fa-copy"></i> Copy IBAN
              </button>
            </div>
          ` : ''}
        </div>

        <!-- 2. JazzCash Card -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 card-shadow flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-sm">
              JC
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-amber-600">JazzCash</span>
              <h4 class="text-xs font-bold text-slate-900">${settings.jazzcash_title || 'Flat Manager'}</h4>
              <p class="font-mono text-xs font-bold text-slate-800 mt-0.5">${jazzcash}</p>
            </div>
          </div>
          <button onclick="PortalView.copyToClipboard('${jazzcash.replace(/-/g, '')}', 'JazzCash Number')" class="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>

        <!-- 3. EasyPaisa Card -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 card-shadow flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
              EP
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-emerald-600">Easypaisa</span>
              <h4 class="text-xs font-bold text-slate-900">${settings.easypaisa_title || 'Flat Manager'}</h4>
              <p class="font-mono text-xs font-bold text-slate-800 mt-0.5">${easypaisa}</p>
            </div>
          </div>
          <button onclick="PortalView.copyToClipboard('${easypaisa.replace(/-/g, '')}', 'Easypaisa Number')" class="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>

        <!-- Direct Submit Payment Button -->
        <div class="pt-2">
          <button onclick="PortalView.openSubmitPaymentModal(${m.id})" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2">
            <i class="fa-solid fa-circle-check"></i> Already Paid? Submit Payment Proof Here
          </button>
        </div>
      </div>
    `;
  },

  // TAB 4: MY PAYMENT RECEIPTS & STATUS
  renderHistoryTab(payments = [], currency) {
    return `
      <div class="space-y-3">
        <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
          <div class="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Submissions</h3>
              <p class="text-[10px] text-slate-400">Live admin verification and credit status</p>
            </div>
            <span class="text-[11px] font-bold text-slate-500">${payments.length} claims</span>
          </div>

          <div class="divide-y divide-slate-100">
            ${payments.slice(0, this.visiblePaymentsLimit || 6).length > 0 ? payments.slice(0, this.visiblePaymentsLimit || 6).map(p => `
              <div class="p-3.5 hover:bg-slate-50 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-slate-900">${currency} ${p.amount.toLocaleString()}</span>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.payment_for === 'food' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
                      ${p.payment_for === 'food' ? 'Food' : 'Bills'}
                    </span>
                  </div>

                  ${p.status === 'approved' ? `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <i class="fa-solid fa-circle-check"></i> Approved
                    </span>
                  ` : (p.status === 'pending' ? `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                      <i class="fa-solid fa-clock"></i> Pending Review
                    </span>
                  ` : `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <i class="fa-solid fa-circle-xmark"></i> Rejected
                    </span>
                  `)}
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>${p.payment_date} via <strong class="text-slate-600 uppercase">${p.payment_method.replace('_', ' ')}</strong></span>
                  ${p.reference_no ? `<span class="font-mono text-slate-600 font-semibold">Ref: ${p.reference_no}</span>` : ''}
                </div>

                ${p.admin_comment ? `
                  <div class="mt-2 text-[11px] p-2 rounded-xl ${p.status === 'rejected' ? 'bg-rose-50 text-rose-800 border border-rose-100 font-semibold' : 'bg-slate-50 text-slate-600 border border-slate-100'}">
                    <strong>Admin Note:</strong> "${p.admin_comment}"
                  </div>
                ` : ''}
              </div>
            `).join('') : `
              <div class="p-8 text-center text-xs text-slate-400">
                You haven't submitted any payment claims yet.
              </div>
            `}
          </div>

          ${payments.length > 6 ? `
            <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-500 font-medium">Showing ${Math.min(this.visiblePaymentsLimit || 6, payments.length)} of ${payments.length}</span>
              ${(this.visiblePaymentsLimit || 6) < payments.length ? `
                <button onclick="PortalView.showMorePayments()" class="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg text-xs">
                  Show More
                </button>
              ` : `
                <button onclick="PortalView.showLessPayments()" class="px-3 py-1 bg-white border text-slate-600 font-bold rounded-lg text-xs">
                  Show Less
                </button>
              `}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  copyToClipboard(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        App.toast(`Copied ${label} to clipboard!`, 'success');
      }).catch(() => {
        this.fallbackCopy(text, label);
      });
    } else {
      this.fallbackCopy(text, label);
    }
  },

  fallbackCopy(text, label) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    App.toast(`Copied ${label} to clipboard!`, 'success');
  },

  showMorePayments() {
    this.visiblePaymentsLimit = (this.visiblePaymentsLimit || 6) + 6;
    App.refresh();
  },

  showLessPayments() {
    this.visiblePaymentsLimit = 6;
    App.refresh();
  },

  openSubmitPaymentModal(memberId, defaultFor = 'bills') {
    const today = new Date().toISOString().slice(0, 10);
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-base font-black text-slate-900">Submit Payment Claim</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 text-sm"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="PortalView.submitPaymentClaim(event, ${memberId})" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">What is this payment for? *</label>
            <select id="claimFor" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
              <option value="bills" ${defaultFor === 'bills' ? 'selected' : ''}>🏢 Monthly Bills / Flat Rent (Month-end)</option>
              <option value="food" ${defaultFor === 'food' ? 'selected' : ''}>🍲 Weekly Food Mess (Paid this week)</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount (Rs.) *</label>
              <input type="number" id="claimAmount" required min="1" step="any" placeholder="e.g. 5000" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Date *</label>
              <input type="date" id="claimDate" value="${today}" required class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method *</label>
              <select id="claimMethod" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="cash">Cash to Manager</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Your Bank / App</label>
              <input type="text" id="claimBank" placeholder="e.g. Meezan, JazzCash" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction Ref # (TID)</label>
            <input type="text" id="claimRef" placeholder="e.g. TID-982341 or 'Handed cash'" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm">Submit Claim</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitPaymentClaim(e, memberId) {
    e.preventDefault();
    const payment_for = document.getElementById('claimFor').value;
    const amount = document.getElementById('claimAmount').value;
    const payment_date = document.getElementById('claimDate').value;
    const payment_method = document.getElementById('claimMethod').value;
    const bank_name = document.getElementById('claimBank').value;
    const reference_no = document.getElementById('claimRef').value;

    try {
      const res = await API.post('/api/payments/submit', {
        member_id: memberId,
        payment_for,
        amount,
        payment_date,
        payment_method,
        bank_name,
        reference_no
      });
      App.toast(res.message, 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
