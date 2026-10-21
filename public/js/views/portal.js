// Member Self-Service Portal View
const PortalView = {
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

      // Compute Due Date & Status for Month-End Bills
      const currentMonth = new Date().toISOString().slice(0, 7);
      const dueDay = parseInt(settings.monthly_bills_due_day || '10', 10);
      const dueDate = `${currentMonth}-${String(dueDay).padStart(2, '0')}`;
      const todayStr = new Date().toISOString().slice(0, 10);

      let dueStatusBadge = '';
      if (b.bills_balance <= 0) {
        dueStatusBadge = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <i class="fa-solid fa-circle-check text-emerald-600"></i> Monthly Bills Cleared
          </span>
        `;
      } else if (b.bills_payments_total > 0 && b.bills_balance > 0) {
        dueStatusBadge = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <i class="fa-solid fa-clock-rotate-left text-amber-600"></i> Partial Payment (Rs. ${b.bills_balance.toLocaleString()} remaining)
          </span>
        `;
      } else if (todayStr > dueDate) {
        dueStatusBadge = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <i class="fa-solid fa-triangle-exclamation text-rose-600"></i> Overdue (Due was ${dueDate})
          </span>
        `;
      } else {
        dueStatusBadge = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <i class="fa-solid fa-calendar-day text-sky-600"></i> Due by ${dueDate}
          </span>
        `;
      }

      return `
        <div class="space-y-5 max-w-4xl mx-auto pb-10">
          <!-- Clean Member Profile Banner (Compact & Mobile-friendly) -->
          <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 card-shadow">
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                  ${m.name.charAt(0)}
                </div>
                <div>
                  <h1 class="text-lg sm:text-xl font-black text-slate-900">${m.name}</h1>
                  <p class="text-xs text-slate-500">
                    <span class="font-mono text-indigo-600 font-bold">${m.unique_id}</span> &bull; 
                    <span>${m.room_name || 'Outside Member'}</span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1.5">
                ${m.security_deposit > 0 ? `
                  <span class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Deposit: ${currency} ${m.security_deposit.toLocaleString()}
                  </span>
                ` : ''}
                <button onclick="App.navigate('reports')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-file-invoice"></i> Statement
                </button>
                <button onclick="App.logout()" title="Sign Out" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                  <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                </button>
              </div>
            </div>

            <!-- 2 Compact Primary Action Buttons -->
            <div class="grid grid-cols-2 gap-2 pt-3">
              <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'bills')" class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-money-bill-transfer"></i> Pay Bills
              </button>
              <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'food')" class="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-utensils"></i> Pay Food
              </button>
            </div>
          </div>

          <!-- TWO SEPARATE BALANCE CARDS (Bills vs Food) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- 1. MONTHLY FLAT BILLS & RENT LEDGER -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                      <i class="fa-solid fa-building"></i>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-800 text-sm">Monthly Flat Bills & Rent</h3>
                      <p class="text-[10px] text-slate-400">Rent, Wifi, Cook, Electricity</p>
                    </div>
                  </div>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                    Month-End Dues
                  </span>
                </div>

                <div class="mt-4">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Bills Due</span>
                    ${dueStatusBadge}
                  </div>
                  <p class="text-3xl font-black mt-1.5 ${b.bills_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                    ${currency} ${b.bills_balance.toLocaleString()}
                  </p>
                  <p class="text-xs text-slate-500 mt-1">
                    ${b.bills_balance > 0 ? 'Please pay as soon as possible before due date' : 'All monthly flat bills cleared!'}
                  </p>
                </div>

                <div class="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Total Bills Assigned:</span>
                    <span class="font-bold text-slate-800">${currency} ${b.bills_total.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Approved Payments:</span>
                    <span class="font-bold text-emerald-600">${currency} ${b.bills_payments_total.toLocaleString()}</span>
                  </div>
                  ${b.bills_pending_total > 0 ? `
                    <div class="flex justify-between text-amber-700 font-semibold pt-1 border-t border-slate-200">
                      <span>Pending Admin Verification:</span>
                      <span>${currency} ${b.bills_pending_total.toLocaleString()}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="pt-4 mt-2">
                <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'bills')" class="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all">
                  + Submit Monthly Bills Payment
                </button>
              </div>
            </div>

            <!-- 2. WEEKLY FOOD MESS LEDGER (SEPARATE WEEK-TO-WEEK) -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                      <i class="fa-solid fa-utensils"></i>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-800 text-sm">Weekly Food Mess</h3>
                      <p class="text-[10px] text-slate-400">Week-to-week grocery mess</p>
                    </div>
                  </div>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 uppercase">
                    Paid Weekly
                  </span>
                </div>

                <div class="mt-4">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Food Mess Balance</span>
                    <span class="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Settled Weekly
                    </span>
                  </div>
                  <p class="text-3xl font-black mt-1.5 ${b.food_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}">
                    ${currency} ${b.food_balance.toLocaleString()}
                  </p>
                  <p class="text-xs text-slate-500 mt-1">
                    ${b.food_balance > 0 ? 'Due for this week’s mess grocery' : (b.food_balance < 0 ? '<span class="text-emerald-600 font-bold">Advance Credit for Next Week!</span>' : 'All food dues cleared')}
                  </p>
                </div>

                <div class="mt-4 p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-2 text-xs">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Total Food Shares:</span>
                    <span class="font-bold text-slate-800">${currency} ${b.food_total.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Total Food Paid:</span>
                    <span class="font-bold text-emerald-600">${currency} ${b.food_payments_total.toLocaleString()}</span>
                  </div>
                  ${b.food_pending_total > 0 ? `
                    <div class="flex justify-between text-amber-800 font-semibold pt-1 border-t border-amber-200">
                      <span>Pending Food Verification:</span>
                      <span>${currency} ${b.food_pending_total.toLocaleString()}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="pt-4 mt-2">
                <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'food')" class="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-all">
                  + Submit Weekly Food Payment
                </button>
              </div>
            </div>
          </div>

          <!-- Official Payment Accounts -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-6 space-y-3">
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-wallet text-indigo-600"></i> Official Payment Accounts
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] uppercase font-bold text-indigo-600">${settings.bank_name || 'Bank'}</span>
                <p class="text-xs font-bold text-slate-800 mt-1">${settings.account_title || 'Flat Account'}</p>
                <p class="font-mono text-xs text-slate-600 font-bold">${settings.account_number || '-'}</p>
                ${settings.iban ? `<p class="font-mono text-[10px] text-slate-400">IBAN: ${settings.iban}</p>` : ''}
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] uppercase font-bold text-amber-600">JazzCash</span>
                <p class="text-xs font-bold text-slate-800 mt-1">${settings.jazzcash_title || 'Flat Manager'}</p>
                <p class="font-mono text-sm font-bold text-slate-800">${settings.jazzcash_number || '-'}</p>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] uppercase font-bold text-emerald-600">Easypaisa</span>
                <p class="text-xs font-bold text-slate-800 mt-1">${settings.easypaisa_title || 'Flat Manager'}</p>
                <p class="font-mono text-sm font-bold text-slate-800">${settings.easypaisa_number || '-'}</p>
              </div>
            </div>
          </div>

          <!-- Member Payment Submissions & Status -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-800">Your Payment Submissions & Approval Status</h3>
                <p class="text-xs text-slate-500">Payments are confirmed by admin and immediately reflected here</p>
              </div>
            </div>

            <div class="divide-y divide-slate-100">
              ${(data.payments || []).slice(0, this.visiblePaymentsLimit || 6).length > 0 ? (data.payments || []).slice(0, this.visiblePaymentsLimit || 6).map(p => `
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm font-bold text-slate-800">${currency} ${p.amount.toLocaleString()}</span>
                      
                      <!-- Tag: Bills vs Food -->
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${p.payment_for === 'food' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
                        ${p.payment_for === 'food' ? 'Food Mess' : 'Monthly Bills'}
                      </span>

                      <!-- Status Badge -->
                      ${p.status === 'approved' ? `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i class="fa-solid fa-circle-check"></i> Approved & Credited
                        </span>
                      ` : (p.status === 'pending' ? `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <i class="fa-solid fa-clock"></i> Pending Verification
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <i class="fa-solid fa-circle-xmark"></i> Rejected
                        </span>
                      `)}
                    </div>

                    <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Date: <strong>${p.payment_date}</strong></span>
                      <span class="uppercase font-semibold text-slate-700">Method: ${p.payment_method.replace('_', ' ')}</span>
                      ${p.bank_name ? `<span>Bank/Wallet: ${p.bank_name}</span>` : ''}
                      ${p.reference_no ? `<span class="font-mono">Ref: ${p.reference_no}</span>` : ''}
                    </div>

                    ${p.admin_comment ? `
                      <div class="mt-2 text-xs p-2 rounded-lg ${p.status === 'rejected' ? 'bg-rose-50 text-rose-800 border border-rose-100 font-semibold' : 'bg-slate-50 text-slate-600 border border-slate-100'}">
                        <strong>Admin Note:</strong> "${p.admin_comment}"
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('') : `
                <div class="p-8 text-center text-xs text-slate-400">
                  You haven't submitted any payment claims yet.
                </div>
              `}
            </div>

            <!-- Portal Payments Pagination / Show More -->
            ${data.payments && data.payments.length > 6 ? `
              <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span class="text-slate-500 font-medium">Showing ${Math.min(this.visiblePaymentsLimit || 6, data.payments.length)} of ${data.payments.length} submissions</span>
                <div class="flex items-center gap-2">
                  ${(this.visiblePaymentsLimit || 6) < data.payments.length ? `
                    <button onclick="PortalView.showMorePayments()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                      <i class="fa-solid fa-chevron-down text-xs"></i> Show More (+6)
                    </button>
                    <button onclick="PortalView.showAllPayments()" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl transition-all">
                      Show All
                    </button>
                  ` : ''}
                  ${(this.visiblePaymentsLimit || 6) > 6 ? `
                    <button onclick="PortalView.showLessPayments()" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl transition-all">
                      Show Less (6)
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading your portal: ${err.message}</div>`;
    }
  },

  showMorePayments() {
    this.visiblePaymentsLimit = (this.visiblePaymentsLimit || 6) + 6;
    App.refresh();
  },

  showAllPayments() {
    this.visiblePaymentsLimit = 9999;
    App.refresh();
  },

  showLessPayments() {
    this.visiblePaymentsLimit = 6;
    App.refresh();
  },

  // Modal for Download My Full Statement (PDF / Ledger)
  async openFullStatementModal(memberId) {
    try {
      const data = await API.get(`/api/reports/member-full-statement/${memberId}`);
      const m = data.member;
      const s = data.summary;
      const currency = data.settings?.currency_symbol || 'Rs.';

      App.showModal(`
        <div class="space-y-4 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <h3 class="text-lg font-black text-slate-800">My Complete Statement (PDF / Ledger)</h3>
              <p class="text-xs text-slate-500">${m.name} (${m.unique_id}) &bull; ${m.room_name || 'Outside Member'}</p>
            </div>
            <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Overall Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[10px] text-slate-400 font-bold block">Total Bills Charged</span>
              <span class="font-black text-slate-800 text-sm">${currency} ${s.total_bills.toLocaleString()}</span>
            </div>
            <div class="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span class="text-[10px] text-emerald-700 font-bold block">Total Bills Paid</span>
              <span class="font-black text-emerald-800 text-sm">${currency} ${s.total_paid_bills.toLocaleString()}</span>
            </div>
            <div class="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <span class="text-[10px] text-amber-700 font-bold block">Total Food Paid</span>
              <span class="font-black text-amber-800 text-sm">${currency} ${s.total_paid_food.toLocaleString()}</span>
            </div>
            <div class="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
              <span class="text-[10px] text-rose-700 font-bold block">Net Outstanding</span>
              <span class="font-black text-rose-900 text-sm">${currency} ${s.net_outstanding.toLocaleString()}</span>
            </div>
          </div>

          <!-- Chronological Statement Table -->
          <div>
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Itemized Bills History</h4>
            <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-xl text-xs divide-y divide-slate-100">
              ${data.bills.length > 0 ? data.bills.map(b => `
                <div class="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                  <div>
                    <span class="font-bold text-slate-800">${b.title}</span>
                    <span class="text-[10px] text-slate-400 font-mono ml-1">(${b.month})</span>
                  </div>
                  <span class="font-bold text-slate-800">${currency} ${b.amount.toLocaleString()}</span>
                </div>
              `).join('') : '<div class="p-4 text-center text-slate-400">No bills found in this period.</div>'}
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Payment Receipts</h4>
            <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-xl text-xs divide-y divide-slate-100">
              ${data.payments.length > 0 ? data.payments.map(p => `
                <div class="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                  <div>
                    <span class="font-bold text-emerald-700">${currency} ${p.amount.toLocaleString()}</span>
                    <span class="text-[10px] text-slate-500 uppercase ml-1">via ${p.payment_method} (${p.payment_for})</span>
                    <div class="text-[10px] text-slate-400">${p.payment_date} ${p.reference_no ? `&bull; Ref: ${p.reference_no}` : ''}</div>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    APPROVED
                  </span>
                </div>
              `).join('') : '<div class="p-4 text-center text-slate-400">No payment receipts found.</div>'}
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t">
            <button type="button" onclick="window.print()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-print"></i> Print / Save PDF
            </button>
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openSubmitPaymentModal(memberId, defaultFor = 'bills') {
    const today = new Date().toISOString().slice(0, 10);
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Submit Payment Claim for Approval</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="PortalView.submitPaymentClaim(event, ${memberId})" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">What is this payment for? *</label>
            <select id="claimFor" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
              <option value="bills" ${defaultFor === 'bills' ? 'selected' : ''}>🏢 Monthly Bills / Flat Rent (Month-end)</option>
              <option value="food" ${defaultFor === 'food' ? 'selected' : ''}>🍲 Weekly Food Mess (Paid this week)</option>
            </select>
            <p class="text-[11px] text-slate-400 mt-1">Food expenses are kept separate from rent and counted week-to-week.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount Paid (Rs.) *</label>
              <input type="number" id="claimAmount" required min="1" step="any" placeholder="e.g. 5000" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Date *</label>
              <input type="date" id="claimDate" value="${today}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method *</label>
              <select id="claimMethod" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="bank_transfer">Bank Online Transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="cash">Cash (Given to Manager)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Your Bank / Wallet Name</label>
              <input type="text" id="claimBank" placeholder="e.g. Meezan, HBL, JazzCash App" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction Ref # / Receipt Note</label>
            <input type="text" id="claimRef" placeholder="e.g. TID-982341 or 'Handed cash to manager'" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Submit for Approval</button>
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
