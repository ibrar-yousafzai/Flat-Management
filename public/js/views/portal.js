// Member Self-Service Portal View - Clean Telco/Fintech Design
const PortalView = {
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
      const totalCombinedDue = Math.max(0, (b.bills_balance || 0) + (b.food_balance || 0));

      // Real-time online Date computation
      const currentMonth = settings.active_month || App.getDefaultMonth();
      const dueDay = parseInt(settings.monthly_bills_due_day || '10', 10);
      const now = new Date();
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dueDate = `${String(dueDay).padStart(2, '0')} ${monthNamesShort[now.getMonth()]} ${now.getFullYear()}`;
      const isPaid = totalCombinedDue <= 0;

      return `
        <div class="space-y-4 max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto pb-12">
          <!-- 1. Hero Status Card (Deep Cobalt Blue Gradient with Circular Gauge) -->
          <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
            <div class="flex items-center gap-4 sm:gap-6 relative z-10">
              <!-- Left: Circular Gauge Indicator -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 ${isPaid ? 'border-emerald-400/50 bg-emerald-500/20' : 'border-amber-400/50 bg-amber-500/20'} flex flex-col items-center justify-center text-center shrink-0 backdrop-blur-xs shadow-inner">
                <span class="text-xs sm:text-sm font-black ${isPaid ? 'text-emerald-300' : 'text-amber-300'}">
                  ${isPaid ? 'Cleared ✓' : 'Pending'}
                </span>
                <span class="text-[9px] text-blue-200 mt-0.5">${monthNamesShort[now.getMonth()]} ${now.getFullYear()}</span>
              </div>

              <!-- Right: Flat & Account Details -->
              <div class="space-y-1.5 min-w-0">
                <h2 class="text-base sm:text-xl font-black tracking-tight leading-tight">${settings.flat_name || 'Flat Management'}</h2>
                <div class="space-y-1 text-xs text-blue-100">
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-door-closed text-blue-300 w-3.5 text-center"></i>
                    <span class="truncate font-semibold">${m.room_name || 'Outside Member'} &bull; ${m.unique_id}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-calendar-check text-blue-300 w-3.5 text-center"></i>
                    <span>Active Period: ${App.formatMonth(currentMonth)}</span>
                  </div>
                  ${m.security_deposit > 0 ? `
                    <div class="flex items-center gap-2 text-emerald-300">
                      <i class="fa-solid fa-shield-halved w-3.5 text-center"></i>
                      <span>Deposit Held: ${currency} ${m.security_deposit.toLocaleString()}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 3 Warm Peach Metric Cards in a Clean Row -->
          <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
            <!-- Card 1: Monthly Bills -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 text-center flex flex-col justify-between shadow-xs">
              <div>
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                  <i class="fa-solid fa-gauge-high"></i>
                </div>
                <p class="text-[11px] font-bold text-slate-700">Bills Due</p>
                <p class="text-xs sm:text-sm font-black text-orange-600 mt-0.5">${currency} ${(b.bills_balance || 0).toLocaleString()}</p>
              </div>
              <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'bills')" class="mt-2.5 w-full py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all">
                Pay Bills
              </button>
            </div>

            <!-- Card 2: Weekly Food Mess -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 text-center flex flex-col justify-between shadow-xs">
              <div>
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                  <i class="fa-solid fa-utensils"></i>
                </div>
                <p class="text-[11px] font-bold text-slate-700">Food Mess</p>
                <p class="text-xs sm:text-sm font-black text-orange-600 mt-0.5">${currency} ${(b.food_balance || 0).toLocaleString()}</p>
              </div>
              <button onclick="PortalView.openSubmitPaymentModal(${m.id}, 'food')" class="mt-2.5 w-full py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all">
                Pay Food
              </button>
            </div>

            <!-- Card 3: Carry Forward / Statement -->
            <div class="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 text-center flex flex-col justify-between shadow-xs">
              <div>
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-sm mb-1.5">
                  <i class="fa-solid fa-arrow-turn-down-right"></i>
                </div>
                <p class="text-[11px] font-bold text-slate-700">Deposit</p>
                <p class="text-xs sm:text-sm font-black text-orange-600 mt-0.5">${currency} ${(m.security_deposit || 0).toLocaleString()}</p>
              </div>
              <button onclick="App.navigate('reports')" class="mt-2.5 w-full py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all">
                Statement
              </button>
            </div>
          </div>

          <!-- 3. PAYMENT Card (Exact Layout from Screenshot) -->
          <div class="bg-white rounded-2xl border border-blue-100 card-shadow p-4 sm:p-5 space-y-3.5">
            <h3 class="text-xs font-black text-blue-700 uppercase tracking-wider">PAYMENT</h3>
            
            <div class="grid grid-cols-3 gap-2 text-left pb-1">
              <!-- Net Payable -->
              <div>
                <p class="text-base sm:text-xl font-black text-slate-900">${currency} ${totalCombinedDue.toLocaleString()}</p>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">Net Payable</span>
              </div>
              <!-- Due Date -->
              <div>
                <p class="text-xs sm:text-sm font-bold text-slate-800">${dueDate}</p>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">Due Date</span>
              </div>
              <!-- Payment Status -->
              <div>
                <p class="text-xs sm:text-sm font-black ${isPaid ? 'text-emerald-600' : 'text-amber-600'} uppercase">${isPaid ? 'PAID' : 'DUE'}</p>
                <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">Payment Status</span>
              </div>
            </div>

            <!-- Big Blue Primary Action Button -->
            <button onclick="PortalView.openSubmitPaymentModal(${m.id})" class="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-credit-card"></i> PAY BILL ONLINE
            </button>
          </div>

          <!-- 4. Get Help & Quick Actions (Circular Icons Row) -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-4 sm:p-5 space-y-3">
            <h3 class="text-xs sm:text-sm font-bold text-slate-900">Get Help & Quick Actions</h3>
            <div class="flex items-center justify-around gap-2 pt-1">
              <!-- WhatsApp Contact -->
              <button onclick="PortalView.openWhatsAppManager('${settings.whatsapp_contact || settings.jazzcash_number || ''}', '${m.name}', '${m.unique_id}')" class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-brands fa-whatsapp"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">WhatsApp</span>
              </button>

              <!-- Official PDF Invoice -->
              <button onclick="App.navigate('reports')" class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-solid fa-file-pdf"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">Invoice PDF</span>
              </button>

              <!-- Bank Accounts Modal -->
              <button onclick="PortalView.openBankAccountsModal()" class="flex flex-col items-center gap-1.5 group">
                <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-solid fa-building-columns"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">Accounts</span>
              </button>

              <!-- Payment Proof Claim -->
              <button onclick="PortalView.openSubmitPaymentModal(${m.id})" class="flex flex-col items-center gap-1.5 group relative">
                <span class="absolute -top-1 right-0 px-1.5 py-0.2 bg-rose-600 text-white text-[8px] font-black rounded-full shadow-2xs">New</span>
                <div class="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                  <i class="fa-solid fa-receipt"></i>
                </div>
                <span class="text-[11px] font-semibold text-slate-700">Claim Proof</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">Error loading your portal: ${err.message}</div>`;
    }
  },

  // Open Official Bank Accounts Modal (Clean popup instead of dumping on home page)
  async openBankAccountsModal() {
    let settings = {};
    try { settings = await API.get('/api/settings'); } catch (e) {}

    const bankName = settings.bank_name || 'Meezan Bank';
    const accTitle = settings.account_title || 'Flat Manager Account';
    const accNumber = settings.account_number || '0101-0105892341';
    const iban = settings.iban || '';
    const jazzcash = settings.jazzcash_number || '0300-1234567';
    const easypaisa = settings.easypaisa_number || '0345-1234567';

    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
              <i class="fa-solid fa-building-columns"></i>
            </div>
            <h3 class="text-base font-black text-slate-900">Official Payment Accounts</h3>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 text-sm"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="space-y-2.5 text-xs">
          <!-- 1. Bank Account -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold text-blue-600">${bankName}</span>
              <button onclick="PortalView.copyToClipboard('${accNumber}', 'Account Number')" class="px-2 py-0.5 bg-white text-slate-700 border text-[10px] font-bold rounded-md hover:bg-slate-50">
                <i class="fa-regular fa-copy"></i> Copy
              </button>
            </div>
            <p class="font-bold text-slate-800">${accTitle}</p>
            <p class="font-mono text-xs font-bold text-slate-900 select-all">${accNumber}</p>
            ${iban ? `<p class="font-mono text-[10px] text-slate-500 truncate">IBAN: ${iban}</p>` : ''}
          </div>

          <!-- 2. JazzCash -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span class="text-[10px] uppercase font-bold text-amber-600">JazzCash</span>
              <p class="font-bold text-slate-800">${settings.jazzcash_title || 'Flat Manager'}</p>
              <p class="font-mono text-xs font-bold text-slate-900 mt-0.5">${jazzcash}</p>
            </div>
            <button onclick="PortalView.copyToClipboard('${jazzcash.replace(/-/g, '')}', 'JazzCash Number')" class="px-2 py-0.5 bg-white text-slate-700 border text-[10px] font-bold rounded-md hover:bg-slate-50">
              <i class="fa-regular fa-copy"></i> Copy
            </button>
          </div>

          <!-- 3. Easypaisa -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span class="text-[10px] uppercase font-bold text-emerald-600">Easypaisa</span>
              <p class="font-bold text-slate-800">${settings.easypaisa_title || 'Flat Manager'}</p>
              <p class="font-mono text-xs font-bold text-slate-900 mt-0.5">${easypaisa}</p>
            </div>
            <button onclick="PortalView.copyToClipboard('${easypaisa.replace(/-/g, '')}', 'Easypaisa Number')" class="px-2 py-0.5 bg-white text-slate-700 border text-[10px] font-bold rounded-md hover:bg-slate-50">
              <i class="fa-regular fa-copy"></i> Copy
            </button>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <button onclick="App.closeModal()" class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs">
            Done
          </button>
        </div>
      </div>
    `);
  },

  openWhatsAppManager(phone, name, code) {
    const cleanPhone = (phone || '03001234567').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hi Flat Manager, I am ${name} (${code}). Regarding flat bills / payments.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
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
            <select id="claimFor" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold">
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
            <button type="submit" class="px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 shadow-sm">Submit Claim</button>
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
