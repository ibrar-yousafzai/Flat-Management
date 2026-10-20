// Settings View with Super Admin SMTP & WhatsApp Configuration
const SettingsView = {
  async render() {
    try {
      const isSuperAdmin = App.currentUser?.role === 'super_admin';
      const settings = await API.get('/api/settings');

      if (!isSuperAdmin) {
        // LIMITED SUB-ADMIN SETTINGS VIEW
        return `
          <div class="space-y-6 max-w-3xl mx-auto">
            <div class="bg-white p-6 rounded-3xl border border-slate-200 card-shadow">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 mb-2">
                <i class="fa-solid fa-user-gear"></i> Sub-Admin Profile
              </span>
              <h1 class="text-2xl font-bold text-slate-800">Admin Account & Reference</h1>
              <p class="text-xs text-slate-500 mt-1">Manage your sub-admin account password and view official flat payment accounts</p>
            </div>

            <!-- Change Password Card -->
            <form onsubmit="SettingsView.changeSubAdminPassword(event)" class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 space-y-4">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-key text-indigo-600"></i> Change Your Password
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Current Password *</label>
                  <input type="password" id="subCurrentPass" required class="w-full px-3 py-2 text-sm border rounded-xl outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">New Password *</label>
                  <input type="password" id="subNewPass" required minlength="4" class="w-full px-3 py-2 text-sm border rounded-xl outline-none" />
                </div>
              </div>
              <div class="flex justify-end pt-2">
                <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow">
                  Update Password
                </button>
              </div>
            </form>

            <!-- Read-only Banking Reference -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 space-y-3">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-building-columns text-indigo-600"></i> Official Flat Bank & Wallet Accounts
              </h3>
              <p class="text-xs text-slate-400">Reference details provided to flat members for payments</p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div class="p-3 bg-slate-50 rounded-xl border">
                  <span class="text-[10px] uppercase font-bold text-indigo-600">Bank</span>
                  <div class="font-bold text-xs mt-1">${settings.bank_name || '-'}</div>
                  <div class="font-mono text-xs text-slate-600">${settings.account_number || '-'}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border">
                  <span class="text-[10px] uppercase font-bold text-amber-600">JazzCash</span>
                  <div class="font-bold text-xs mt-1">${settings.jazzcash_title || '-'}</div>
                  <div class="font-mono text-xs text-slate-700 font-bold">${settings.jazzcash_number || '-'}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border">
                  <span class="text-[10px] uppercase font-bold text-emerald-600">Easypaisa</span>
                  <div class="font-bold text-xs mt-1">${settings.easypaisa_title || '-'}</div>
                  <div class="font-mono text-xs text-slate-700 font-bold">${settings.easypaisa_number || '-'}</div>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 italic pt-2">
                * Note: Global SMTP Email, Flat Bank configuration, and system settings can only be modified by Super Admin.
              </p>
            </div>
          </div>
        `;
      }

      // FULL SUPER ADMIN SETTINGS VIEW
      return `
        <div class="space-y-6 max-w-5xl mx-auto">
          <!-- Header -->
          <div class="bg-white p-6 rounded-3xl border border-slate-200 card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                <i class="fa-solid fa-shield-halved"></i> Super Admin Global Settings
              </span>
              <h1 class="text-2xl font-black text-slate-800">System & Communications Configuration</h1>
              <p class="text-xs text-slate-500 mt-1">Configure SMTP email server, WhatsApp integration, official banking, and data backup</p>
            </div>
          </div>

          <!-- Main Configuration Form -->
          <form onsubmit="SettingsView.saveSettings(event)" class="space-y-6">
            <!-- 1. SMTP EMAIL SERVER CONFIGURATION -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
                    <i class="fa-solid fa-paper-plane"></i>
                  </div>
                  <div>
                    <h3 class="text-base font-bold text-slate-800">Email Server (SMTP)</h3>
                    <p class="text-xs text-slate-500">Delivers clean monthly bill invoices and reminders straight to member emails</p>
                  </div>
                </div>
                <button type="button" onclick="SettingsView.testSmtpConnection()" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-indigo-200">
                  <i class="fa-solid fa-vial text-indigo-500"></i> Test Email
                </button>
              </div>

              <!-- Quick Presets -->
              <div class="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span class="font-bold text-slate-600">Quick Setup Presets:</span>
                <button type="button" onclick="SettingsView.applySmtpPreset('gmail')" class="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg font-semibold text-slate-700 shadow-xs transition-all">
                  Gmail (Recommended)
                </button>
                <button type="button" onclick="SettingsView.applySmtpPreset('outlook')" class="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg font-semibold text-slate-700 shadow-xs transition-all">
                  Outlook / Hotmail
                </button>
                <span class="text-[11px] text-slate-400 ml-auto">Clicking a preset fills host, port, and security automatically</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">SMTP Host *</label>
                  <input type="text" id="setSmtpHost" value="${settings.smtp_host || 'smtp.gmail.com'}" placeholder="e.g. smtp.gmail.com" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">SMTP Port *</label>
                  <input type="number" id="setSmtpPort" value="${settings.smtp_port || 587}" placeholder="587" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Security</label>
                  <select id="setSmtpSecure" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="false" ${settings.smtp_secure !== 'true' ? 'selected' : ''}>TLS / STARTTLS (Port 587)</option>
                    <option value="true" ${settings.smtp_secure === 'true' ? 'selected' : ''}>SSL (Port 465)</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address *</label>
                  <input type="email" id="setSmtpUser" value="${settings.smtp_user || ''}" placeholder="yourflat@gmail.com" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                  <p class="text-[11px] text-slate-400 mt-1">Sender email address for bills</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">App Password *</label>
                  <div class="relative">
                    <input type="password" id="setSmtpPass" value="${settings.smtp_pass || ''}" placeholder="16-character App Password" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                    <button type="button" onclick="SettingsView.togglePassVisibility('setSmtpPass')" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1">For Gmail: Use Google Account &gt; Security &gt; App Password</p>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Sender Display Name</label>
                <input type="text" id="setSmtpFrom" value="${settings.smtp_from || 'Flat Management <noreply@flat.com>'}" placeholder="e.g. Flat Management &lt;noreply@flat.com&gt;" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <!-- 2. WHATSAPP & COMMUNICATIONS -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 space-y-4">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-brands fa-whatsapp text-emerald-600 text-lg"></i> WhatsApp Direct Sharing
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Country Calling Code</label>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-slate-400">+</span>
                    <input type="text" id="setWACode" value="${settings.whatsapp_country_code || '92'}" placeholder="92" maxlength="4" class="w-24 px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold" />
                    <span class="text-xs text-slate-500">e.g. 92 (Pakistan)</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">Do not enter full phone numbers here, only the 1-4 digit country code.</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Property / Flat Title</label>
                  <input type="text" id="setFlatName" value="${settings.flat_name || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                </div>
              </div>
            </div>

            <!-- 3. OFFICIAL BANK & MOBILE WALLET ACCOUNTS -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 space-y-4">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-building-columns text-indigo-600"></i> Official Flat Accounts (Printed on Invoices & Portals)
              </h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Bank Name</label>
                  <input type="text" id="setBankName" value="${settings.bank_name || ''}" placeholder="e.g. Meezan Bank" class="w-full px-3 py-2 text-sm border rounded-xl outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Account Title</label>
                  <input type="text" id="setAccountTitle" value="${settings.account_title || ''}" placeholder="e.g. Flat Manager" class="w-full px-3 py-2 text-sm border rounded-xl outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Account Number</label>
                  <input type="text" id="setAccountNumber" value="${settings.account_number || ''}" placeholder="0101-123456789" class="w-full px-3 py-2 text-sm border rounded-xl outline-none font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">IBAN</label>
                  <input type="text" id="setIban" value="${settings.iban || ''}" placeholder="PK36MEZN..." class="w-full px-3 py-2 text-sm border rounded-xl outline-none font-mono uppercase" />
                </div>
              </div>

              <!-- Mobile Wallets -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div class="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <span class="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5"><i class="fa-solid fa-mobile-screen"></i> JazzCash</span>
                  <input type="text" id="setJcTitle" value="${settings.jazzcash_title || ''}" placeholder="Account Title" class="w-full px-3 py-1.5 text-xs bg-white border rounded-xl outline-none" />
                  <input type="text" id="setJcNumber" value="${settings.jazzcash_number || ''}" placeholder="0300-1234567" class="w-full px-3 py-1.5 text-xs bg-white border rounded-xl outline-none font-mono font-bold" />
                </div>
                <div class="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <span class="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5"><i class="fa-solid fa-mobile-screen-button"></i> Easypaisa</span>
                  <input type="text" id="setEpTitle" value="${settings.easypaisa_title || ''}" placeholder="Account Title" class="w-full px-3 py-1.5 text-xs bg-white border rounded-xl outline-none" />
                  <input type="text" id="setEpNumber" value="${settings.easypaisa_number || ''}" placeholder="0345-1234567" class="w-full px-3 py-1.5 text-xs bg-white border rounded-xl outline-none font-mono font-bold" />
                </div>
              </div>
            </div>

            <!-- 3. DUE DATES, REMINDERS & MEMBER PRIVACY -->
            <div class="bg-white rounded-3xl border border-slate-200 card-shadow p-6 space-y-4">
              <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div class="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg">
                  <i class="fa-solid fa-calendar-check"></i>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-800">Due Dates, Schedules & Privacy Rules</h3>
                  <p class="text-xs text-slate-500">Configure monthly payment due days, shared device timeouts, and member privacy visibility</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Monthly Bills Due Day *</label>
                  <select id="setDueDay" class="w-full px-3 py-2 text-sm border rounded-xl outline-none font-bold">
                    ${[1, 5, 7, 10, 15, 20, 25].map(d => `<option value="${d}" ${String(settings.monthly_bills_due_day || '10') === String(d) ? 'selected' : ''}>Day ${d} of each month</option>`).join('')}
                  </select>
                  <p class="text-[10px] text-slate-400 mt-1">Unpaid bills become marked as Overdue after this day</p>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Weekly Food Due Day</label>
                  <select id="setFoodDueDay" class="w-full px-3 py-2 text-sm border rounded-xl outline-none font-bold">
                    ${['Sunday', 'Monday', 'Friday', 'Saturday'].map(day => `<option value="${day}" ${(settings.weekly_food_due_day || 'Sunday') === day ? 'selected' : ''}>Every ${day}</option>`).join('')}
                  </select>
                  <p class="text-[10px] text-slate-400 mt-1">Members settle food expenses on this day each week</p>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Shared Phone Inactivity Timeout</label>
                  <select id="setTimeoutMinutes" class="w-full px-3 py-2 text-sm border rounded-xl outline-none font-bold">
                    <option value="5" ${(settings.session_timeout_minutes || '15') === '5' ? 'selected' : ''}>5 Minutes of Inactivity</option>
                    <option value="15" ${(settings.session_timeout_minutes || '15') === '15' ? 'selected' : ''}>15 Minutes of Inactivity</option>
                    <option value="30" ${(settings.session_timeout_minutes || '15') === '30' ? 'selected' : ''}>30 Minutes of Inactivity</option>
                  </select>
                  <p class="text-[10px] text-slate-400 mt-1">Protects privacy if members open portal on someone else's phone</p>
                </div>
              </div>

              <div class="pt-2">
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Member Privacy: Total Flat Expenses Visibility</label>
                <select id="setShowFlatTotals" class="w-full sm:w-1/2 px-3 py-2 text-sm border rounded-xl outline-none">
                  <option value="true" ${(settings.show_flat_totals_to_members || 'true') === 'true' ? 'selected' : ''}>Show Flat Total Costs (e.g. Total electricity was Rs. 24,000, your share is Rs. 2,000)</option>
                  <option value="false" ${(settings.show_flat_totals_to_members || 'true') === 'false' ? 'selected' : ''}>Hide Flat Totals (Members only see their own individual share)</option>
                </select>
                <p class="text-[10px] text-slate-400 mt-1">Note: Members NEVER see other members' individual balances or payments.</p>
              </div>
            </div>

            <!-- Save Global Settings Button -->
            <div class="flex justify-end pt-2">
              <button type="submit" class="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all">
                Save Global Configuration
              </button>
            </div>
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
      flat_name: document.getElementById('setFlatName').value,
      whatsapp_country_code: document.getElementById('setWACode').value,
      smtp_host: document.getElementById('setSmtpHost').value,
      smtp_port: document.getElementById('setSmtpPort').value,
      smtp_secure: document.getElementById('setSmtpSecure').value,
      smtp_user: document.getElementById('setSmtpUser').value,
      smtp_pass: document.getElementById('setSmtpPass').value,
      smtp_from: document.getElementById('setSmtpFrom').value,
      bank_name: document.getElementById('setBankName').value,
      account_title: document.getElementById('setAccountTitle').value,
      account_number: document.getElementById('setAccountNumber').value,
      iban: document.getElementById('setIban').value,
      jazzcash_title: document.getElementById('setJcTitle').value,
      jazzcash_number: document.getElementById('setJcNumber').value,
      easypaisa_title: document.getElementById('setEpTitle').value,
      easypaisa_number: document.getElementById('setEpNumber').value,
      monthly_bills_due_day: document.getElementById('setDueDay').value,
      weekly_food_due_day: document.getElementById('setFoodDueDay').value,
      session_timeout_minutes: document.getElementById('setTimeoutMinutes').value,
      show_flat_totals_to_members: document.getElementById('setShowFlatTotals').value
    };

    try {
      await API.put('/api/settings', data);
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
    const currentEmail = document.getElementById('setSmtpUser').value || '';
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
          <button onclick="SettingsView.confirmTestSmtp()" class="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow">Send Verification</button>
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
  }
};
