// Admins Management View (Super Admin)
const AdminsView = {
  async render() {
    try {
      const admins = await API.get('/api/admins');
      const isSuperAdmin = App.currentUser?.role === 'super_admin';

      return `
        <div class="space-y-4 max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto pb-12">
          <!-- Top Breadcrumb & Action Toolbar -->
          <div class="flex items-center justify-between pb-1">
            <button onclick="App.goBack()" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-all active:scale-95">
              <i class="fa-solid fa-arrow-left text-slate-600"></i>
              <span>Back to Dashboard</span>
            </button>
            ${isSuperAdmin ? `
              <button onclick="AdminsView.openCreateModal()" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-2xs transition-all flex items-center gap-1.5 active:scale-95">
                <i class="fa-solid fa-user-shield text-xs"></i> <span>Add Sub-Admin</span>
              </button>
            ` : ''}
          </div>

          <!-- Section Banner Card -->
          <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div class="flex items-center justify-between relative z-10">
              <div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 mb-1">
                  <i class="fa-solid fa-user-gear"></i> Access Control
                </span>
                <h1 class="text-lg sm:text-xl font-black tracking-tight">Admin Roles & Permissions</h1>
                <p class="text-xs text-blue-100 mt-0.5">Manage sub-admins and delegate food, bills, or rooms permissions</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-xl shrink-0">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
            </div>
          </div>

          <!-- Admins Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${admins.map(a => `
              <div class="bg-white rounded-2xl border ${a.role === 'super_admin' ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'} card-shadow p-6 space-y-4">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl ${a.role === 'super_admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'} flex items-center justify-center text-lg font-bold">
                      <i class="fa-solid fa-user-shield"></i>
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-800 text-base">${a.name}</h3>
                      <p class="text-xs text-slate-400 font-mono">@${a.username}</p>
                    </div>
                  </div>

                  <span class="px-3 py-1 rounded-full text-xs font-bold ${a.role === 'super_admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase' : 'bg-slate-100 text-slate-600'}">
                    ${a.role === 'super_admin' ? 'Super Admin' : 'Sub-Admin'}
                  </span>
                </div>

                <!-- Granted Permissions Chips -->
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Granted Feature Access</p>
                  <div class="flex flex-wrap gap-1.5">
                    ${a.role === 'super_admin' ? `
                      <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <i class="fa-solid fa-lock-open mr-1"></i> Full Access (All Features)
                      </span>
                    ` : `
                      ${a.can_manage_members ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">Add / Edit Members</span>' : ''}
                      ${a.can_manage_rooms ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">Manage Rooms</span>' : ''}
                      ${a.can_manage_bills ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">Divide Bills</span>' : ''}
                      ${a.can_manage_food ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">Weekly Food</span>' : ''}
                      ${a.can_manage_payments ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">Record Payments</span>' : ''}
                      ${a.can_approve_payments ? '<span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">Approve Payments</span>' : '<span class="px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-xs">No Payment Approval</span>'}
                    `}
                  </div>
                </div>

                ${isSuperAdmin && a.role !== 'super_admin' ? `
                  <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button onclick="AdminsView.openEditModal(${JSON.stringify(a).replace(/"/g, '&quot;')})" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all">
                      Edit Permissions
                    </button>
                    <button onclick="AdminsView.deleteAdmin(${a.id}, '${a.username}')" class="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      Delete Admin
                    </button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading admins: ${err.message}</div>`;
    }
  },

  openCreateModal() {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Add New Sub-Admin</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="AdminsView.submitCreate(event)" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name *</label>
            <input type="text" id="newAdminName" required placeholder="e.g. Asad (Assistant Manager)" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Username *</label>
              <input type="text" id="newAdminUser" required placeholder="e.g. asad_flat" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Password *</label>
              <input type="password" id="newAdminPass" required placeholder="Password" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <!-- Preset Role Quick Select -->
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <label class="block text-xs font-bold text-amber-950 uppercase mb-1.5">Quick Role Preset</label>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="AdminsView.applyPreset('assistant')" class="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-slate-700 hover:bg-amber-100/50">
                Assistant Manager (Bills & Members)
              </button>
              <button type="button" onclick="AdminsView.applyPreset('food_manager')" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold shadow hover:bg-amber-700">
                🍲 Weekly Food Manager (Only Food & Payments)
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-2">Granted Feature Access</label>
            <div class="space-y-2 p-3 bg-slate-50 border rounded-xl text-xs">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="permMembers" checked class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Add & Manage Members</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="permBills" checked class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Create & Divide Monthly Bills</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="permFood" checked class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Record Weekly Food Expenses</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="permPayments" checked class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Direct Record Payments</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="permRooms" class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Add & Edit Room Rents</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="permApprove" class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Approve / Reject Member Payment Claims</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Create Sub-Admin</button>
          </div>
        </form>
      </div>
    `);
  },

  applyPreset(role) {
    if (role === 'food_manager') {
      document.getElementById('permMembers').checked = false;
      document.getElementById('permBills').checked = false;
      document.getElementById('permRooms').checked = false;
      document.getElementById('permFood').checked = true;
      document.getElementById('permPayments').checked = true;
      document.getElementById('permApprove').checked = true;
      App.toast('Preset applied: Weekly Food Manager (Food & Payments only)', 'info');
    } else {
      document.getElementById('permMembers').checked = true;
      document.getElementById('permBills').checked = true;
      document.getElementById('permRooms').checked = false;
      document.getElementById('permFood').checked = true;
      document.getElementById('permPayments').checked = true;
      document.getElementById('permApprove').checked = false;
    }
  },

  async submitCreate(e) {
    e.preventDefault();
    const name = document.getElementById('newAdminName').value;
    const username = document.getElementById('newAdminUser').value;
    const password = document.getElementById('newAdminPass').value;

    const can_manage_members = document.getElementById('permMembers').checked ? 1 : 0;
    const can_manage_bills = document.getElementById('permBills').checked ? 1 : 0;
    const can_manage_food = document.getElementById('permFood').checked ? 1 : 0;
    const can_manage_payments = document.getElementById('permPayments').checked ? 1 : 0;
    const can_manage_rooms = document.getElementById('permRooms').checked ? 1 : 0;
    const can_approve_payments = document.getElementById('permApprove').checked ? 1 : 0;

    try {
      await API.post('/api/admins', {
        name, username, password,
        can_manage_members, can_manage_bills, can_manage_food, can_manage_payments, can_manage_rooms, can_approve_payments
      });
      App.toast('Sub-Admin created successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openEditModal(admin) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Edit Permissions: @${admin.username}</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="AdminsView.submitEdit(event, ${admin.id})" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
            <input type="text" id="editAdminName" value="${admin.name}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">New Password (leave blank to keep current)</label>
            <input type="password" id="editAdminPass" placeholder="Leave blank to keep unchanged" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <!-- Preset Role Quick Select -->
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <label class="block text-xs font-bold text-amber-950 uppercase mb-1.5">Quick Role Preset</label>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="AdminsView.applyPreset('assistant')" class="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-slate-700 hover:bg-amber-100/50">
                Assistant Manager (Bills & Members)
              </button>
              <button type="button" onclick="AdminsView.applyPreset('food_manager')" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold shadow hover:bg-amber-700">
                🍲 Weekly Food Manager (Only Food & Payments)
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-2">Granted Feature Access</label>
            <div class="space-y-2 p-3 bg-slate-50 border rounded-xl text-xs">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editPermMembers" ${admin.can_manage_members ? 'checked' : ''} class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Add & Manage Members</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editPermBills" ${admin.can_manage_bills ? 'checked' : ''} class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Create & Divide Monthly Bills</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editPermFood" ${admin.can_manage_food ? 'checked' : ''} class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Record Weekly Food Expenses</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editPermPayments" ${admin.can_manage_payments ? 'checked' : ''} class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Direct Record Payments</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editPermRooms" ${admin.can_manage_rooms ? 'checked' : ''} class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Add & Edit Room Rents</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="editPermApprove" ${admin.can_approve_payments ? 'checked' : ''} class="rounded text-indigo-600" />
                <span class="font-medium text-slate-700">Approve / Reject Member Payment Claims</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Save Permissions</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEdit(e, adminId) {
    e.preventDefault();
    const name = document.getElementById('editAdminName').value;
    const password = document.getElementById('editAdminPass').value || undefined;

    const can_manage_members = document.getElementById('editPermMembers').checked ? 1 : 0;
    const can_manage_bills = document.getElementById('editPermBills').checked ? 1 : 0;
    const can_manage_food = document.getElementById('editPermFood').checked ? 1 : 0;
    const can_manage_payments = document.getElementById('editPermPayments').checked ? 1 : 0;
    const can_manage_rooms = document.getElementById('editPermRooms').checked ? 1 : 0;
    const can_approve_payments = document.getElementById('editPermApprove').checked ? 1 : 0;

    try {
      await API.put(`/api/admins/${adminId}`, {
        name, password,
        can_manage_members, can_manage_bills, can_manage_food, can_manage_payments, can_manage_rooms, can_approve_payments
      });
      App.toast('Permissions updated successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteAdmin(id, username) {
    if (!confirm(`Are you sure you want to remove admin @${username}?`)) return;
    try {
      await API.delete(`/api/admins/${id}`);
      App.toast('Admin deleted', 'info');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
