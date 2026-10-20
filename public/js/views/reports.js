// Reports & WhatsApp Invoice View
const ReportsView = {
  selectedMonth: new Date().toISOString().slice(0, 7),
  selectedMemberId: 'all',

  async render() {
    try {
      const isMember = App.userType === 'member';

      // If logged in as member, enforce their own ID only (strict privacy)
      if (isMember) {
        this.selectedMemberId = String(App.currentUser.id);
      }

      const [members, settings, monthsData] = await Promise.all([
        API.get('/api/members?status=Active'),
        API.get('/api/settings'),
        API.get('/api/bills/months-list')
      ]);

      const currency = settings.currency_symbol || 'Rs.';
      const availableMonths = monthsData.months || ['2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10'];

      return `
        <div class="space-y-6">
          <!-- Header (Hidden on Print) -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 card-shadow no-print">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">${isMember ? 'My Official Invoice & Statement' : 'Statements, Invoicing & Master PDF'}</h1>
              <p class="text-sm text-slate-500 mt-0.5">
                ${isMember ? 'Your private monthly flat statement and weekly food mess status' : 'Generate single-member private invoices or the complete Admin Master Consolidated PDF Statement'}
              </p>
            </div>

            <!-- Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <label class="text-xs font-bold text-slate-600 px-1 uppercase">Month:</label>
                <select onchange="ReportsView.changeMonth(this.value)" class="text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-300 outline-none">
                  ${availableMonths.map(m => `<option value="${m}" ${this.selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>

              ${!isMember ? `
                <select id="reportMemberSelect" onchange="ReportsView.changeMember(this.value)" class="text-xs font-bold bg-white px-3 py-2 rounded-xl border border-slate-300 outline-none">
                  <option value="all" ${this.selectedMemberId === 'all' ? 'selected' : ''}>📑 Admin Master Statement (All Members PDF)</option>
                  ${members.map(m => `<option value="${m.id}" ${this.selectedMemberId == m.id ? 'selected' : ''}>👤 ${m.name} (${m.unique_id})</option>`).join('')}
                </select>

                <a href="/api/reports/export-excel/${this.selectedMonth}" download class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5" title="Export monthly records to Excel CSV">
                  <i class="fa-solid fa-file-excel"></i> Export Excel (.csv)
                </a>

                <button onclick="BillsView.promptBatchEmailModal()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-paper-plane"></i> Batch Email Invoices
                </button>

                ${App.currentUser?.role === 'super_admin' ? `
                  <a href="/api/reports/database-backup" download class="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5" title="Download offline SQLite database backup">
                    <i class="fa-solid fa-database"></i> DB Backup
                  </a>
                ` : ''}
              ` : `
                <button onclick="PortalView.openFullStatementModal(${this.selectedMemberId})" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-file-invoice"></i> Download My Full Statement (PDF)
                </button>
              `}

              <button onclick="window.print()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-print"></i> Print / Save as PDF
              </button>
            </div>
          </div>

          <!-- Monthly Backup Reminder Banner for Super Admin -->
          ${App.currentUser?.role === 'super_admin' && !isMember ? `
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm no-print">
              <div class="flex items-center gap-3">
                <span class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  <i class="fa-solid fa-bell"></i>
                </span>
                <div>
                  <strong class="text-amber-950 font-bold text-sm">Monthly Backup Reminder (Super Admin)</strong>
                  <p class="text-amber-800 text-[11px] mt-0.5">Please export this month's Excel statement and database backup for your offline records.</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <a href="/api/reports/export-excel/${this.selectedMonth}" download class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-file-excel"></i> Export Excel (${this.selectedMonth})
                </a>
                <a href="/api/reports/database-backup" download class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5">
                  <i class="fa-solid fa-database"></i> Database Backup (.db)
                </a>
              </div>
            </div>
          ` : ''}
                <i class="fa-solid fa-print"></i> Print / Save as PDF
              </button>
            </div>
          </div>

          <!-- Printable Container -->
          <div id="printable-invoice-container">
            ${this.selectedMemberId === 'all' && !isMember
              ? await this.renderConsolidatedView(currency, settings) 
              : await this.renderSingleMemberInvoice(this.selectedMemberId, currency, settings)}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading reports: ${err.message}</div>`;
    }
  },

  changeMonth(month) {
    this.selectedMonth = month;
    App.refresh();
  },

  changeMember(memberId) {
    this.selectedMemberId = memberId;
    App.refresh();
  },

  async renderSingleMemberInvoice(memberId, currency, settings) {
    const data = await API.get(`/api/reports/member-invoice/${memberId}?month=${this.selectedMonth}`);
    this.currentInvoiceData = data;
    const m = data.member;
    const b = data.overallBalance;

    // Categorize specific bills for clear highlights
    let rentShare = 0;
    let elecShare = 0;
    let wifiShare = 0;
    let cookShare = 0;
    let otherShare = 0;

    for (const item of (data.bills || [])) {
      const titleLower = (item.title || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      if (titleLower.includes('rent') || catLower === 'rent') {
        rentShare += item.amount;
      } else if (titleLower.includes('elec') || titleLower.includes('bijli')) {
        elecShare += item.amount;
      } else if (titleLower.includes('wifi') || titleLower.includes('net') || titleLower.includes('internet')) {
        wifiShare += item.amount;
      } else if (titleLower.includes('cook') || titleLower.includes('khansama') || titleLower.includes('maid')) {
        cookShare += item.amount;
      } else {
        otherShare += item.amount;
      }
    }

    return `
      <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-8 max-w-3xl mx-auto space-y-6">
        <!-- Invoice Header -->
        <div class="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <span class="text-xs font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 uppercase font-mono">Official Member Invoice</span>
            <h2 class="text-2xl font-black text-slate-800 mt-2">${settings.flat_name || 'Flat Management System'}</h2>
            <p class="text-xs text-slate-500 mt-0.5">Flat F-133-26 &bull; Monthly Rent & Utilities</p>
          </div>
          <div class="text-right">
            <div class="font-mono text-sm font-bold text-slate-700">${data.invoiceNumber}</div>
            <div class="text-xs text-slate-500 mt-0.5">Billing Month: <strong>${data.month}</strong></div>
            <div class="text-xs text-slate-400 mt-0.5">Issue Date: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <!-- Billed Member Highlight Box -->
        <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
          <div>
            <p class="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Billed Member</p>
            <p class="text-lg font-black text-slate-900 mt-0.5">${m.name}</p>
            <p class="text-slate-500 font-mono mt-0.5">Unique ID: <strong class="text-indigo-600">${m.unique_id}</strong></p>
            ${m.email ? `<p class="text-slate-500 mt-0.5">${m.email}</p>` : ''}
            ${m.whatsapp ? `<p class="text-slate-500 mt-0.5">Phone: ${m.whatsapp}</p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Accommodation</p>
            <p class="text-sm font-bold text-slate-800 mt-0.5">${m.type} Member</p>
            <p class="text-slate-600 mt-0.5">${m.room_name ? `Room: <strong class="text-slate-800">${m.room_name}</strong>` : 'No Assigned Room (Outside)'}</p>
            <div class="mt-2 inline-block px-3 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-[11px] border border-rose-200">
              Please pay this as soon as possible
            </div>
          </div>
        </div>

        <!-- Itemized Quick Summary Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <span class="text-[10px] uppercase font-bold text-indigo-700 block">🏠 Room Rent</span>
            <span class="text-sm font-extrabold text-slate-800 mt-0.5 block">${currency} ${rentShare.toLocaleString()}</span>
          </div>
          <div class="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
            <span class="text-[10px] uppercase font-bold text-amber-700 block">⚡ Electricity</span>
            <span class="text-sm font-extrabold text-slate-800 mt-0.5 block">${currency} ${elecShare.toLocaleString()}</span>
          </div>
          <div class="p-3 bg-sky-50/50 border border-sky-100 rounded-xl">
            <span class="text-[10px] uppercase font-bold text-sky-700 block">📶 WiFi</span>
            <span class="text-sm font-extrabold text-slate-800 mt-0.5 block">${currency} ${wifiShare.toLocaleString()}</span>
          </div>
          <div class="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <span class="text-[10px] uppercase font-bold text-emerald-700 block">👨‍🍳 Cook Salary</span>
            <span class="text-sm font-extrabold text-slate-800 mt-0.5 block">${currency} ${cookShare.toLocaleString()}</span>
          </div>
        </div>

        <!-- SECTION 1: MONTHLY FLAT BILLS & RENT -->
        <div class="border border-indigo-100 rounded-2xl p-5 bg-indigo-50/20 space-y-3">
          <div class="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div>
              <h3 class="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-building text-indigo-600"></i> Section 1: Monthly Flat Bills & Rent (Month-End)
              </h3>
              <p class="text-[11px] text-slate-400">Fixed room rent and shared utility bills</p>
            </div>
            <span class="text-xs font-bold text-indigo-700 font-mono">${data.month}</span>
          </div>

          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="text-slate-400 uppercase text-[10px] border-b border-indigo-50">
                <th class="py-2">Description</th>
                <th class="py-2 text-center">Category</th>
                <th class="py-2 text-right">Share (${currency})</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-indigo-50">
              ${data.priorArrears !== 0 ? `
                <tr class="bg-amber-50/40">
                  <td class="py-2.5 font-bold text-amber-950 flex items-center gap-1.5">
                    <i class="fa-solid fa-arrow-turn-down text-amber-600 text-[10px]"></i>
                    Previous Balance Carried Forward (Arrears)
                  </td>
                  <td class="py-2.5 text-center text-amber-800 uppercase text-[9px] font-bold">Prior Dues</td>
                  <td class="py-2.5 text-right font-extrabold ${data.priorArrears > 0 ? 'text-rose-700' : 'text-emerald-700'}">${currency} ${data.priorArrears.toLocaleString()}</td>
                </tr>
              ` : ''}

              ${data.bills.length > 0 ? data.bills.map(item => `
                <tr>
                  <td class="py-2 font-medium text-slate-800">${item.title}</td>
                  <td class="py-2 text-center text-slate-400 uppercase text-[10px]">${item.category}</td>
                  <td class="py-2 text-right font-bold text-slate-700">${item.amount.toLocaleString()}</td>
                </tr>
              `).join('') : '<tr><td colspan="3" class="py-2 text-slate-400 italic">No flat bills recorded for this month</td></tr>'}
            </tbody>
            <tfoot class="border-t border-indigo-100 text-xs font-bold pt-2">
              <tr>
                <td colspan="2" class="py-2 text-slate-600">New Charges for ${data.month}:</td>
                <td class="py-2 text-right text-indigo-900">${currency} ${data.monthBillsTotal.toLocaleString()}</td>
              </tr>
              ${data.monthBillPaidTotal > 0 ? `
                <tr>
                  <td colspan="2" class="py-1 text-emerald-600 font-semibold">Bills Paid in ${data.month}:</td>
                  <td class="py-1 text-right text-emerald-600 font-bold">- ${currency} ${data.monthBillPaidTotal.toLocaleString()}</td>
                </tr>
              ` : ''}
              <tr class="border-t border-indigo-200">
                <td colspan="2" class="py-2.5 text-slate-900 font-extrabold text-sm">Net Month-End Bills Balance:</td>
                <td class="py-2.5 text-right text-base font-black ${data.netMonthBillsBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                  ${currency} ${data.netMonthBillsBalance.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- SECTION 2: WEEKLY FOOD MESS (SEPARATE WEEK-TO-WEEK) -->
        <div class="border border-amber-200 rounded-2xl p-5 bg-amber-50/20 space-y-3">
          <div class="flex items-center justify-between border-b border-amber-200 pb-2">
            <div>
              <h3 class="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-utensils text-amber-600"></i> Section 2: Weekly Food Mess
              </h3>
              <p class="text-[11px] text-slate-400">Week-to-week grocery mess (Settled weekly, not monthly)</p>
            </div>
            <span class="text-xs font-bold text-amber-800 font-mono">Week-by-Week</span>
          </div>

          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="text-slate-400 uppercase text-[10px] border-b border-amber-100">
                <th class="py-2">Week / Date</th>
                <th class="py-2">Description</th>
                <th class="py-2 text-right">Share (${currency})</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-100">
              ${data.food.length > 0 ? data.food.map(f => `
                <tr>
                  <td class="py-2 font-mono text-slate-600">${f.date}</td>
                  <td class="py-2 font-medium text-slate-800">
                    ${f.title} ${f.is_custom ? '<span class="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">Mid-Week Share</span>' : ''}
                  </td>
                  <td class="py-2 text-right font-bold text-amber-900">${f.amount.toLocaleString()}</td>
                </tr>
              `).join('') : '<tr><td colspan="3" class="py-2 text-slate-400 italic">No food expenses recorded for this month</td></tr>'}
            </tbody>
            <tfoot class="border-t border-amber-200 text-xs font-bold pt-2">
              <tr>
                <td colspan="2" class="py-2 text-slate-600">Total Food Shares (${data.month}):</td>
                <td class="py-2 text-right text-amber-900">${currency} ${data.monthFoodTotal.toLocaleString()}</td>
              </tr>
              ${data.monthFoodPaidTotal > 0 ? `
                <tr>
                  <td colspan="2" class="py-1 text-emerald-600 font-semibold">Food Paid in ${data.month}:</td>
                  <td class="py-1 text-right text-emerald-600 font-bold">- ${currency} ${data.monthFoodPaidTotal.toLocaleString()}</td>
                </tr>
              ` : ''}
              <tr class="border-t border-amber-300">
                <td colspan="2" class="py-2 text-slate-900 font-bold">Current Food Mess Balance:</td>
                <td class="py-2 text-right text-base font-black ${b.food_balance > 0 ? 'text-amber-700' : 'text-emerald-600'}">
                  ${currency} ${b.food_balance.toLocaleString()}
                  ${b.food_balance < 0 ? '<div class="text-[10px] text-emerald-600 font-normal">Advance credit for next week</div>' : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Official Payment Accounts -->
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <p class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Official Payment Accounts</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-2.5 rounded-xl bg-white border border-slate-100">
              <span class="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                <i class="fa-solid fa-building-columns"></i> ${settings.bank_name || 'Bank Transfer'}
              </span>
              <p class="font-bold text-slate-800 text-[11px] mt-1">${settings.account_title || 'Flat Account'}</p>
              <p class="font-mono text-slate-600 text-[11px]">${settings.account_number || '-'}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-white border border-slate-100">
              <span class="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1">
                <i class="fa-solid fa-mobile-screen"></i> JazzCash
              </span>
              <p class="font-bold text-slate-800 text-[11px] mt-1">${settings.jazzcash_title || 'Flat Manager'}</p>
              <p class="font-mono text-slate-700 text-xs font-bold">${settings.jazzcash_number || '-'}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-white border border-slate-100">
              <span class="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                <i class="fa-solid fa-mobile-screen-button"></i> Easypaisa
              </span>
              <p class="font-bold text-slate-800 text-[11px] mt-1">${settings.easypaisa_title || 'Flat Manager'}</p>
              <p class="font-mono text-slate-700 text-xs font-bold">${settings.easypaisa_number || '-'}</p>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 pt-1">
            * Please submit your payment transaction ID / screenshot in the portal under Member ID <strong>${m.unique_id}</strong>.
          </p>
        </div>

        <!-- WhatsApp & Email Action Buttons (Hidden on Print) -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 no-print">
          <div class="flex flex-wrap items-center gap-2">
            <a href="${data.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2">
              <i class="fa-brands fa-whatsapp text-base"></i> Send via WhatsApp
            </a>

            <button type="button" onclick="ReportsView.copyWhatsAppMessage()" class="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
              <i class="fa-regular fa-copy text-sm"></i> Copy WhatsApp Message
            </button>

            ${m.email ? `
              <button onclick="ReportsView.sendEmailInvoice(${m.id}, '${m.name}', '${m.email}')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2">
                <i class="fa-solid fa-paper-plane text-xs"></i> Send via Email
              </button>
            ` : ''}
          </div>

          <button onclick="window.print()" class="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-print"></i> Print Statement (PDF)
          </button>
        </div>
      </div>
    `;
  },

  copyWhatsAppMessage() {
    if (!this.currentInvoiceData?.whatsappText) {
      App.toast('No WhatsApp invoice message to copy', 'error');
      return;
    }
    navigator.clipboard.writeText(this.currentInvoiceData.whatsappText).then(() => {
      App.toast(`Copied ${this.currentInvoiceData.member?.name || 'member'}'s WhatsApp invoice to clipboard!`, 'success');
    }).catch(() => {
      prompt('Copy message text:', this.currentInvoiceData.whatsappText);
    });
  },

  async sendEmailInvoice(memberId, name, email) {
    if (!confirm(`Send official invoice statement for ${this.selectedMonth} to ${name} (${email})?`)) return;
    try {
      App.toast('Sending statement email...', 'info');
      const res = await API.post(`/api/reports/send-email/${memberId}`, { month: this.selectedMonth });
      App.toast(res.message, 'success');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Admin Master Consolidated Statement (All members in one comprehensive document / PDF)
  async renderConsolidatedView(currency, settings) {
    const data = await API.get(`/api/reports/month-consolidated/${this.selectedMonth}`);
    const rows = data.rows || [];
    const t = data.totals || {};

    return `
      <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-8 max-w-[1700px] mx-auto space-y-6">
        <!-- Master Statement Header -->
        <div class="flex items-start justify-between border-b-2 border-slate-200 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-md bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider font-mono">
                Admin Master Document
              </span>
              <span class="text-xs text-slate-400 font-mono">CONFIDENTIAL & OFFICIAL</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 mt-2">${settings.flat_name || 'Flat Management'} - Consolidated Monthly Statement</h1>
            <p class="text-xs text-slate-500 mt-1">Complete financial ledger for all flat members for <strong>${this.selectedMonth}</strong></p>
          </div>
          <div class="text-right text-xs text-slate-500">
            <div>Billing Period: <strong class="text-slate-800 font-bold">${this.selectedMonth}</strong></div>
            <div class="mt-0.5">Generated On: <strong>${new Date().toLocaleDateString()}</strong></div>
            <div class="mt-2 no-print">
              <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5">
                <i class="fa-solid fa-file-pdf"></i> Export / Print Master PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Master Expense Summary Tiles -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Flat Rent</span>
            <span class="text-base font-black text-slate-800 mt-0.5 block">${currency} ${(t.totalFlatRent || 0).toLocaleString()}</span>
          </div>
          <div class="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200">
            <span class="text-[10px] uppercase font-bold text-amber-700 block">⚡ Electricity</span>
            <span class="text-base font-black text-amber-900 mt-0.5 block">${currency} ${(t.totalElectricity || 0).toLocaleString()}</span>
          </div>
          <div class="p-3.5 bg-sky-50/50 rounded-2xl border border-sky-200">
            <span class="text-[10px] uppercase font-bold text-sky-700 block">📶 WiFi</span>
            <span class="text-base font-black text-sky-900 mt-0.5 block">${currency} ${(t.totalWifi || 0).toLocaleString()}</span>
          </div>
          <div class="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200">
            <span class="text-[10px] uppercase font-bold text-emerald-700 block">👨‍🍳 Cook Salary</span>
            <span class="text-base font-black text-emerald-900 mt-0.5 block">${currency} ${(t.totalCook || 0).toLocaleString()}</span>
          </div>
          <div class="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200">
            <span class="text-[10px] uppercase font-bold text-indigo-700 block">Total Bills Due</span>
            <span class="text-base font-black text-indigo-900 mt-0.5 block">${currency} ${(t.totalNetBillsDue || 0).toLocaleString()}</span>
          </div>
          <div class="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200">
            <span class="text-[10px] uppercase font-bold text-purple-700 block">Total Overall Outstanding</span>
            <span class="text-base font-black text-purple-900 mt-0.5 block">${currency} ${(t.totalOverallOutstanding || 0).toLocaleString()}</span>
          </div>
        </div>

        <!-- Master Members Table -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
              <tr>
                <th class="py-3 px-3 font-bold border-r border-slate-200">Member & Room</th>
                <th class="py-3 px-2 text-center border-r border-slate-200">Room Rent</th>
                <th class="py-3 px-2 text-center border-r border-slate-200">Electricity</th>
                <th class="py-3 px-2 text-center border-r border-slate-200">WiFi</th>
                <th class="py-3 px-2 text-center border-r border-slate-200">Cook</th>
                <th class="py-3 px-2 text-center border-r border-slate-200">Other Bills</th>
                <th class="py-3 px-2 text-center border-r border-slate-200 bg-amber-50 text-amber-900">Prior Arrears</th>
                <th class="py-3 px-2 text-center border-r border-slate-200 bg-indigo-50 text-indigo-900 font-bold">Month Bills</th>
                <th class="py-3 px-2 text-center border-r border-slate-200 bg-emerald-50 text-emerald-900 font-bold">Paid</th>
                <th class="py-3 px-3 text-right border-r border-slate-200 font-extrabold text-slate-900">Net Bills Due</th>
                <th class="py-3 px-2 text-center border-r border-slate-200 bg-amber-50 text-amber-900" title="Separate week-to-week mess">Food Mess Due</th>
                <th class="py-3 px-3 text-right font-black text-purple-950">Overall Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${rows.map(r => `
                <tr class="table-row-hover">
                  <td class="py-2.5 px-3 border-r border-slate-100">
                    <span class="font-bold text-slate-900">${r.member.name}</span>
                    <span class="font-mono text-[10px] text-indigo-600 block">${r.member.unique_id} &bull; ${r.member.room_name || 'Outside'}</span>
                  </td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100">${r.member_rent > 0 ? r.member_rent.toLocaleString() : '-'}</td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100">${r.member_electricity > 0 ? r.member_electricity.toLocaleString() : '-'}</td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100">${r.member_wifi > 0 ? r.member_wifi.toLocaleString() : '-'}</td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100">${r.member_cook > 0 ? r.member_cook.toLocaleString() : '-'}</td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100">${r.member_other > 0 ? r.member_other.toLocaleString() : '-'}</td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100 bg-amber-50/30 ${r.prior_arrears !== 0 ? (r.prior_arrears > 0 ? 'text-amber-800 font-bold' : 'text-emerald-700 font-bold') : 'text-slate-300'}">
                    ${r.prior_arrears !== 0 ? r.prior_arrears.toLocaleString() : '-'}
                  </td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100 bg-indigo-50/30 font-bold text-indigo-900">
                    ${r.bills_total.toLocaleString()}
                  </td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100 bg-emerald-50/30 font-bold text-emerald-700">
                    ${r.paid_bills > 0 ? r.paid_bills.toLocaleString() : '-'}
                  </td>
                  <td class="py-2.5 px-3 text-right border-r border-slate-100 font-extrabold ${r.net_bills_due > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                    ${currency} ${r.net_bills_due.toLocaleString()}
                  </td>
                  <td class="py-2.5 px-2 text-center border-r border-slate-100 bg-amber-50/30 font-bold ${r.food_balance > 0 ? 'text-amber-800' : 'text-emerald-700'}">
                    ${r.food_balance !== 0 ? `${currency} ${r.food_balance.toLocaleString()}` : '-'}
                  </td>
                  <td class="py-2.5 px-3 text-right font-black ${r.overall_outstanding > 0 ? 'text-purple-900' : 'text-emerald-600'}">
                    ${currency} ${r.overall_outstanding.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <!-- GRAND TOTALS FOOTER -->
            <tfoot class="bg-slate-200/80 font-black text-slate-900 text-xs border-t-2 border-slate-300">
              <tr>
                <td class="py-3 px-3 uppercase tracking-wider border-r border-slate-300">Grand Totals (${rows.length} Members)</td>
                <td class="py-3 px-2 text-center border-r border-slate-300">${(t.totalFlatRent || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300">${(t.totalElectricity || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300">${(t.totalWifi || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300">${(t.totalCook || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300">${(t.totalOtherBills || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300 text-amber-900">${(t.totalPriorArrears || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300 text-indigo-950">${(t.totalMonthBills || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300 text-emerald-800">${(t.totalBillsPaid || 0).toLocaleString()}</td>
                <td class="py-3 px-3 text-right border-r border-slate-300 text-rose-700">${currency} ${(t.totalNetBillsDue || 0).toLocaleString()}</td>
                <td class="py-3 px-2 text-center border-r border-slate-300 text-amber-900">${currency} ${(t.totalFoodShares || 0).toLocaleString()}</td>
                <td class="py-3 px-3 text-right text-purple-950 text-sm">${currency} ${(t.totalOverallOutstanding || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Official Signatures Block (For Print/PDF Export) -->
        <div class="grid grid-cols-2 gap-8 pt-10 text-xs text-slate-500">
          <div class="border-t border-slate-300 pt-3">
            <p class="font-bold text-slate-800">Prepared & Audited By:</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Flat Manager / Admin</p>
          </div>
          <div class="border-t border-slate-300 pt-3 text-right">
            <p class="font-bold text-slate-800">Verified & Approved By:</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Super Admin / Flat Representative</p>
          </div>
        </div>
      </div>
    `;
  }
};
