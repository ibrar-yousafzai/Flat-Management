// Monthly Bills & Matrix Split View
const BillsView = {
  selectedMonth: new Date().toISOString().slice(0, 7),
  visibleMembersLimit: 6,
  visibleBillsLimit: 6,

  async render() {
    try {
      const [billsData, rooms, members, settings, monthsData] = await Promise.all([
        API.get(`/api/bills?month=${this.selectedMonth}`),
        API.get('/api/rooms'),
        API.get('/api/members?status=Active'),
        API.get('/api/settings'),
        API.get('/api/bills/months-list')
      ]);

      const currency = settings.currency_symbol || 'Rs.';
      const bills = billsData.bills || [];
      const matrix = billsData.matrix || [];
      const visibleMatrix = matrix.slice(0, this.visibleMembersLimit || 6);
      const visibleBills = bills.slice(0, this.visibleBillsLimit || 6);
      const isConfirmed = billsData.month_status === 'confirmed' || billsData.month_status === 'closed';
      const availableMonths = monthsData.months || ['2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10'];

      const insideMembers = members.filter(m => m.type === 'Inside').length;
      const outsideMembers = members.filter(m => m.type === 'Outside').length;
      const totalBillsAmount = Number(billsData.total_bills_amount || 0);

      return `
        <div class="space-y-4 max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto pb-12">
          <!-- 1. Hero Card: Deep Cobalt Blue Gradient with Circular Status Gauge -->
          <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div class="flex items-center gap-4 sm:gap-6 relative z-10">
              <!-- Left: Circular Gauge Indicator -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 ${isConfirmed ? 'border-emerald-400/50 bg-emerald-500/20' : 'border-amber-400/50 bg-amber-500/20'} flex flex-col items-center justify-center text-center shrink-0 backdrop-blur-xs shadow-inner">
                <span class="text-xs sm:text-sm font-black ${isConfirmed ? 'text-emerald-300' : 'text-amber-300'}">
                  ${billsData.month_status === 'closed' ? 'Closed' : (isConfirmed ? 'Published' : 'Draft')}
                </span>
                <span class="text-[9px] text-blue-200 mt-0.5">${this.selectedMonth}</span>
              </div>

              <!-- Right: Details -->
              <div class="space-y-1.5 min-w-0">
                <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Monthly Bills & Splits</h2>
                <div class="space-y-1 text-xs text-blue-100">
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-file-invoice-dollar text-blue-300 w-3.5 text-center"></i>
                    <span>${bills.length} Bills • Auto-Split per Head</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-users text-blue-300 w-3.5 text-center"></i>
                    <span>${insideMembers} Inside Members • ${outsideMembers} Outside</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Three Warm Peach Metric Cards in ONE Row (Matching Reference Screenshot) -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Card 1: Total Bills -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-2xl text-center shadow-2xs flex flex-col justify-between">
              <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xs mb-1">
                <i class="fa-solid fa-file-invoice-dollar"></i>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block">Month Bills</span>
                <span class="text-sm font-black text-amber-950 block mt-0.5">${currency} ${totalBillsAmount.toLocaleString()}</span>
              </div>
              <button onclick="document.getElementById('billsListSection')?.scrollIntoView({ behavior: 'smooth' })" class="mt-2 w-full py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95">
                Bills
              </button>
            </div>

            <!-- Card 2: Bill Items -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-2xl text-center shadow-2xs flex flex-col justify-between">
              <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xs mb-1">
                <i class="fa-solid fa-receipt"></i>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block">Bill Items</span>
                <span class="text-sm font-black text-amber-950 block mt-0.5">${bills.length} Items</span>
              </div>
              <button onclick="BillsView.openCreateBillModal(${JSON.stringify(rooms).replace(/"/g, '&quot;')}, ${JSON.stringify(members).replace(/"/g, '&quot;')})" class="mt-2 w-full py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95">
                + Add
              </button>
            </div>

            <!-- Card 3: Occupants -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-2xl text-center shadow-2xs flex flex-col justify-between">
              <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-xs mb-1">
                <i class="fa-solid fa-users"></i>
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block">Members</span>
                <span class="text-sm font-black text-amber-950 block mt-0.5">${members.length} In Flat</span>
              </div>
              <button onclick="BillsView.openBatchWhatsAppModal()" class="mt-2 w-full py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95">
                WhatsApp
              </button>
            </div>
          </div>

          <!-- 3. Primary Review Card: BILLING REVIEW & CONFIRMATION -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 card-shadow space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <span class="text-[11px] font-black text-blue-700 uppercase tracking-wider">Billing Status & Publish</span>
              <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <span class="text-[11px] font-bold text-slate-500 px-1 uppercase">Month:</span>
                <select onchange="BillsView.changeMonth(this.value)" class="text-[11px] font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 outline-none cursor-pointer">
                  ${availableMonths.map(m => `<option value="${m}" ${this.selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 text-left">
              <div>
                <span class="text-sm sm:text-base font-black text-slate-900 block">${currency} ${totalBillsAmount.toLocaleString()}</span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Total Calculated</span>
              </div>
              <div>
                <span class="text-sm sm:text-base font-black text-slate-900 block">${matrix.length} items</span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Member Shares</span>
              </div>
              <div>
                <span class="text-sm sm:text-base font-black ${isConfirmed ? 'text-emerald-600' : 'text-amber-600'} block">
                  ${isConfirmed ? 'PUBLISHED' : 'DRAFT MODE'}
                </span>
                <span class="text-[10px] text-slate-500 block mt-0.5">Billing Status</span>
              </div>
            </div>

            ${!isConfirmed ? `
              <button onclick="BillsView.confirmMonth()" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer">
                <i class="fa-solid fa-check-double"></i>
                <span>Confirm & Publish Month Bills</span>
              </button>
            ` : `
              <div class="flex items-center gap-2">
                <button onclick="BillsView.closeAndAdvanceMonth()" class="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer">
                  <i class="fa-solid fa-forward-step"></i>
                  <span>Close & Rollover</span>
                </button>
                <button onclick="BillsView.reopenMonth()" class="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer" title="Unlock for re-editing">
                  <i class="fa-solid fa-unlock text-amber-600"></i>
                  <span>Re-edit</span>
                </button>
              </div>
            `}
          </div>

          <!-- 4. Quick Actions: 4 Circular App Icons in a Neat Row -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 card-shadow space-y-3">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Get Help & Quick Actions</h3>
            <div class="grid grid-cols-4 gap-2 pt-1 text-center">
              <button onclick="BillsView.openCreateBillModal(${JSON.stringify(rooms).replace(/"/g, '&quot;')}, ${JSON.stringify(members).replace(/"/g, '&quot;')})" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-solid fa-plus"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Add Bill</span>
              </button>

              <button onclick="BillsView.autoGenerateRent()" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Auto Rent</span>
              </button>

              <button onclick="BillsView.openBatchWhatsAppModal()" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-brands fa-whatsapp"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">WhatsApp</span>
              </button>

              <button onclick="BillsView.promptBatchEmailModal()" class="flex flex-col items-center gap-1.5 group cursor-pointer">
                <div class="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-all">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <span class="text-[11px] font-bold text-slate-700">Email</span>
              </button>
            </div>
          </div>

          <!-- 5. Main Split Breakdown & Bill Items List -->
          <div id="billsListSection" class="space-y-4 pt-1">

          <!-- Main Matrix Table: Members (Rows) vs Bills (Columns) -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-800">Monthly Split Breakdown (${this.selectedMonth})</h3>
                <p class="text-xs text-slate-500">Rent & Monthly Utilities (Weekly food is tracked week-to-week separately)</p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="BillsView.promptBatchEmailModal()" class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mr-2">
                  <i class="fa-solid fa-paper-plane"></i> Batch Email Invoices
                </button>
                <button onclick="App.navigate('reports')" class="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1">
                  <i class="fa-solid fa-print"></i> Print Invoices
                </button>
              </div>
            </div>

            <!-- Desktop Matrix Table (Wide screen high productivity) -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-3 font-bold border-r border-slate-200 min-w-[150px]">Member & Room</th>
                    <th class="py-3 px-3 font-semibold text-center border-r border-slate-200 min-w-[90px] bg-amber-50/50">
                      <div>Prior Arrears</div>
                      <div class="text-[9px] text-amber-700 font-normal">Carried Fwd</div>
                    </th>
                    ${bills.map(b => `
                      <th class="py-3 px-2 font-semibold text-center border-r border-slate-200 min-w-[100px]">
                        <div class="font-bold text-slate-800 truncate" title="${b.title}">${b.title}</div>
                        <div class="text-[10px] text-slate-400 font-normal">${currency} ${b.total_amount.toLocaleString()}</div>
                        <span class="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono uppercase">${b.category}</span>
                      </th>
                    `).join('')}
                    <th class="py-3 px-3 font-bold text-center border-r border-slate-200 bg-indigo-50 text-indigo-900 min-w-[100px]">Month Bills</th>
                    <th class="py-3 px-3 font-bold text-center border-r border-slate-200 bg-emerald-50 text-emerald-900 min-w-[90px]">Bills Paid</th>
                    <th class="py-3 px-3 font-bold text-right border-r border-slate-200 min-w-[110px]">Net Payable</th>
                    <th class="py-3 px-3 font-semibold text-center border-r border-slate-200 bg-amber-50 text-amber-900 min-w-[90px]" title="Separate Weekly Mess">Weekly Food</th>
                    <th class="py-3 px-3 font-semibold text-center no-print">Quick Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${visibleMatrix && visibleMatrix.length > 0 ? visibleMatrix.map(row => {
                    const priorArrears = Number(row.carried_forward ?? row.prior_arrears ?? 0);
                    const billsTotal = Number(row.bills_total ?? 0);
                    const paidAmount = Number(row.paid_amount ?? 0);
                    const netPayable = Number(row.net_month_payable ?? 0);
                    const foodTotal = Number(row.food_total ?? 0);

                    return `
                    <tr class="table-row-hover">
                      <!-- Member & Room -->
                      <td class="py-3 px-3 border-r border-slate-100">
                        <div class="font-bold text-slate-800">${row.member.name}</div>
                        <div class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span class="font-mono text-indigo-600">${row.member.unique_id}</span> &bull; 
                          <span>${row.member.room_name || 'Outside'}</span>
                        </div>
                      </td>

                      <!-- Prior Arrears -->
                      <td class="py-3 px-3 text-center border-r border-slate-100 bg-amber-50/20 font-semibold ${priorArrears !== 0 ? (priorArrears > 0 ? 'text-amber-800' : 'text-emerald-700') : 'text-slate-300'}">
                        ${priorArrears !== 0 ? `${currency} ${priorArrears.toLocaleString()}` : '-'}
                      </td>

                      <!-- Itemized Bills -->
                      ${bills.map(b => {
                        const val = Number(row.bills[b.id] || 0);
                        return `
                          <td class="py-3 px-3 text-center border-r border-slate-100 font-medium ${val > 0 ? 'text-slate-700' : 'text-slate-300'}">
                            ${val > 0 ? `${currency} ${val.toLocaleString()}` : '-'}
                          </td>
                        `;
                      }).join('')}

                      <!-- Total Month Bills Due -->
                      <td class="py-3 px-3 text-center border-r border-slate-100 bg-indigo-50/30 font-bold text-indigo-900">
                        ${currency} ${billsTotal.toLocaleString()}
                      </td>

                      <!-- Bills Paid -->
                      <td class="py-3 px-3 text-center border-r border-slate-100 bg-emerald-50/30 font-bold text-emerald-700">
                        ${paidAmount > 0 ? `${currency} ${paidAmount.toLocaleString()}` : '-'}
                      </td>

                      <!-- Net Bills Balance (Carried + Bills - Paid) -->
                      <td class="py-3 px-3 text-right border-r border-slate-100">
                        <div class="font-extrabold ${netPayable > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                          ${currency} ${netPayable.toLocaleString()}
                        </div>
                        <span class="inline-block text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${netPayable <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                          ${netPayable <= 0 ? 'Paid ✓' : 'Unpaid'}
                        </span>
                      </td>

                      <!-- Separate Weekly Food Mess status -->
                      <td class="py-3 px-3 text-center border-r border-slate-100 bg-amber-50/30 font-semibold text-amber-900">
                        ${foodTotal > 0 ? `${currency} ${foodTotal.toLocaleString()}` : '<span class="text-slate-300">-</span>'}
                      </td>

                      <!-- Quick WhatsApp, Pay & PDF buttons -->
                      <td class="py-3 px-3 text-center no-print">
                        <div class="flex items-center justify-center gap-1">
                          ${netPayable > 0 ? `
                            <button onclick="BillsView.quickRecordPay(${row.member.id}, ${netPayable})" title="Record Payment for ${row.member.name}" class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1">
                              <i class="fa-solid fa-hand-holding-dollar"></i> Pay
                            </button>
                          ` : `
                            <span class="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg">Cleared</span>
                          `}
                          <button onclick="BillsView.openWhatsApp(${row.member.id})" title="Send WhatsApp Invoice" class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                          </button>
                          <button onclick="BillsView.openInvoice(${row.member.id})" title="View / Print PDF" class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all cursor-pointer">
                            <i class="fa-solid fa-file-pdf text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="${bills.length + 6}" class="py-8 text-center text-slate-400">
                        No member records found for ${this.selectedMonth}.
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- Mobile Member Split Cards (Small screen optimized) -->
            <div class="md:hidden divide-y divide-slate-100">
              ${visibleMatrix && visibleMatrix.length > 0 ? visibleMatrix.map(row => {
                const priorArrears = Number(row.carried_forward ?? row.prior_arrears ?? 0);
                const billsTotal = Number(row.bills_total ?? 0);
                const paidAmount = Number(row.paid_amount ?? 0);
                const netPayable = Number(row.net_month_payable ?? 0);

                return `
                <div class="p-4 space-y-3">
                  <!-- Header -->
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="font-bold text-slate-800 text-sm">${row.member.name}</div>
                      <div class="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span class="font-mono text-indigo-600 font-bold">${row.member.unique_id}</span> &bull; 
                        <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">${row.member.room_name || 'Outside'}</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Net Payable</div>
                      <div class="text-base font-black ${netPayable > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                        ${currency} ${netPayable.toLocaleString()}
                      </div>
                      <span class="inline-block text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${netPayable <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${netPayable <= 0 ? 'Paid ✓' : 'Unpaid'}
                      </span>
                    </div>
                  </div>

                  <!-- Key Amounts Bar -->
                  <div class="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs border border-slate-100">
                    <div>
                      <span class="text-[10px] text-slate-400 block">Prior Arrears</span>
                      <span class="font-bold ${priorArrears !== 0 ? (priorArrears > 0 ? 'text-amber-800' : 'text-emerald-700') : 'text-slate-400'}">
                        ${priorArrears !== 0 ? `${currency} ${priorArrears.toLocaleString()}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-400 block">Month Bills</span>
                      <span class="font-bold text-indigo-900">${currency} ${billsTotal.toLocaleString()}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-400 block">Bills Paid</span>
                      <span class="font-bold text-emerald-700">${paidAmount > 0 ? `${currency} ${paidAmount.toLocaleString()}` : '-'}</span>
                    </div>
                  </div>

                  <!-- Itemized Bills Breakdown (Collapsible) -->
                  <details class="text-xs group">
                    <summary class="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between py-1 select-none">
                      <span>View Breakdown (${bills.length} bills)</span>
                      <i class="fa-solid fa-chevron-down text-[10px] transition-transform group-open:rotate-180"></i>
                    </summary>
                    <div class="pt-2 space-y-1.5 border-t border-slate-100 mt-1">
                      ${bills.map(b => {
                        const val = Number(row.bills[b.id] || 0);
                        return `
                          <div class="flex items-center justify-between text-[11px]">
                            <span class="text-slate-600 truncate max-w-[200px]">${b.title}</span>
                            <span class="font-medium ${val > 0 ? 'text-slate-800' : 'text-slate-400'}">${val > 0 ? `${currency} ${val.toLocaleString()}` : '-'}</span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </details>

                  <!-- Mobile Actions -->
                  <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
                    ${netPayable > 0 ? `
                      <button onclick="BillsView.quickRecordPay(${row.member.id}, ${netPayable})" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Pay
                      </button>
                    ` : ''}
                    <button onclick="BillsView.openWhatsApp(${row.member.id})" class="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                      <i class="fa-brands fa-whatsapp text-emerald-600 text-sm"></i> WhatsApp
                    </button>
                    <button onclick="BillsView.openInvoice(${row.member.id})" class="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                      <i class="fa-solid fa-file-invoice text-blue-600"></i> PDF Bill
                    </button>
                  </div>
                </div>
                `;
              }).join('') : `
                <div class="p-6 text-center text-xs text-slate-400">
                  No member records found for ${this.selectedMonth}.
                </div>
              `}
            </div>

            <!-- Members Split Pagination / Show More Toolbar (Fast & Clean) -->
            ${matrix && matrix.length > 6 ? `
              <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div class="text-slate-500 font-medium text-center sm:text-left">
                  Showing <span class="font-bold text-slate-800">${Math.min(this.visibleMembersLimit || 6, matrix.length)}</span> of <span class="font-bold text-slate-800">${matrix.length}</span> members
                </div>
                <div class="flex items-center gap-2">
                  ${(this.visibleMembersLimit || 6) < matrix.length ? `
                    <button onclick="BillsView.showMoreMembers()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                      <i class="fa-solid fa-chevron-down text-xs"></i> Show More (+6)
                    </button>
                    <button onclick="BillsView.showAllMembers()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl transition-all">
                      Show All (${matrix.length})
                    </button>
                  ` : ''}
                  ${(this.visibleMembersLimit || 6) > 6 ? `
                    <button onclick="BillsView.showLessMembers()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl transition-all flex items-center gap-1">
                      <i class="fa-solid fa-chevron-up text-xs"></i> Show Less (6)
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Individual Bills List & Management -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-slate-800">Bills List for ${this.selectedMonth}</h3>
              <span class="text-xs text-slate-400 font-medium">${bills.length} total bills</span>
            </div>
            ${bills.length > 0 ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                ${visibleBills.map(b => `
                  <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div class="font-bold text-slate-800 text-xs">${b.title}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5 font-semibold text-emerald-700">
                        ${currency} ${b.total_amount.toLocaleString()}
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5">
                        Split: <span class="capitalize font-mono">${b.split_type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button onclick="BillsView.openEditBillModal(${JSON.stringify(b).replace(/"/g, '&quot;')})" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all" title="Edit Bill">
                        <i class="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button onclick="BillsView.deleteBill(${b.id}, '${b.title}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Bill">
                        <i class="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Bills Load More -->
              ${bills.length > 6 ? `
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span class="text-slate-500">Showing ${Math.min(this.visibleBillsLimit || 6, bills.length)} of ${bills.length} bills</span>
                  <div class="flex items-center gap-2">
                    ${(this.visibleBillsLimit || 6) < bills.length ? `
                      <button onclick="BillsView.showMoreBills()" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-all">
                        Show More Bills (+6)
                      </button>
                    ` : `
                      <button onclick="BillsView.showLessBills()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all">
                        Show Less Bills
                      </button>
                    `}
                  </div>
                </div>
              ` : ''}
            ` : '<p class="text-xs text-slate-400">No bills added yet for this month. Click "Auto-Fill Rent" or "Add One-by-One Bill" above.</p>'}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading bills: ${err.message}</div>`;
    }
  },

  showMoreMembers() {
    this.visibleMembersLimit = (this.visibleMembersLimit || 6) + 6;
    App.refresh();
  },

  showAllMembers() {
    this.visibleMembersLimit = 9999;
    App.refresh();
  },

  showLessMembers() {
    this.visibleMembersLimit = 6;
    App.refresh();
  },

  showMoreBills() {
    this.visibleBillsLimit = (this.visibleBillsLimit || 6) + 6;
    App.refresh();
  },

  showLessBills() {
    this.visibleBillsLimit = 6;
    App.refresh();
  },

  changeMonth(month) {
    this.selectedMonth = month;
    this.visibleMembersLimit = 6;
    this.visibleBillsLimit = 6;
    App.refresh();
  },

  async confirmMonth() {
    if (!confirm(`Are you sure you want to confirm all bills for ${this.selectedMonth}? This will officially store them and publish to member portals.`)) return;
    try {
      const res = await API.post('/api/bills/confirm-month', { month: this.selectedMonth, admin_name: App.currentUser?.name || 'Admin' });
      App.toast(res.message, 'success');
      // Prompt admin immediately to send emails to All or Selected members
      this.promptBatchEmailModal();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Clean, unified modal to send monthly bill invoices by email
  async promptBatchEmailModal() {
    try {
      const [members, consolidated] = await Promise.all([
        API.get('/api/members?status=Active'),
        API.get(`/api/reports/month-consolidated/${this.selectedMonth}`)
      ]);

      const netMap = {};
      for (const r of (consolidated.rows || [])) {
        netMap[r.member.id] = r.net_bills_due;
      }

      const withEmail = members.filter(m => m.email && m.email.trim().length > 0);
      const withoutEmail = members.filter(m => !m.email || m.email.trim().length === 0);

      // Format month for display
      const [yearStr, monthStr] = this.selectedMonth.split('-');
      const monthObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const monthDisplay = isNaN(monthObj.getTime()) ? this.selectedMonth : monthObj.toLocaleString('default', { month: 'long', year: 'numeric' });

      App.showModal(`
        <div class="space-y-4 max-w-lg mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-paper-plane"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-800">Send Monthly Bill Invoices</h3>
                <p class="text-xs text-slate-500">${monthDisplay} &bull; Delivered via Email</p>
              </div>
            </div>
            <button onclick="App.closeModal(); App.refresh();" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Simple Recipient Scope Selector -->
          <div class="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1 text-xs font-semibold">
            <button type="button" id="tabEmailAll" onclick="BillsView.setEmailRecipientMode('all')" class="flex-1 py-2 px-3 rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold text-center transition-all">
              All Members (${withEmail.length})
            </button>
            <button type="button" id="tabEmailCustom" onclick="BillsView.setEmailRecipientMode('custom')" class="flex-1 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 text-center transition-all">
              Pick Specific Members
            </button>
          </div>

          <!-- Summary info note -->
          <div class="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
            <i class="fa-solid fa-circle-info text-indigo-500 mt-0.5 text-xs"></i>
            <div class="leading-relaxed">
              Each member gets a simple, clean email with their <strong>Rent, Electricity, WiFi, and Cook</strong> breakdown plus official payment accounts.
            </div>
          </div>

          <!-- Member selection list (visible when in 'custom' mode) -->
          <div id="emailMembersPickerContainer" class="hidden space-y-2">
            <div class="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
              <span>Select members to email:</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="BillsView.toggleAllEmailCheckboxes(true)" class="text-indigo-600 font-bold hover:underline">Select All</button>
                <span>&bull;</span>
                <button type="button" onclick="BillsView.toggleAllEmailCheckboxes(false)" class="text-slate-500 font-bold hover:underline">Clear</button>
              </div>
            </div>

            <div class="max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-2 divide-y divide-slate-100 bg-white">
              ${members.map(m => {
                const hasEmail = m.email && m.email.trim().length > 0;
                const due = netMap[m.id] || 0;
                return `
                  <label class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer ${!hasEmail ? 'opacity-40' : ''}">
                    <div class="flex items-center gap-2.5">
                      <input type="checkbox" name="batchMemberCheckbox" value="${m.id}" ${hasEmail ? 'checked' : 'disabled'} onchange="BillsView.updateEmailSendButtonCount()" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div>
                        <div class="font-bold text-slate-800 text-xs">${m.name} <span class="font-mono text-slate-400 text-[10px]">(${m.unique_id})</span></div>
                        <div class="text-[11px] text-slate-500">${m.room_name || 'Outside'} &bull; ${hasEmail ? `<span class="text-slate-600">${m.email}</span>` : '<span class="text-rose-500 italic">No email saved</span>'}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs font-bold text-slate-800 font-mono">Rs. ${due.toLocaleString()}</div>
                      <div class="text-[10px] text-slate-400">Total Due</div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          ${withoutEmail.length > 0 ? `
            <div class="text-[11px] text-slate-400 px-1">
              Note: ${withoutEmail.length} ${withoutEmail.length === 1 ? 'member has' : 'members have'} no email configured (send via WhatsApp from the Reports page).
            </div>
          ` : ''}

          <!-- Footer Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <button type="button" onclick="App.closeModal(); App.refresh();" class="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700">
              Skip / Later
            </button>
            <button type="button" id="btnDispatchEmail" onclick="BillsView.submitEmailDispatch()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-2">
              <i class="fa-solid fa-paper-plane text-xs"></i>
              <span id="btnDispatchEmailText">Send ${withEmail.length} Invoices</span>
            </button>
          </div>
        </div>
      `);

      this.emailRecipientMode = 'all';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  setEmailRecipientMode(mode) {
    this.emailRecipientMode = mode;
    const tabAll = document.getElementById('tabEmailAll');
    const tabCustom = document.getElementById('tabEmailCustom');
    const picker = document.getElementById('emailMembersPickerContainer');

    if (mode === 'all') {
      tabAll.className = 'flex-1 py-2 px-3 rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold text-center transition-all';
      tabCustom.className = 'flex-1 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 text-center transition-all';
      if (picker) picker.classList.add('hidden');
    } else {
      tabCustom.className = 'flex-1 py-2 px-3 rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold text-center transition-all';
      tabAll.className = 'flex-1 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 text-center transition-all';
      if (picker) picker.classList.remove('hidden');
    }

    this.updateEmailSendButtonCount();
  },

  updateEmailSendButtonCount() {
    const btnText = document.getElementById('btnDispatchEmailText');
    if (!btnText) return;

    if (this.emailRecipientMode === 'all') {
      const allEnabled = document.querySelectorAll('input[name="batchMemberCheckbox"]:not(:disabled)');
      btnText.innerText = `Send ${allEnabled.length} Invoices`;
    } else {
      const checkedBoxes = document.querySelectorAll('input[name="batchMemberCheckbox"]:checked');
      btnText.innerText = `Send to ${checkedBoxes.length} Selected`;
    }
  },

  toggleAllEmailCheckboxes(select) {
    const checkboxes = document.querySelectorAll('input[name="batchMemberCheckbox"]:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = select);
    this.updateEmailSendButtonCount();
  },

  async submitEmailDispatch() {
    let memberIds = 'all';

    if (this.emailRecipientMode === 'custom') {
      const checkedBoxes = document.querySelectorAll('input[name="batchMemberCheckbox"]:checked');
      memberIds = Array.from(checkedBoxes).map(cb => Number(cb.value));

      if (memberIds.length === 0) {
        App.toast('Please select at least one member with a valid email address.', 'error');
        return;
      }
    }

    const btn = document.getElementById('btnDispatchEmail');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> Sending Invoices...`;
    }

    await this.dispatchBatchEmail(memberIds);
  },

  async dispatchBatchEmail(memberIds) {
    try {
      App.toast('Dispatching invoices via email...', 'info');
      const res = await API.post('/api/reports/batch-send-emails', {
        month: this.selectedMonth,
        member_ids: memberIds,
        email_type: 'bills'
      });

      App.toast(res.message, 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
      const btn = document.getElementById('btnDispatchEmail');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane text-xs"></i> Try Again`;
      }
    }
  },

  async reopenMonth() {
    const reason = prompt(`Unlock & Reopen bills for ${this.selectedMonth} for editing?\n\nPlease enter the reason for unlocking (required for the official audit trail):`, 'Correcting meter units / utility adjustment');
    if (!reason || !reason.trim()) {
      App.toast('Reopen cancelled: A clear reason is required to unlock finalized bills.', 'info');
      return;
    }
    try {
      const res = await API.post('/api/bills/reopen-month', {
        month: this.selectedMonth,
        reason: reason.trim(),
        admin_name: App.currentUser?.name || 'Admin'
      });
      App.toast(res.message, 'success');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async closeAndAdvanceMonth() {
    if (!confirm(`Are you sure you want to close ${this.selectedMonth} and roll over to the next month? Remaining member balances will be saved and carried forward automatically.`)) return;
    try {
      const res = await API.post('/api/bills/close-and-advance-month', { month: this.selectedMonth, admin_name: App.currentUser?.name || 'Admin' });
      App.toast(res.message, 'success');
      this.selectedMonth = res.nextMonth;
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  promptDeleteMonth() {
    App.showModal(`
      <div class="space-y-4 max-w-md mx-auto">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Delete Month Data</h3>
              <p class="text-xs text-slate-500">Billing Month: <strong>${this.selectedMonth}</strong></p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5">
          <p class="font-bold">⚠️ Permanent Action</p>
          <p>This will permanently delete all bills, member splits, and status for month <strong>${this.selectedMonth}</strong>.</p>
        </div>

        <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" id="delMonthAlsoFood" class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500" />
          <span>Also delete weekly food mess batches for ${this.selectedMonth}</span>
        </label>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onclick="BillsView.confirmDeleteMonth()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-trash-can text-xs"></i> Delete All ${this.selectedMonth} Data
          </button>
        </div>
      </div>
    `);
  },

  async confirmDeleteMonth() {
    const alsoFood = document.getElementById('delMonthAlsoFood')?.checked;
    try {
      App.toast(`Deleting data for month ${this.selectedMonth}...`, 'info');
      const res = await API.delete(`/api/bills/month/${this.selectedMonth}?delete_food=${alsoFood ? 'true' : 'false'}`);
      App.toast(res.message, 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async autoGenerateRent() {
    try {
      const res = await API.post('/api/bills/auto-generate-rent', { month: this.selectedMonth });
      App.toast(`Rent of Rs. ${res.totalRent} auto-generated!`, 'success');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openCreateBillModal(rooms, members) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Add One-by-One Bill (${this.selectedMonth})</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="BillsView.submitCreateBill(event)" class="space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Bill Title *</label>
              <input type="text" id="newBillTitle" required placeholder="e.g. WiFi, Cook Salary, Electricity" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Bill Amount (Rs.) *</label>
              <input type="number" id="newBillAmount" required min="1" step="any" placeholder="e.g. 15000" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
              <select id="newBillCategory" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="utility">Utility (Electricity, Gas, Water, Wifi)</option>
                <option value="salary">Staff Salary (Cook, Cleaner)</option>
                <option value="maintenance">Maintenance / Repair</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Split Method *</label>
              <select id="newBillSplitType" onchange="BillsView.onSplitTypeChange(this.value)" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="everyone" selected>Everyone (All active members)</option>
                <option value="inside_only">Inside Only (Living in flat)</option>
                <option value="by_room">By Specific Room</option>
                <option value="pick_people">Pick Specific People</option>
              </select>
            </div>
          </div>

          <!-- Room Selector (for by_room) -->
          <div id="billRoomSelector" style="display:none;">
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Room</label>
            <select id="newBillRoomId" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
              ${rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
          </div>

          <!-- Member Pick Selector (for pick_people) -->
          <div id="billMemberPicker" style="display:none;" class="space-y-1">
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Participating Members</label>
            <div class="max-h-40 overflow-y-auto border rounded-xl p-2.5 grid grid-cols-2 gap-2 bg-slate-50 text-xs">
              ${members.map(m => `
                <label class="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-white">
                  <input type="checkbox" name="selectedMember" value="${m.id}" checked class="rounded text-indigo-600" />
                  <span>${m.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Bill Attachment URL</label>
            <input type="text" id="newBillNotes" placeholder="e.g. Unit consumption or receipt link" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Add Bill</button>
          </div>
        </form>
      </div>
    `);
  },

  onSplitTypeChange(type) {
    document.getElementById('billRoomSelector').style.display = type === 'by_room' ? 'block' : 'none';
    document.getElementById('billMemberPicker').style.display = type === 'pick_people' ? 'block' : 'none';
  },

  async submitCreateBill(e) {
    e.preventDefault();
    const title = document.getElementById('newBillTitle').value;
    const total_amount = document.getElementById('newBillAmount').value;
    const category = document.getElementById('newBillCategory').value;
    const split_type = document.getElementById('newBillSplitType').value;
    const notes = document.getElementById('newBillNotes').value;
    const room_id = split_type === 'by_room' ? document.getElementById('newBillRoomId').value : null;

    let selected_members = [];
    if (split_type === 'pick_people') {
      const checkedBoxes = document.querySelectorAll('input[name="selectedMember"]:checked');
      selected_members = Array.from(checkedBoxes).map(cb => Number(cb.value));
      if (selected_members.length === 0) {
        App.toast('Please check at least one member', 'error');
        return;
      }
    }

    try {
      await API.post('/api/bills', {
        month: this.selectedMonth,
        title,
        total_amount,
        category,
        split_type,
        room_id,
        selected_members,
        notes
      });
      App.toast('Bill added! You can add more bills or confirm the month when done.', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openEditBillModal(b) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Edit Bill: ${b.title}</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="BillsView.submitEditBill(event, ${b.id})" class="space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Bill Title *</label>
              <input type="text" id="editBillTitle" value="${b.title}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Bill Amount (Rs.) *</label>
              <input type="number" id="editBillAmount" value="${b.total_amount}" required min="1" step="any" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
              <select id="editBillCategory" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="utility" ${b.category === 'utility' ? 'selected' : ''}>Utility (Electricity, Wifi, Gas, Water)</option>
                <option value="salary" ${b.category === 'salary' ? 'selected' : ''}>Staff Salary (Cook, Cleaner)</option>
                <option value="maintenance" ${b.category === 'maintenance' ? 'selected' : ''}>Maintenance / Repair</option>
                <option value="rent" ${b.category === 'rent' ? 'selected' : ''}>Rent</option>
                <option value="other" ${b.category === 'other' ? 'selected' : ''}>Other / Custom</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Split Method</label>
              <select id="editBillSplitType" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="everyone" ${b.split_type === 'everyone' ? 'selected' : ''}>Everyone (All active members)</option>
                <option value="inside_only" ${b.split_type === 'inside_only' ? 'selected' : ''}>Inside Only (Living in flat)</option>
                <option value="by_room" ${b.split_type === 'by_room' ? 'selected' : ''}>By Specific Room</option>
                <option value="pick_people" ${b.split_type === 'pick_people' ? 'selected' : ''}>Pick Specific People</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Bill Attachment Details</label>
            <input type="text" id="editBillNotes" value="${b.notes || ''}" placeholder="e.g. Unit count, meter reading, photo link" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Update & Recalculate Splits</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEditBill(e, billId) {
    e.preventDefault();
    const title = document.getElementById('editBillTitle').value;
    const total_amount = document.getElementById('editBillAmount').value;
    const category = document.getElementById('editBillCategory').value;
    const split_type = document.getElementById('editBillSplitType').value;
    const notes = document.getElementById('editBillNotes').value;

    try {
      await API.put(`/api/bills/${billId}`, {
        title, total_amount, category, split_type, notes,
        admin_name: App.currentUser?.name || 'Admin'
      });
      App.toast('Bill updated and splits recalculated!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteBill(id, title) {
    if (!confirm(`Are you sure you want to delete the bill "${title}"?`)) return;
    try {
      await API.delete(`/api/bills/${id}`);
      App.toast('Bill deleted', 'info');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async openWhatsApp(memberId) {
    try {
      App.toast('Loading WhatsApp invoice...', 'info');
      const data = await API.get(`/api/reports/member-invoice/${memberId}?month=${this.selectedMonth}`);
      
      App.showModal(`
        <div class="space-y-4 max-w-lg mx-auto">
          <div class="flex items-center justify-between border-b pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <i class="fa-brands fa-whatsapp"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-800">Send WhatsApp Bill: ${data.member.name}</h3>
                <p class="text-xs text-slate-500">Phone: <strong>${data.member.whatsapp || 'No phone saved'}</strong> &bull; Month: ${this.selectedMonth}</p>
              </div>
            </div>
            <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Total Bill Highlight -->
          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-[10px] uppercase font-bold text-emerald-800">Total Net Amount Due</div>
              <div class="text-lg font-black text-emerald-950 font-mono">Rs. ${data.netMonthBillsBalance.toLocaleString()}</div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800">
              ${data.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
            </span>
          </div>

          <!-- Formatted Message Box -->
          <div>
            <div class="flex items-center justify-between mb-1 text-xs">
              <span class="font-bold text-slate-700">Pre-Filled WhatsApp Message:</span>
              <button onclick="BillsView.copyTextToClipboard('${encodeURIComponent(data.whatsappText)}')" class="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1">
                <i class="fa-regular fa-copy"></i> Copy Text
              </button>
            </div>
            <textarea readonly rows="7" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 leading-relaxed outline-none select-all">${data.whatsappText}</textarea>
          </div>

          <!-- Direct Actions -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button type="button" onclick="BillsView.copyTextToClipboard('${encodeURIComponent(data.whatsappText)}')" class="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
              <i class="fa-regular fa-copy"></i> Copy Message
            </button>

            <a href="${data.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-2">
              <i class="fa-brands fa-whatsapp text-sm"></i> Open WhatsApp Chat
            </a>
          </div>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Modal to dispatch WhatsApp messages one by one to all members
  async openBatchWhatsAppModal() {
    try {
      const [members, consolidated] = await Promise.all([
        API.get('/api/members?status=Active'),
        API.get(`/api/reports/month-consolidated/${this.selectedMonth}`)
      ]);

      const netMap = {};
      for (const r of (consolidated.rows || [])) {
        netMap[r.member.id] = r.net_bills_due;
      }

      App.showModal(`
        <div class="space-y-4 max-w-2xl mx-auto">
          <div class="flex items-center justify-between border-b pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <i class="fa-brands fa-whatsapp"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-800">📱 Send WhatsApp Bills (One by One)</h3>
                <p class="text-xs text-slate-500">Billing Month: <strong>${this.selectedMonth}</strong> &bull; Opens chat with bill pre-filled</p>
              </div>
            </div>
            <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
            <i class="fa-solid fa-circle-info text-emerald-600 mt-0.5"></i>
            <div>
              Click <strong>"Open WhatsApp"</strong> next to each member. It automatically moves you into WhatsApp directly with that person's chat and their bill message pre-filled. Then simply press send!
            </div>
          </div>

          <!-- Members WhatsApp Table -->
          <div class="max-h-80 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
            ${members.map(m => {
              const hasPhone = m.whatsapp && m.whatsapp.trim().length > 0;
              const due = netMap[m.id] || 0;
              return `
                <div id="waRow_${m.id}" class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                      ${m.name.charAt(0)}
                    </div>
                    <div>
                      <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span>${m.name}</span>
                        <span class="font-mono text-slate-400 text-[10px]">(${m.unique_id})</span>
                        <span id="waStatus_${m.id}" class="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-500">Pending</span>
                      </div>
                      <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>${m.room_name || 'Outside'}</span>
                        <span>&bull;</span>
                        <span class="font-mono ${hasPhone ? 'text-emerald-700 font-semibold' : 'text-rose-500 italic'}">
                          ${hasPhone ? m.whatsapp : 'No phone saved'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between sm:justify-end gap-3">
                    <div class="text-right">
                      <div class="text-xs font-black text-slate-800 font-mono">Rs. ${due.toLocaleString()}</div>
                      <div class="text-[10px] text-slate-400">Net Due</div>
                    </div>

                    <div class="flex items-center gap-1.5">
                      <button onclick="BillsView.copyWhatsAppForMember(${m.id})" title="Copy formatted bill text" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                        <i class="fa-regular fa-copy text-xs"></i> Copy
                      </button>

                      <button onclick="BillsView.sendWhatsAppToMember(${m.id})" ${hasPhone ? '' : 'disabled'} title="${hasPhone ? 'Open WhatsApp Chat' : 'Member has no phone number saved'}" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5">
                        <i class="fa-brands fa-whatsapp text-sm"></i>
                        <span id="waBtnLabel_${m.id}">Open WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <span class="text-xs text-slate-400">${members.length} active members</span>
            <button onclick="App.closeModal()" class="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all">
              Done
            </button>
          </div>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async sendWhatsAppToMember(memberId) {
    try {
      const data = await API.get(`/api/reports/member-invoice/${memberId}?month=${this.selectedMonth}`);
      
      // Update UI status badge
      const statusEl = document.getElementById(`waStatus_${memberId}`);
      if (statusEl) {
        statusEl.className = 'text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800';
        statusEl.innerText = 'Sent ✓';
      }

      const btnLabel = document.getElementById(`waBtnLabel_${memberId}`);
      if (btnLabel) {
        btnLabel.innerText = 'Sent Again';
      }

      // Open WhatsApp directly
      const a = document.createElement('a');
      a.href = data.whatsappUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      App.toast(`Opened WhatsApp for ${data.member.name}`, 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async copyWhatsAppForMember(memberId) {
    try {
      const data = await API.get(`/api/reports/member-invoice/${memberId}?month=${this.selectedMonth}`);
      this.copyTextToClipboard(encodeURIComponent(data.whatsappText), `${data.member.name}'s`);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  copyTextToClipboard(encodedText, namePrefix = '') {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text).then(() => {
      App.toast(`Copied ${namePrefix ? namePrefix + ' ' : ''}WhatsApp invoice to clipboard!`, 'success');
    }).catch(() => {
      prompt('Copy message text:', text);
    });
  },

  async openInvoice(memberId) {
    App.openInvoiceModal(memberId, this.selectedMonth);
  },

  async quickRecordPay(memberId, defaultAmount) {
    try {
      const members = await API.get('/api/members?status=Active');
      PaymentsView.openRecordPaymentModal(members, memberId, defaultAmount, 'bills');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
