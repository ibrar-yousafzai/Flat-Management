// Payments & Approvals View
const PaymentsView = {
  activeTab: 'pending', // 'pending' or 'all'
  filterFor: 'all', // 'all', 'bills', 'food'
  visibleLimit: 6,

  async render() {
    try {
      const [paymentsData, members, settings] = await Promise.all([
        API.get(`/api/payments?status=all${this.filterFor !== 'all' ? `&payment_for=${this.filterFor}` : ''}`),
        API.get('/api/members?status=Active'),
        API.get('/api/settings')
      ]);

      const currency = settings.currency_symbol || 'Rs.';
      const allPayments = paymentsData.payments || [];
      const pendingList = allPayments.filter(p => p.status === 'pending');
      const visiblePayments = allPayments.slice(0, this.visibleLimit || 6);
      const visiblePending = pendingList.slice(0, this.visibleLimit || 6);

      return `
        <div class="space-y-6">
          <!-- Header -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Payments & Verification Approvals</h1>
              <p class="text-sm text-slate-500 mt-0.5">Separate verification for Monthly Flat Bills vs Weekly Food Mess payments</p>
            </div>
            
            <button onclick="PaymentsView.openRecordPaymentModal(${JSON.stringify(members).replace(/"/g, '&quot;')})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-plus-circle"></i> Direct Record Payment
            </button>
          </div>

          <!-- Filter Toolbar: Bills vs Food and Pending vs All -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 card-shadow">
            <!-- Tabs -->
            <div class="flex items-center gap-2">
              <button onclick="PaymentsView.switchTab('pending')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${this.activeTab === 'pending' ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>Pending Approvals</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-white text-amber-700 font-extrabold">${pendingList.length}</span>
              </button>
              <button onclick="PaymentsView.switchTab('all')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${this.activeTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                <i class="fa-solid fa-list-check"></i>
                <span>All Payments (${allPayments.length})</span>
              </button>
            </div>

            <!-- Ledger Filter (All / Bills / Food) -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button onclick="PaymentsView.setFilterFor('all')" class="px-3 py-1.5 rounded-lg transition-all ${this.filterFor === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                All
              </button>
              <button onclick="PaymentsView.setFilterFor('bills')" class="px-3 py-1.5 rounded-lg transition-all ${this.filterFor === 'bills' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                🏢 Monthly Bills
              </button>
              <button onclick="PaymentsView.setFilterFor('food')" class="px-3 py-1.5 rounded-lg transition-all ${this.filterFor === 'food' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                🍲 Weekly Food Mess
              </button>
            </div>
          </div>

          <!-- PENDING APPROVALS QUEUE -->
          ${this.activeTab === 'pending' ? `
            <div class="space-y-4">
              ${visiblePending.length > 0 ? visiblePending.map(p => `
                <div class="bg-white rounded-2xl border-2 ${p.payment_for === 'food' ? 'border-amber-300' : 'border-indigo-300'} card-shadow p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-mono ${p.payment_for === 'food' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'}">
                        ${p.payment_for === 'food' ? '🍲 Weekly Food' : '🏢 Monthly Bills'}
                      </span>
                      <h3 class="font-bold text-slate-800 text-base">${p.member_name}</h3>
                      <span class="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">${p.unique_id}</span>
                    </div>

                    <div class="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                      <span>Paid Date: <strong>${p.payment_date}</strong></span>
                      <span class="uppercase">Method: <strong>${p.payment_method.replace('_', ' ')}</strong></span>
                      ${p.bank_name ? `<span>Bank/Wallet: <strong>${p.bank_name}</strong></span>` : ''}
                      ${p.reference_no ? `<span class="font-mono">Ref: <strong>${p.reference_no}</strong></span>` : ''}
                    </div>

                    ${p.note ? `<p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2 italic">"${p.note}"</p>` : ''}
                  </div>

                  <!-- Amount & Action Buttons -->
                  <div class="flex items-center gap-3 shrink-0">
                    <div class="text-right mr-2">
                      <div class="text-2xl font-extrabold ${p.payment_for === 'food' ? 'text-amber-800' : 'text-emerald-700'}">${currency} ${p.amount.toLocaleString()}</div>
                      <span class="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">Awaiting Verification</span>
                    </div>

                    <!-- Approve Button -->
                    <button onclick="PaymentsView.openApproveModal(${p.id}, '${p.member_name}', ${p.amount}, '${p.payment_for}')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5">
                      <i class="fa-solid fa-check"></i> Approve
                    </button>

                    <!-- Reject Button -->
                    <button onclick="PaymentsView.openRejectModal(${p.id}, '${p.member_name}', ${p.amount})" class="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5">
                      <i class="fa-solid fa-xmark"></i> Reject
                    </button>
                  </div>
                </div>
              `).join('') : `
                <div class="bg-white p-12 text-center rounded-2xl border border-slate-200 card-shadow">
                  <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    <i class="fa-solid fa-circle-check"></i>
                  </div>
                  <h4 class="font-bold text-slate-800 text-sm">No pending payments for this category</h4>
                  <p class="text-xs text-slate-400 mt-1">All member submitted payment claims are currently verified.</p>
                </div>
              `}

              ${pendingList.length > 6 ? `
                <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span class="text-slate-500 font-medium">Showing ${Math.min(this.visibleLimit || 6, pendingList.length)} of ${pendingList.length} pending requests</span>
                  <div class="flex items-center gap-2">
                    ${(this.visibleLimit || 6) < pendingList.length ? `
                      <button onclick="PaymentsView.showMore()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-chevron-down text-xs"></i> Show More Pending (+6)
                      </button>
                    ` : ''}
                    ${(this.visibleLimit || 6) > 6 ? `
                      <button onclick="PaymentsView.showLess()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl transition-all">
                        Show Less
                      </button>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : `
            <!-- ALL PAYMENTS TABLE -->
            <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                  <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th class="py-3 px-4">Date & Status</th>
                      <th class="py-3 px-4">Member</th>
                      <th class="py-3 px-4">Payment For</th>
                      <th class="py-3 px-4">Method & Bank</th>
                      <th class="py-3 px-4">Admin Comment</th>
                      <th class="py-3 px-4 text-right">Amount</th>
                      <th class="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${visiblePayments.length > 0 ? visiblePayments.map(p => `
                      <tr class="table-row-hover">
                        <td class="py-3 px-4">
                          <div class="font-semibold text-slate-800">${p.payment_date}</div>
                          <span class="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            (p.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200')
                          }">
                            ${p.status.toUpperCase()}
                          </span>
                        </td>
                        <td class="py-3 px-4">
                          <div class="font-bold text-slate-800">${p.member_name}</div>
                          <div class="text-[10px] font-mono text-indigo-600">${p.unique_id}</div>
                        </td>
                        <td class="py-3 px-4">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.payment_for === 'food' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
                            ${p.payment_for === 'food' ? 'Food Mess' : 'Monthly Bills'}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-[11px]">
                          <div class="uppercase font-semibold text-slate-700">${p.payment_method.replace('_', ' ')}</div>
                          <div class="text-slate-400 text-[10px]">${p.bank_name || '-'} ${p.reference_no ? `(Ref: ${p.reference_no})` : ''}</div>
                        </td>
                        <td class="py-3 px-4 text-[11px] text-slate-500 italic">
                          ${p.admin_comment || (p.note ? `"${p.note}"` : '-')}
                        </td>
                        <td class="py-3 px-4 text-right font-extrabold text-sm ${p.status === 'approved' ? 'text-emerald-700' : 'text-slate-500'}">
                          ${currency} ${p.amount.toLocaleString()}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <div class="flex items-center justify-center gap-1">
                            <button onclick="PaymentsView.openEditPaymentModal(${JSON.stringify(p).replace(/"/g, '&quot;')})" class="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all" title="Edit payment details">
                              <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button onclick="PaymentsView.deletePayment(${p.id})" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all" title="Delete record">
                              <i class="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td colspan="7" class="py-8 text-center text-slate-400">No payment records found.</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>

              <!-- All Payments Pagination / Show More Toolbar -->
              ${allPayments.length > 6 ? `
                <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div class="text-slate-500 font-medium text-center sm:text-left">
                    Showing <span class="font-bold text-slate-800">${Math.min(this.visibleLimit || 6, allPayments.length)}</span> of <span class="font-bold text-slate-800">${allPayments.length}</span> payments
                  </div>
                  <div class="flex items-center gap-2">
                    ${(this.visibleLimit || 6) < allPayments.length ? `
                      <button onclick="PaymentsView.showMore()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-chevron-down text-xs"></i> Show More (+6)
                      </button>
                      <button onclick="PaymentsView.showAll()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl transition-all">
                        Show All (${allPayments.length})
                      </button>
                    ` : ''}
                    ${(this.visibleLimit || 6) > 6 ? `
                      <button onclick="PaymentsView.showLess()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl transition-all flex items-center gap-1">
                        <i class="fa-solid fa-chevron-up text-xs"></i> Show Less (6)
                      </button>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          `}
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading payments: ${err.message}</div>`;
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

  switchTab(tab) {
    this.activeTab = tab;
    this.visibleLimit = 6;
    App.refresh();
  },

  setFilterFor(forType) {
    this.filterFor = forType;
    this.visibleLimit = 6;
    App.refresh();
  },

  openApproveModal(id, memberName, amount, payment_for) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Verification & Approval Checkpoint</h3>
              <p class="text-[11px] text-slate-400">Strict member allocation check</p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Crediting Member:</span>
            <span class="font-extrabold text-slate-900 text-sm">${memberName}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Claimed Amount:</span>
            <span class="font-black text-emerald-700 text-base">Rs. ${amount.toLocaleString()}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Target Category:</span>
            <span class="font-bold px-2 py-0.5 rounded uppercase ${payment_for === 'food' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">
              ${payment_for === 'food' ? 'Weekly Food Mess' : 'Monthly Bills / Rent'}
            </span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Approval Note / Statement Ref</label>
          <input type="text" id="approveComment" value="Confirmed received in account for ${memberName}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>

        <!-- Verification Checkbox Point -->
        <label class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-700">
          <input type="checkbox" id="approveDoubleCheck" class="rounded text-emerald-600 mt-0.5" />
          <span class="font-medium">
            I confirm that I have verified the bank/wallet transaction and this payment belongs strictly to <strong>${memberName}</strong>.
          </span>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button onclick="PaymentsView.confirmApprove(${id})" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md flex items-center gap-1.5">
            <i class="fa-solid fa-check"></i> Confirm & Credit to ${memberName}
          </button>
        </div>
      </div>
    `);
  },

  async confirmApprove(id) {
    const isChecked = document.getElementById('approveDoubleCheck')?.checked;
    if (!isChecked) {
      App.toast('Please check the verification confirmation checkbox to ensure safety', 'error');
      return;
    }

    const admin_comment = document.getElementById('approveComment').value;
    try {
      await API.post(`/api/payments/${id}/approve`, { admin_comment, admin_name: App.currentUser?.name || 'Admin' });
      App.toast('Payment verified and approved!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openRejectModal(id, memberName, amount) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-rose-800">Reject Payment</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p class="text-xs text-slate-600">
          Reject claim of <strong class="text-rose-700 font-bold">Rs. ${amount.toLocaleString()}</strong> from <strong class="text-slate-800">${memberName}</strong>.
          The member will see this comment in their portal.
        </p>
        <div>
          <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Rejection Reason *</label>
          <textarea id="rejectComment" rows="3" required placeholder="e.g. Transaction ID not found in bank statement" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button onclick="PaymentsView.confirmReject(${id})" class="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700">Confirm Rejection</button>
        </div>
      </div>
    `);
  },

  async confirmReject(id) {
    const admin_comment = document.getElementById('rejectComment').value;
    if (!admin_comment.trim()) {
      App.toast('Please write a rejection reason', 'error');
      return;
    }
    try {
      await API.post(`/api/payments/${id}/reject`, { admin_comment, admin_name: App.currentUser?.name || 'Admin' });
      App.toast('Payment rejected with reason', 'info');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openRecordPaymentModal(members) {
    const today = new Date().toISOString().slice(0, 10);
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Direct Record Payment</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="PaymentsView.submitRecordPayment(event)" class="space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Member *</label>
              <select id="recMemId" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">-- Choose Member --</option>
                ${members.map(m => `<option value="${m.id}">${m.name} (${m.unique_id})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Category *</label>
              <select id="recPaymentFor" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                <option value="bills">🏢 Monthly Flat Bills / Rent</option>
                <option value="food">🍲 Weekly Food Mess</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount Paid (Rs.) *</label>
              <input type="number" id="recAmount" required min="1" step="any" placeholder="e.g. 5000" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Date *</label>
              <input type="date" id="recDate" value="${today}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method *</label>
              <select id="recMethod" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="cash">Cash in Hand</option>
                <option value="bank_transfer">Bank Online Transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Bank Name / Wallet</label>
              <input type="text" id="recBank" placeholder="e.g. Meezan, HBL, Cash" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction Ref / Slip #</label>
              <input type="text" id="recRef" placeholder="e.g. TXN-102938" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Note / Receipt</label>
              <input type="text" id="recNote" placeholder="e.g. Deposited in cashbox" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">Record & Credit Payment</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitRecordPayment(e) {
    e.preventDefault();
    const member_id = document.getElementById('recMemId').value;
    const payment_for = document.getElementById('recPaymentFor').value;
    const amount = document.getElementById('recAmount').value;
    const payment_date = document.getElementById('recDate').value;
    const payment_method = document.getElementById('recMethod').value;
    const bank_name = document.getElementById('recBank').value;
    const reference_no = document.getElementById('recRef').value;
    const note = document.getElementById('recNote').value;

    try {
      await API.post('/api/payments/record', {
        member_id, payment_for, amount, payment_date, payment_method, bank_name, reference_no, note,
        admin_name: App.currentUser?.name || 'Admin'
      });
      App.toast(`Payment recorded for ${payment_for === 'food' ? 'Weekly Food' : 'Monthly Bills'}!`, 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openEditPaymentModal(p) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Edit Payment Record #${p.id}</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="PaymentsView.submitEditPayment(event, ${p.id})" class="space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Member</label>
              <input type="text" disabled value="${p.member_name} (${p.unique_id})" class="w-full px-3 py-2 text-sm bg-slate-100 border rounded-xl font-bold text-slate-700 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Category *</label>
              <select id="editPayFor" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                <option value="bills" ${p.payment_for === 'bills' ? 'selected' : ''}>🏢 Monthly Bills / Flat Rent</option>
                <option value="food" ${p.payment_for === 'food' ? 'selected' : ''}>🍲 Weekly Food Mess</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount Paid (Rs.) *</label>
              <input type="number" id="editPayAmount" value="${p.amount}" required min="1" step="any" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Date *</label>
              <input type="date" id="editPayDate" value="${p.payment_date}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method *</label>
              <select id="editPayMethod" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="cash" ${p.payment_method === 'cash' ? 'selected' : ''}>Cash in Hand</option>
                <option value="bank_transfer" ${p.payment_method === 'bank_transfer' ? 'selected' : ''}>Bank Online Transfer</option>
                <option value="jazzcash" ${p.payment_method === 'jazzcash' ? 'selected' : ''}>JazzCash</option>
                <option value="easypaisa" ${p.payment_method === 'easypaisa' ? 'selected' : ''}>Easypaisa</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Status *</label>
              <select id="editPayStatus" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                <option value="approved" ${p.status === 'approved' ? 'selected' : ''}>Approved & Credited</option>
                <option value="pending" ${p.status === 'pending' ? 'selected' : ''}>Pending Verification</option>
                <option value="rejected" ${p.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Bank Name / Wallet</label>
              <input type="text" id="editPayBank" value="${p.bank_name || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Ref / Slip #</label>
              <input type="text" id="editPayRef" value="${p.reference_no || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Feedback / Notes</label>
            <input type="text" id="editPayNote" value="${p.admin_comment || p.note || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Save Changes</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEditPayment(e, id) {
    e.preventDefault();
    const payment_for = document.getElementById('editPayFor').value;
    const amount = document.getElementById('editPayAmount').value;
    const payment_date = document.getElementById('editPayDate').value;
    const payment_method = document.getElementById('editPayMethod').value;
    const status = document.getElementById('editPayStatus').value;
    const bank_name = document.getElementById('editPayBank').value;
    const reference_no = document.getElementById('editPayRef').value;
    const admin_comment = document.getElementById('editPayNote').value;

    try {
      await API.put(`/api/payments/${id}`, {
        payment_for, amount, payment_date, payment_method, status, bank_name, reference_no, admin_comment,
        admin_name: App.currentUser?.name || 'Admin'
      });
      App.toast('Payment record updated successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deletePayment(id) {
    const reason = prompt('Void / Correct this payment record?\n\nPlease enter the reason for this correction (recorded in permanent audit history):', 'Duplicate payment claim / correction');
    if (!reason || !reason.trim()) {
      App.toast('Cancelled: Correction reason is required.', 'info');
      return;
    }
    try {
      await API.delete(`/api/payments/${id}`, {
        admin_name: App.currentUser?.name || 'Admin',
        reason: reason.trim()
      });
      App.toast('Payment record voided and correction logged', 'info');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
