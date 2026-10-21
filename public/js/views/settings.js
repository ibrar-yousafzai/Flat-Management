// Settings View with Super Admin SMTP & WhatsApp Configuration
const SettingsView = {
  currentTab: 'general', // 'general', 'bank', 'email', 'security'

  switchTab(tab) {
    this.currentTab = tab;
    App.refresh();
  },

  async render() {
    try {
      const isSuperAdmin = App.currentUser?.role === 'super_admin';
      const settings = await API.get('/api/settings');

      if (!isSuperAdmin) {
        // LIMITED SUB-ADMIN SETTINGS VIEW
        return `
          <div class="space-y-4 max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto pb-12">
            <!-- Top Breadcrumb & Action Toolbar -->
            <div class="flex items-center justify-between pb-1">
              <button onclick="App.goBack()" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-all active:scale-95">
                <i class="fa-solid fa-arrow-left text-slate-600"></i>
                <span>Back to Dashboard</span>
              </button>
            </div>

            <!-- Banner -->
            <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 text-white shadow-md">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white mb-1">
                <i class="fa-solid fa-user-gear"></i> Sub-Admin Profile
              </span>
              <h1 class="text-lg sm:text-xl font-black">Admin Account & Reference</h1>
              <p class="text-xs text-blue-100 mt-0.5">Manage your password and view official flat payment accounts</p>
            </div>

            <!-- Change Password Card -->
            <form onsubmit="SettingsView.changeSubAdminPassword(event)" class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-4">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-key text-blue-600"></i> Change Your Password
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Current Password *</label>
                  <input type="password" id="subCurrentPass" required class="w-full px-3 py-2 text-xs border rounded-xl outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">New Password *</label>
                  <input type="password" id="subNewPass" required minlength="4" class="w-full px-3 py-2 text-xs border rounded-xl outline-none" />
                </div>
              </div>
              <div class="flex justify-end pt-2">
                <button type="submit" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow">
                  Update Password
                </button>
              </div>
            </form>

            <!-- Read-only Banking Reference -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-3">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-building-columns text-blue-600"></i> Official Flat Bank Accounts
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div class="p-3 bg-slate-50 rounded-2xl border">
                  <span class="text-[10px] uppercase font-bold text-blue-600">Bank</span>
                  <div class="font-bold text-xs mt-0.5">${settings.bank_name || '-'}</div>
                  <div class="font-mono text-xs text-slate-600">${settings.account_number || '-'}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-2xl border">
                  <span class="text-[10px] uppercase font-bold text-amber-600">JazzCash</span>
                  <div class="font-bold text-xs mt-0.5">${settings.jazzcash_title || '-'}</div>
                  <div class="font-mono text-xs text-slate-700 font-bold">${settings.jazzcash_number || '-'}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-2xl border">
                  <span class="text-[10px] uppercase font-bold text-emerald-600">Easypaisa</span>
                  <div class="font-bold text-xs mt-0.5">${settings.easypaisa_title || '-'}</div>
                  <div class="font-mono text-xs text-slate-700 font-bold">${settings.easypaisa_number || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // FULL SUPER ADMIN SETTINGS VIEW WITH ORGANIZED TABS
      return `
        <div class="space-y-4 max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto pb-12">
          <!-- Top Breadcrumb & Action Toolbar -->
          <div class="flex items-center justify-between pb-1">
            <button onclick="App.goBack()" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-all active:scale-95">
              <i class="fa-solid fa-arrow-left text-slate-600"></i>
              <span>Back to Dashboard</span>
            </button>
            <button onclick="document.getElementById('saveSettingsBtn').click()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-2xs transition-all flex items-center gap-1.5 active:scale-95">
              <i class="fa-solid fa-check text-xs"></i> <span>Save Changes</span>
            </button>
          </div>

          <!-- Section Banner Card -->
          <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div class="flex items-center justify-between relative z-10">
              <div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 mb-1">
                  <i class="fa-solid fa-sliders"></i> Configuration
                </span>
                <h1 class="text-lg sm:text-xl font-black tracking-tight">Flat & System Settings</h1>
                <p class="text-xs text-blue-100 mt-0.5">Manage banking, notifications, rules, and admin preferences</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-xl shrink-0">
                <i class="fa-solid fa-gear"></i>
              </div>
            </div>
          </div>

          <!-- Smart Segmented Settings Tabs -->
          <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto">
            <button type="button" onclick="SettingsView.switchTab('general')" class="flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${this.currentTab === 'general' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-building"></i> General
            </button>
            <button type="button" onclick="SettingsView.switchTab('bank')" class="flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${this.currentTab === 'bank' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-building-columns"></i> Bank & Accounts
            </button>
            <button type="button" onclick="SettingsView.switchTab('email')" class="flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${this.currentTab === 'email' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-envelope"></i> Email (SMTP)
            </button>
            <button type="button" onclick="SettingsView.switchTab('security')" class="flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${this.currentTab === 'security' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-shield-halved"></i> Security
            </button>
          </div>

          <!-- Main Configuration Form -->
          <form onsubmit="SettingsView.saveSettings(event)" class="space-y-4">
            <!-- TAB 1: GENERAL & FLAT RULES -->
            <div class="${this.currentTab === 'general' ? 'block' : 'hidden'} space-y-4">
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-4">
                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-building text-blue-600"></i> Property & Flat Information
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Property / Flat Title *</label>
                    <input type="text" id="setFlatName" value="${settings.flat_name || ''}" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">WhatsApp Country Code</label>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-slate-400">+</span>
                      <input type="text" id="setWACode" value="${settings.whatsapp_country_code || '92'}" placeholder="92" maxlength="4" class="w-24 px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold" />
                      <span class="text-xs text-slate-500">e.g. 92</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-4">
                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-calendar-check text-purple-600"></i> Due Dates & Privacy Rules
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Monthly Bills Due Day *</label>
                    <select id="setDueDay" class="w-full px-3 py-2 text-xs border rounded-xl outline-none font-bold">
                      ${[1, 5, 7, 10, 15, 20, 25].map(d => `<option value="${d}" ${String(settings.monthly_bills_due_day || '10') === String(d) ? 'selected' : ''}>Day ${d} of each month</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Weekly Food Due Day</label>
                    <select id="setFoodDueDay" class="w-full px-3 py-2 text-xs border rounded-xl outline-none font-bold">
                      ${['Sunday', 'Monday', 'Friday', 'Saturday'].map(day => `<option value="${day}" ${(settings.weekly_food_due_day || 'Sunday') === day ? 'selected' : ''}>Every ${day}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Inactivity Timeout</label>
                    <select id="setTimeoutMinutes" class="w-full px-3 py-2 text-xs border rounded-xl outline-none font-bold">
                      <option value="5" ${(settings.session_timeout_minutes || '15') === '5' ? 'selected' : ''}>5 Minutes</option>
                      <option value="15" ${(settings.session_timeout_minutes || '15') === '15' ? 'selected' : ''}>15 Minutes</option>
                      <option value="30" ${(settings.session_timeout_minutes || '15') === '30' ? 'selected' : ''}>30 Minutes</option>
                    </select>
                  </div>
                </div>

                <div class="pt-2">
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Flat Expense Totals Visibility</label>
                  <select id="setShowFlatTotals" class="w-full px-3 py-2 text-xs border rounded-xl outline-none font-bold">
                    <option value="true" ${(settings.show_flat_totals_to_members || 'true') === 'true' ? 'selected' : ''}>Show Flat Total Costs to Members (e.g. Total electricity Rs 24,000)</option>
                    <option value="false" ${(settings.show_flat_totals_to_members || 'true') === 'false' ? 'selected' : ''}>Hide Flat Totals (Members only see their personal share)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- TAB 2: BANK & PAYMENT ACCOUNTS -->
            <div class="${this.currentTab === 'bank' ? 'block' : 'hidden'} space-y-4">
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-4">
                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-building-columns text-blue-600"></i> Official Bank Details
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Bank Name</label>
                    <input type="text" id="setBankName" value="${settings.bank_name || ''}" placeholder="e.g. Meezan Bank" class="w-full px-3 py-2 text-xs border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Account Title</label>
                    <input type="text" id="setAccountTitle" value="${settings.account_title || ''}" placeholder="e.g. Flat Manager" class="w-full px-3 py-2 text-xs border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Account Number</label>
                    <input type="text" id="setAccountNumber" value="${settings.account_number || ''}" placeholder="0101-123456789" class="w-full px-3 py-2 text-xs border rounded-xl outline-none font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">IBAN</label>
                    <input type="text" id="setIban" value="${settings.iban || ''}" placeholder="PK36MEZN..." class="w-full px-3 py-2 text-xs border rounded-xl outline-none font-mono uppercase" />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div class="p-3.5 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] space-y-2">
                    <span class="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5"><i class="fa-solid fa-mobile-screen"></i> JazzCash</span>
                    <input type="text" id="setJcTitle" value="${settings.jazzcash_title || ''}" placeholder="Account Title" class="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl outline-none" />
                    <input type="text" id="setJcNumber" value="${settings.jazzcash_number || ''}" placeholder="0300-1234567" class="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl outline-none font-mono font-bold" />
                  </div>
                  <div class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <span class="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5"><i class="fa-solid fa-mobile-screen-button"></i> Easypaisa</span>
                    <input type="text" id="setEpTitle" value="${settings.easypaisa_title || ''}" placeholder="Account Title" class="w-full px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl outline-none" />
                    <input type="text" id="setEpNumber" value="${settings.easypaisa_number || ''}" placeholder="0345-1234567" class="w-full px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl outline-none font-mono font-bold" />
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: EMAIL (SMTP) -->
            <div class="${this.currentTab === 'email' ? 'block' : 'hidden'} space-y-4">
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-envelope text-blue-600"></i> SMTP Server Configuration
                  </h3>
                  <button type="button" onclick="SettingsView.testSmtpConnection()" class="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-all border border-blue-200">
                    <i class="fa-solid fa-vial"></i> Test Email
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span class="font-bold text-slate-600">Presets:</span>
                  <button type="button" onclick="SettingsView.applySmtpPreset('gmail')" class="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 rounded-lg font-bold">
                    Gmail
                  </button>
                  <button type="button" onclick="SettingsView.applySmtpPreset('outlook')" class="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 rounded-lg font-bold">
                    Outlook
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">SMTP Host</label>
                    <input type="text" id="setSmtpHost" value="${settings.smtp_host || 'smtp.gmail.com'}" class="w-full px-3 py-2 text-xs border rounded-xl font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">SMTP Port</label>
                    <input type="number" id="setSmtpPort" value="${settings.smtp_port || 587}" class="w-full px-3 py-2 text-xs border rounded-xl font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Security</label>
                    <select id="setSmtpSecure" class="w-full px-3 py-2 text-xs border rounded-xl">
                      <option value="false" ${settings.smtp_secure !== 'true' ? 'selected' : ''}>TLS / STARTTLS (Port 587)</option>
                      <option value="true" ${settings.smtp_secure === 'true' ? 'selected' : ''}>SSL (Port 465)</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Sender Email</label>
                    <input type="email" id="setSmtpUser" value="${settings.smtp_user || ''}" placeholder="yourflat@gmail.com" class="w-full px-3 py-2 text-xs border rounded-xl font-mono" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">App Password</label>
                    <div class="relative">
                      <input type="password" id="setSmtpPass" value="${settings.smtp_pass || ''}" placeholder="16-character App Password" class="w-full px-3 py-2 text-xs border rounded-xl font-mono" />
                      <button type="button" onclick="SettingsView.togglePassVisibility('setSmtpPass')" class="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs">
                        <i class="fa-solid fa-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">From Name</label>
                  <input type="text" id="setSmtpFrom" value="${settings.smtp_from || 'Flat Management <noreply@flat.com>'}" class="w-full px-3 py-2 text-xs border rounded-xl" />
                </div>
              </div>
            </div>

            <!-- TAB 4: SECURITY -->
            <div class="${this.currentTab === 'security' ? 'block' : 'hidden'} space-y-4">
              <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-5 space-y-4">
                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-key text-blue-600"></i> Change Super Admin Password
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
                    <input type="password" id="adminCurrentPass" class="w-full px-3 py-2 text-xs border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                    <input type="password" id="adminNewPass" minlength="4" class="w-full px-3 py-2 text-xs border rounded-xl outline-none" />
                  </div>
                </div>
                <button type="button" onclick="SettingsView.changeAdminPasswordDirect()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
                  Update Password
                </button>
              </div>
            </div>

            <!-- Hidden Submit Button for Toolbar Trigger -->
            <button type="submit" id="saveSettingsBtn" class="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all">
              Save All Settings
            </button>
          </form>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading settings: ${err.message}</div>`;
    }
  },

  togglePassVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.type = el.type === 'password' ? 'text' : 'password';
  },

  async saveSettings(e) {
    e.preventDefault();
    const data = {
      flat_name: document.getElementById('setFlatName')?.value,
      whatsapp_country_code: document.getElementById('setWACode')?.value,
      smtp_host: document.getElementById('setSmtpHost')?.value,
      smtp_port: document.getElementById('setSmtpPort')?.value,
      smtp_secure: document.getElementById('setSmtpSecure')?.value,
      smtp_user: document.getElementById('setSmtpUser')?.value,
      smtp_pass: document.getElementById('setSmtpPass')?.value,
      smtp_from: document.getElementById('setSmtpFrom')?.value,
      bank_name: document.getElementById('setBankName')?.value,
      account_title: document.getElementById('setAccountTitle')?.value,
      account_number: document.getElementById('setAccountNumber')?.value,
      iban: document.getElementById('setIban')?.value,
      jazzcash_title: document.getElementById('setJcTitle')?.value,
      jazzcash_number: document.getElementById('setJcNumber')?.value,
      easypaisa_title: document.getElementById('setEpTitle')?.value,
      easypaisa_number: document.getElementById('setEpNumber')?.value,
      monthly_bills_due_day: document.getElementById('setDueDay')?.value,
      weekly_food_due_day: document.getElementById('setFoodDueDay')?.value,
      session_timeout_minutes: document.getElementById('setTimeoutMinutes')?.value,
      show_flat_totals_to_members: document.getElementById('setShowFlatTotals')?.value
    };

    // Filter out undefined keys if inactive tabs weren't in DOM
    const cleanData = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleanData[k] = v;
    }

    try {
      await API.put('/api/settings', cleanData);
      App.toast('Global settings saved successfully!', 'success');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  applySmtpPreset(provider) {
    const hostEl = document.getElementById('setSmtpHost');
    const portEl = document.getElementById('setSmtpPort');
    const secureEl = document.getElementById('setSmtpSecure');

    if (provider === 'gmail') {
      if (hostEl) hostEl.value = 'smtp.gmail.com';
      if (portEl) portEl.value = '587';
      if (secureEl) secureEl.value = 'false';
      App.toast('Filled Gmail settings (smtp.gmail.com:587 TLS). Please enter your Gmail address and 16-character App Password.', 'info');
    } else if (provider === 'outlook') {
      if (hostEl) hostEl.value = 'smtp-mail.outlook.com';
      if (portEl) portEl.value = '587';
      if (secureEl) secureEl.value = 'false';
      App.toast('Filled Outlook settings (smtp-mail.outlook.com:587 TLS).', 'info');
    }
  },

  testSmtpConnection() {
    const currentEmail = document.getElementById('setSmtpUser')?.value || '';
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-base font-bold text-slate-800">Send Test Email</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p class="text-xs text-slate-500">Provide an email address to verify that your SMTP host, port, and credentials send messages successfully.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Recipient Test Email *</label>
          <input type="email" id="testEmailInput" value="${currentEmail}" placeholder="admin@example.com" class="w-full px-3 py-2 text-sm border rounded-xl outline-none" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button onclick="SettingsView.confirmTestSmtp()" class="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow">Send Verification</button>
        </div>
      </div>
    `);
  },

  async confirmTestSmtp() {
    const test_email = document.getElementById('testEmailInput').value;
    if (!test_email) {
      App.toast('Please enter a recipient email address', 'error');
      return;
    }

    try {
      App.toast('Connecting to SMTP server...', 'info');
      const res = await API.post('/api/settings/test-smtp', { test_email });
      App.toast(res.message, 'success');
      App.closeModal();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async changeSubAdminPassword(e) {
    e.preventDefault();
    const current_password = document.getElementById('subCurrentPass').value;
    const new_password = document.getElementById('subNewPass').value;

    try {
      const res = await API.post('/api/settings/change-password', { current_password, new_password });
      App.toast(res.message, 'success');
      document.getElementById('subCurrentPass').value = '';
      document.getElementById('subNewPass').value = '';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async changeAdminPasswordDirect() {
    const current_password = document.getElementById('adminCurrentPass')?.value;
    const new_password = document.getElementById('adminNewPass')?.value;

    if (!current_password || !new_password) {
      App.toast('Please fill current and new password', 'error');
      return;
    }

    try {
      const res = await API.post('/api/settings/change-password', { current_password, new_password });
      App.toast(res.message, 'success');
      document.getElementById('adminCurrentPass').value = '';
      document.getElementById('adminNewPass').value = '';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
