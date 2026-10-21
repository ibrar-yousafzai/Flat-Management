// AI & Smart Automation System for Flat Management
const AIAutomation = {
  currentTab: 'parser',

  // Open the main AI Automation Hub modal
  async openHub(defaultTab = 'parser') {
    this.currentTab = defaultTab;
    try {
      const [members, settings, billsData] = await Promise.all([
        API.get('/api/members?status=Active'),
        API.get('/api/settings'),
        API.get(`/api/bills?month=${new Date().toISOString().slice(0, 7)}`)
      ]);

      this.cachedMembers = members || [];
      this.cachedSettings = settings || {};
      this.cachedBillsData = billsData || {};

      this.renderHubModal();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  renderHubModal() {
    const currency = this.cachedSettings.currency_symbol || 'Rs.';

    App.showModal(`
      <div class="space-y-4">
        <!-- AI Hub Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-black text-slate-900">AI Automation Hub</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold border border-violet-200">
                  Smart Assistant
                </span>
              </div>
              <p class="text-xs text-slate-500">Intelligent split calculations, text expense parsing & automated reminders</p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Automation Tab Navigation -->
        <div class="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
          <button onclick="AIAutomation.switchTab('parser')" id="aiTab_parser" class="py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${this.currentTab === 'parser' ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'} cursor-pointer">
            <i class="fa-solid fa-bolt"></i>
            <span class="truncate">Text Parser</span>
          </button>
          <button onclick="AIAutomation.switchTab('splitter')" id="aiTab_splitter" class="py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${this.currentTab === 'splitter' ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'} cursor-pointer">
            <i class="fa-solid fa-scale-balanced"></i>
            <span class="truncate">Mid-Week Split</span>
          </button>
          <button onclick="AIAutomation.switchTab('reminders')" id="aiTab_reminders" class="py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${this.currentTab === 'reminders' ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'} cursor-pointer">
            <i class="fa-brands fa-whatsapp"></i>
            <span class="truncate">Smart Remind</span>
          </button>
        </div>

        <!-- TAB CONTENT CONTAINER -->
        <div id="aiTabContent" class="space-y-4">
          ${this.getTabHtml(this.currentTab)}
        </div>
      </div>
    `, 'max-w-2xl');
  },

  switchTab(tab) {
    this.currentTab = tab;
    const container = document.getElementById('aiTabContent');
    if (container) {
      container.innerHTML = this.getTabHtml(tab);
    }
    // Update active tab buttons
    ['parser', 'splitter', 'reminders'].forEach(t => {
      const btn = document.getElementById(`aiTab_${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 bg-white text-violet-700 shadow-xs font-bold cursor-pointer';
        } else {
          btn.className = 'py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold cursor-pointer';
        }
      }
    });
  },

  getTabHtml(tab) {
    if (tab === 'parser') return this.renderParserTab();
    if (tab === 'splitter') return this.renderSplitterTab();
    if (tab === 'reminders') return this.renderRemindersTab();
    return '';
  },

  // 1. SMART TEXT EXPENSE PARSER
  renderParserTab() {
    return `
      <div class="space-y-3.5">
        <div class="bg-violet-50/60 border border-violet-200/80 rounded-2xl p-3.5 space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-bold text-violet-900">
            <i class="fa-solid fa-wand-magic-sparkles text-violet-600"></i>
            <span>Type or Paste Raw Expense Text</span>
          </div>
          <p class="text-[11px] text-violet-700 leading-relaxed">
            The AI engine automatically detects the <strong>amount</strong>, <strong>category</strong>, <strong>expense title</strong>, and <strong>date</strong>, then populates your bill or food mess form with 1 click!
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 uppercase">Input Text or WhatsApp Message</label>
          <textarea id="aiRawInput" rows="3" placeholder="e.g. Paid Rs. 4,500 electricity K-Electric on 20 Oct for Flat 3, or Bought chicken vegetables Rs. 3,200 for week 2 mess" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"></textarea>
        </div>

        <!-- Quick Sample Chips -->
        <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span class="text-slate-400 font-semibold">Try sample:</span>
          <button type="button" onclick="AIAutomation.applySample('Paid Rs. 14,500 electricity bill via Meezan app on 20 Oct for flat')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer">⚡ Electricity Rs. 14,500</button>
          <button type="button" onclick="AIAutomation.applySample('Weekly grocery chicken, rice, oil and vegetables Rs. 4,200')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer">🍗 Food Mess Rs. 4,200</button>
          <button type="button" onclick="AIAutomation.applySample('Paid PTCL internet wifi bill Rs. 3,500')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer">📶 WiFi Rs. 3,500</button>
        </div>

        <button type="button" onclick="AIAutomation.parseExpenseText()" class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>Auto-Detect & Parse Expense</span>
        </button>

        <!-- Parsed Results Preview Card -->
        <div id="aiParsedResult" class="hidden space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
          <div class="flex items-center justify-between border-b pb-2">
            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Parsed Details</span>
            <span id="aiParsedConfidence" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">100% Match</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">Expense Title</span>
              <span id="resTitle" class="font-bold text-slate-800 block mt-0.5 truncate">-</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">Detected Amount</span>
              <span id="resAmount" class="font-black text-violet-700 font-mono block mt-0.5 text-sm">Rs. 0</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">Category</span>
              <span id="resCategory" class="font-bold text-slate-700 block mt-0.5 capitalize">-</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">Suggested Target</span>
              <span id="resTarget" class="font-bold text-indigo-700 block mt-0.5">-</span>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-1 border-t border-slate-200">
            <button id="aiApplyActionBtn" type="button" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
              <i class="fa-solid fa-arrow-right"></i> Pre-Fill Form
            </button>
          </div>
        </div>
      </div>
    `;
  },

  applySample(text) {
    const input = document.getElementById('aiRawInput');
    if (input) {
      input.value = text;
      this.parseExpenseText();
    }
  },

  parseExpenseText() {
    const raw = (document.getElementById('aiRawInput')?.value || '').trim();
    if (!raw) {
      App.toast('Please enter some text to parse', 'error');
      return;
    }

    // AI Heuristic Extractor:
    // 1. Amount: look for Rs. X, PKR X, or numbers like 14,500 / 3000
    const amtMatch = raw.match(/(?:rs\.?|pkr|amount|paid)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
    let amount = 0;
    if (amtMatch) {
      amount = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
    }

    // 2. Category & Target detection
    const lower = raw.toLowerCase();
    let isFood = lower.includes('food') || lower.includes('grocery') || lower.includes('mess') || lower.includes('chicken') || lower.includes('vegetable') || lower.includes('rice') || lower.includes('meat') || lower.includes('oil');
    let category = 'utility';
    let title = 'Expense';

    if (isFood) {
      category = 'food';
      title = 'Weekly Grocery Mess';
      if (lower.includes('chicken')) title = 'Chicken & Grocery Mess';
    } else if (lower.includes('electric') || lower.includes('k-electric') || lower.includes('bijli') || lower.includes('wapda')) {
      category = 'utility';
      title = 'Electricity Bill';
    } else if (lower.includes('wifi') || lower.includes('internet') || lower.includes('ptcl') || lower.includes('stormfiber') || lower.includes('nayatel')) {
      category = 'utility';
      title = 'WiFi & Internet';
    } else if (lower.includes('gas') || lower.includes('sui')) {
      category = 'utility';
      title = 'Gas Bill';
    } else if (lower.includes('cook') || lower.includes('maid') || lower.includes('salary') || lower.includes('clean')) {
      category = 'salary';
      title = 'Cook / Cleaning Staff Salary';
    } else if (lower.includes('rent')) {
      category = 'rent';
      title = 'Flat / Room Rent';
    } else {
      title = raw.slice(0, 30);
    }

    // Show results in UI
    const resBox = document.getElementById('aiParsedResult');
    if (resBox) {
      resBox.classList.remove('hidden');
      document.getElementById('resTitle').textContent = title;
      document.getElementById('resAmount').textContent = `Rs. ${amount.toLocaleString()}`;
      document.getElementById('resCategory').textContent = category;
      document.getElementById('resTarget').textContent = isFood ? 'Weekly Food Mess' : 'Monthly Flat Bills';

      const actionBtn = document.getElementById('aiApplyActionBtn');
      if (actionBtn) {
        actionBtn.onclick = () => {
          App.closeModal();
          if (isFood) {
            App.navigate('food');
            setTimeout(() => {
              FoodView.openCreateModal();
              setTimeout(() => {
                const titleEl = document.getElementById('newFoodTitle');
                const totalEl = document.getElementById('foodTotalPool');
                if (titleEl) titleEl.value = title;
                if (totalEl) {
                  totalEl.value = amount;
                  FoodView.handleTotalPoolInput();
                }
              }, 100);
            }, 100);
          } else {
            App.navigate('bills');
            setTimeout(async () => {
              const [rooms, members] = await Promise.all([
                API.get('/api/rooms'),
                API.get('/api/members?status=Active')
              ]);
              BillsView.openCreateBillModal(rooms, members);
              setTimeout(() => {
                const titleEl = document.getElementById('newBillTitle');
                const amtEl = document.getElementById('newBillAmount');
                const catEl = document.getElementById('newBillCategory');
                if (titleEl) titleEl.value = title;
                if (amtEl) amtEl.value = amount;
                if (catEl) catEl.value = category;
              }, 100);
            }, 100);
          }
          App.toast(`Auto-filled ${title} (Rs. ${amount})!`, 'success');
        };
      }
    }
  },

  // 2. MID-WEEK ARRIVALS & CUSTOM PRO-RATA SPLITTER
  renderSplitterTab() {
    const members = this.cachedMembers || [];
    return `
      <div class="space-y-3.5">
        <div class="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-bold text-blue-900">
            <i class="fa-solid fa-scale-balanced text-blue-600"></i>
            <span>Mid-Week Pro-Rata Calculator</span>
          </div>
          <p class="text-[11px] text-blue-700 leading-relaxed">
            When flatmates join mid-week (e.g. stayed 3 days out of 7), AI automatically distributes the grocery mess pool proportionally so no one pays unfair shares!
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Total Grocery Pool (Rs.)</label>
            <input type="number" id="splitPoolAmount" value="36000" oninput="AIAutomation.recalculateProRata()" class="w-full px-3 py-2 text-sm border rounded-xl font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Total Cycle Days</label>
            <input type="number" id="splitCycleDays" value="7" min="1" max="31" oninput="AIAutomation.recalculateProRata()" class="w-full px-3 py-2 text-sm border rounded-xl font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <!-- Members Attendance Slider Matrix -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Member Days in Flat (Slide to adjust)</span>
            <span id="totalMemberDaysLabel" class="text-blue-600 font-mono">Total Days: 84</span>
          </div>

          <div class="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 divide-y divide-slate-100 bg-slate-50 text-xs">
            ${members.map(m => `
              <div class="py-2 flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-slate-800 truncate">${m.name}</div>
                  <div class="text-[10px] text-slate-400">${m.room_name || 'Outside'}</div>
                </div>

                <div class="flex items-center gap-2">
                  <input type="range" id="daysRange_${m.id}" min="0" max="7" value="7" oninput="AIAutomation.onMemberDaysChange(${m.id}, this.value)" class="w-20 accent-blue-600 cursor-pointer" />
                  <span id="daysVal_${m.id}" class="text-[11px] font-bold font-mono text-slate-700 w-9 text-right">7 d</span>
                  <div class="w-20 text-right font-mono font-bold text-blue-700" id="shareVal_${m.id}">Rs. 3,000</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <button type="button" onclick="AIAutomation.applyProRataToFoodForm()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <i class="fa-solid fa-check"></i>
          <span>Apply Calculated Shares to Weekly Mess</span>
        </button>
      </div>
    `;
  },

  onMemberDaysChange(memberId, val) {
    const lbl = document.getElementById(`daysVal_${memberId}`);
    if (lbl) lbl.textContent = `${val} d`;
    this.recalculateProRata();
  },

  recalculateProRata() {
    const members = this.cachedMembers || [];
    const pool = parseFloat(document.getElementById('splitPoolAmount')?.value) || 0;
    const cycleDays = parseInt(document.getElementById('splitCycleDays')?.value) || 7;

    let totalDays = 0;
    const memberDaysMap = {};
    members.forEach(m => {
      const slider = document.getElementById(`daysRange_${m.id}`);
      const days = slider ? parseInt(slider.value) : cycleDays;
      memberDaysMap[m.id] = days;
      totalDays += days;
    });

    const totalDaysLabel = document.getElementById('totalMemberDaysLabel');
    if (totalDaysLabel) totalDaysLabel.textContent = `Total Days: ${totalDays}`;

    if (totalDays === 0) return;

    this.calculatedShares = {};
    members.forEach(m => {
      const days = memberDaysMap[m.id];
      const share = Math.round((days / totalDays) * pool);
      this.calculatedShares[m.id] = share;
      const shareEl = document.getElementById(`shareVal_${m.id}`);
      if (shareEl) shareEl.textContent = `Rs. ${share.toLocaleString()}`;
    });
  },

  applyProRataToFoodForm() {
    this.recalculateProRata();
    const shares = this.calculatedShares || {};
    App.closeModal();
    App.navigate('food');
    setTimeout(() => {
      FoodView.openCreateModal();
      setTimeout(() => {
        Object.keys(shares).forEach(memId => {
          const input = document.getElementById(`memberShare_${memId}`);
          if (input) {
            input.value = shares[memId];
            input.setAttribute('data-is-custom', 'true');
            const badge = document.getElementById(`customBadge_${memId}`);
            if (badge) badge.classList.remove('hidden');
          }
        });
        FoodView.recalculateFromMemberShares();
        App.toast('Applied pro-rata calculated shares!', 'success');
      }, 100);
    }, 100);
  },

  // 3. AI BILINGUAL WHATSAPP REMINDER GENERATOR
  renderRemindersTab() {
    const members = this.cachedMembers || [];
    const settings = this.cachedSettings || {};
    return `
      <div class="space-y-3.5">
        <div class="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <i class="fa-brands fa-whatsapp text-emerald-600 text-sm"></i>
            <span>AI Multi-Tone WhatsApp Composer</span>
          </div>
          <p class="text-[11px] text-emerald-700 leading-relaxed">
            Generate respectful, culturally tuned Urdu/English messages with flat bank details and direct receipt upload links in 1 click!
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Select Member</label>
            <select id="aiRemindMember" onchange="AIAutomation.generateReminderText()" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold">
              ${members.map(m => `<option value="${m.id}">${m.name} (${m.unique_id}) - Due: Rs. ${(m.outstanding_balance || 0).toLocaleString()}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tone & Urgency</label>
            <select id="aiRemindTone" onchange="AIAutomation.generateReminderText()" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold">
              <option value="polite">🌸 Friendly & Polite (Standard)</option>
              <option value="urgent">⚡ Urgent / Overdue Notice</option>
              <option value="food_only">🍲 Weekly Grocery Mess Specific</option>
              <option value="broadcast">📢 Flat Group Broadcast</option>
            </select>
          </div>
        </div>

        <!-- Generated Message Preview -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Message Preview</span>
            <span class="text-[10px] text-emerald-600 font-mono">Ready to dispatch</span>
          </div>
          <textarea id="aiMessagePreview" rows="6" class="w-full p-3 text-xs font-mono border border-slate-300 rounded-2xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed text-slate-800"></textarea>
        </div>

        <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button type="button" onclick="AIAutomation.copyReminderToClipboard()" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <i class="fa-regular fa-copy"></i> Copy Text
          </button>
          <button type="button" onclick="AIAutomation.dispatchWhatsApp()" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
            <i class="fa-brands fa-whatsapp text-sm"></i> Open WhatsApp
          </button>
        </div>
      </div>
    `;
  },

  generateReminderText() {
    const memId = document.getElementById('aiRemindMember')?.value;
    const tone = document.getElementById('aiRemindTone')?.value || 'polite';
    const member = (this.cachedMembers || []).find(m => String(m.id) === String(memId)) || this.cachedMembers?.[0];
    const settings = this.cachedSettings || {};
    const flatName = settings.flat_name || 'Flat Management';
    const bankDetails = settings.bank_details || 'Ask admin for JazzCash / Meezan account';
    const dueAmount = (member?.outstanding_balance || 0).toLocaleString();

    let text = '';
    if (tone === 'polite') {
      text = `*🏢 Flat Dues Friendly Reminder*\n` +
        `*Flat:* ${flatName}\n\n` +
        `Assalam-o-Alaikum *${member?.name || 'Brother'}*,\n\n` +
        `Hope you are having a productive day. This is a gentle notification that your current outstanding flat balance is *Rs. ${dueAmount}*.\n\n` +
        `💳 *Account Details for Transfer:*\n${bankDetails}\n\n` +
        `📄 *View Invoice Statement:* ${window.location.origin}/#reports\n` +
        `After transferring, please upload your payment receipt proof in your member portal.\n\n` +
        `JazakAllah Khair!`;
    } else if (tone === 'urgent') {
      text = `*⚠️ URGENT: Flat Dues Overdue Notice*\n` +
        `*Flat:* ${flatName}\n\n` +
        `Dear *${member?.name || 'Brother'}* (${member?.unique_id || ''}),\n\n` +
        `Your outstanding dues of *Rs. ${dueAmount}* are currently overdue. As monthly utility bills and flat expenses must be settled strictly on time, please clear your pending dues today.\n\n` +
        `💳 *Payment Details:*\n${bankDetails}\n\n` +
        `Kindly share the screenshot proof immediately upon transfer.\n` +
        `Thank you for your cooperation!`;
    } else if (tone === 'food_only') {
      text = `*🍲 Flat Mess Food Grocery Reminder*\n` +
        `*Flat:* ${flatName}\n\n` +
        `Assalam-o-Alaikum *${member?.name || 'Brother'}*,\n\n` +
        `Weekly food mess groceries are settled week-by-week so supplies continue smoothly. Your current food mess due is *Rs. ${dueAmount}*.\n\n` +
        `Please clear this amount so next week's groceries can be purchased on schedule.\n` +
        `Thank you!`;
    } else {
      text = `*📢 Flat Management Notice*\n` +
        `*Flat:* ${flatName}\n\n` +
        `Dear Flatmates,\n` +
        `Monthly billing and weekly grocery mess statements have been updated on the portal. Please log into your member portal to review your invoice and submit payment proofs.\n\n` +
        `🌐 *Portal Link:* ${window.location.origin}\n` +
        `Let us maintain our flat responsibilities together. Thank you!`;
    }

    const preview = document.getElementById('aiMessagePreview');
    if (preview) preview.value = text;
  },

  copyReminderToClipboard() {
    const text = document.getElementById('aiMessagePreview')?.value || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      App.toast('Copied AI message to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy message text:', text);
    });
  },

  dispatchWhatsApp() {
    const memId = document.getElementById('aiRemindMember')?.value;
    const member = (this.cachedMembers || []).find(m => String(m.id) === String(memId));
    const text = document.getElementById('aiMessagePreview')?.value || '';
    if (!text) return;

    let phone = member?.whatsapp || member?.phone || '';
    phone = String(phone).replace(/[^0-9]/g, '');
    if (phone.startsWith('03')) phone = '92' + phone.slice(1);

    if (!phone) {
      this.copyReminderToClipboard();
      App.toast(`No phone number found for ${member?.name}. Copied text to clipboard!`, 'info');
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    App.toast(`Opened WhatsApp chat for ${member?.name}!`, 'success');
  }
};