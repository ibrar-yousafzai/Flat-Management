// Members View
const MembersView = {
  currentTab: 'Active', // 'Active' or 'Former'
  searchQuery: '',
  visibleLimit: 6,

  async render() {
    try {
      const [members, rooms, settings] = await Promise.all([
        API.get('/api/members?status=all'),
        API.get('/api/rooms'),
        API.get('/api/settings')
      ]);

      const currency = settings.currency_symbol || 'Rs.';

      const filtered = members.filter(m => {
        const matchesTab = m.status === this.currentTab;
        const matchesSearch = !this.searchQuery || 
          m.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
          m.unique_id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (m.whatsapp && m.whatsapp.includes(this.searchQuery));
        return matchesTab && matchesSearch;
      });

      const visibleMembers = filtered.slice(0, this.visibleLimit || 6);

      return `
        <div class="space-y-6">
          <!-- Header -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Members Management</h1>
              <p class="text-sm text-slate-500 mt-0.5">Track active & former flat members, security deposits, room rent assignments, and departure settlements.</p>
            </div>
            <button onclick="MembersView.openCreateModal(${JSON.stringify(rooms).replace(/"/g, '&quot;')})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all flex items-center gap-2">
              <i class="fa-solid fa-user-plus"></i> Add New Member
            </button>
          </div>

          <!-- Tabs & Search Toolbar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 card-shadow">
            <!-- Tabs -->
            <div class="flex items-center gap-2">
              <button onclick="MembersView.switchTab('Active')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${this.currentTab === 'Active' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                Active Members (${members.filter(m => m.status === 'Active').length})
              </button>
              <button onclick="MembersView.switchTab('Former')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${this.currentTab === 'Former' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                Former Members (${members.filter(m => m.status === 'Former').length})
              </button>
            </div>

            <!-- Search box -->
            <div class="relative w-full sm:w-72">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Search by name, ID or phone..." value="${this.searchQuery}" oninput="MembersView.onSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <!-- Members Table Container -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <!-- Desktop Members Table -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th class="py-3.5 px-4">Member Info</th>
                    <th class="py-3.5 px-4">Portal ID & Pass</th>
                    <th class="py-3.5 px-4">Type & Room</th>
                    <th class="py-3.5 px-4">Security Deposit</th>
                    <th class="py-3.5 px-4">Joined / Left</th>
                    <th class="py-3.5 px-4 text-right">Running Balance</th>
                    <th class="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${visibleMembers.length > 0 ? visibleMembers.map(m => {
                    const isOwed = (m.outstanding_balance || 0) > 0;
                    return `
                      <tr class="table-row-hover transition-colors">
                        <!-- Member Info -->
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            ${m.name}
                          </div>
                          <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            ${m.whatsapp ? `
                              <a href="https://wa.me/${m.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-600 hover:underline flex items-center gap-1">
                                <i class="fa-brands fa-whatsapp text-emerald-500"></i> ${m.whatsapp}
                              </a>
                            ` : '<span>No Phone</span>'}
                            ${m.email ? `&bull; <span>${m.email}</span>` : ''}
                          </div>
                        </td>

                        <!-- Portal ID & Pass -->
                        <td class="py-3.5 px-4 font-mono">
                          <div class="flex items-center gap-1.5">
                            <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">${m.unique_id}</span>
                            <button onclick="navigator.clipboard.writeText('${m.unique_id}'); App.toast('Copied ID', 'info');" title="Copy Member ID" class="text-slate-400 hover:text-indigo-600"><i class="fa-regular fa-copy"></i></button>
                          </div>
                          <div class="text-[10px] text-slate-400 mt-0.5">Pass: <span class="text-slate-600 font-mono">${m.password}</span></div>
                        </td>

                        <!-- Type & Room -->
                        <td class="py-3.5 px-4">
                          <div class="flex items-center gap-1.5">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${m.type === 'Inside' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                              ${m.type}
                            </span>
                          </div>
                          <div class="text-[11px] text-slate-600 mt-1 font-medium">
                            ${m.type === 'Inside' ? (m.room_name ? `<i class="fa-solid fa-door-open text-slate-400 text-[10px] mr-1"></i>${m.room_name}` : '<span class="text-amber-600">No room assigned</span>') : '<span class="text-slate-400 italic">No room (No rent)</span>'}
                          </div>
                        </td>

                        <!-- Security Deposit -->
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-slate-800 text-xs">
                            ${currency} ${(m.security_deposit || 0).toLocaleString()}
                          </div>
                          <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${m.security_deposit_status === 'Settled' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}">
                            ${m.security_deposit_status || 'Held'}
                          </span>
                        </td>

                        <!-- Joined / Left -->
                        <td class="py-3.5 px-4 text-slate-500 text-[11px]">
                          <div>Joined: <strong class="text-slate-700">${m.join_date}</strong></div>
                          ${m.leave_date ? `<div class="text-rose-500 font-semibold">Left: ${m.leave_date}</div>` : ''}
                        </td>

                        <!-- Running Balance -->
                        <td class="py-3.5 px-4 text-right">
                          <div class="font-bold text-sm ${isOwed ? 'text-rose-600' : 'text-emerald-600'}">
                            ${currency} ${(m.outstanding_balance || 0).toLocaleString()}
                          </div>
                          <div class="text-[10px] text-slate-400">
                            ${isOwed ? 'Payable Balance' : 'Clear / Advance'}
                          </div>
                        </td>

                        <!-- Actions -->
                        <td class="py-3.5 px-4 text-center">
                          <div class="flex items-center justify-center gap-1.5">
                            <button onclick="MembersView.viewStatement(${m.id})" title="View Full Statement / Ledger" class="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all">
                              <i class="fa-solid fa-file-invoice"></i>
                            </button>
                            <button onclick="MembersView.openEditModal(${JSON.stringify(m).replace(/"/g, '&quot;')}, ${JSON.stringify(rooms).replace(/"/g, '&quot;')})" title="Edit Member & Credentials" class="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all">
                              <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            ${m.status === 'Active' ? `
                              <button onclick="MembersView.openLeavingSettlementModal(${m.id})" title="Leaving Settlement (What they owe / refundable)" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-all">
                                <i class="fa-solid fa-person-walking-dashed-line-arrow-right text-sm"></i>
                              </button>
                            ` : `
                              <button onclick="MembersView.reactivateMember(${m.id}, '${m.name}', ${JSON.stringify(rooms).replace(/"/g, '&quot;')})" title="Reactivate Member" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                                <i class="fa-solid fa-user-check"></i>
                              </button>
                            `}
                            <button onclick="MembersView.deleteMember(${m.id}, '${m.name.replace(/'/g, "\\'")}', '${m.unique_id}')" title="Permanently Delete Member" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                              <i class="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="7" class="py-8 text-center text-slate-400">
                        No ${this.currentTab.toLowerCase()} members found matching your search.
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- Dedicated Mobile Member Cards (Clean Touch-Optimized Layout) -->
            <div class="md:hidden divide-y divide-slate-100">
              ${visibleMembers.length > 0 ? visibleMembers.map(m => {
                const isOwed = (m.outstanding_balance || 0) > 0;
                return `
                  <div class="p-4 space-y-3">
                    <!-- Top: Avatar, Name, Status, Running Balance -->
                    <div class="flex items-start justify-between">
                      <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                          ${m.name.charAt(0)}
                        </div>
                        <div>
                          <div class="font-bold text-slate-800 text-sm leading-tight">${m.name}</div>
                          <div class="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span class="font-mono text-indigo-600 font-bold bg-indigo-50 px-1 rounded">${m.unique_id}</span> &bull; 
                            <span class="font-medium ${m.type === 'Inside' ? 'text-emerald-700' : 'text-slate-500'}">${m.type === 'Inside' ? (m.room_name || 'Room ?') : 'Outside'}</span>
                          </div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-[10px] text-slate-400 uppercase font-semibold">Balance</div>
                        <div class="text-sm font-black ${isOwed ? 'text-rose-600' : 'text-emerald-600'}">
                          ${currency} ${(m.outstanding_balance || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <!-- Details Row: Deposit & Contacts -->
                    <div class="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div class="text-[11px] text-slate-600">
                        <span class="text-slate-400">Deposit:</span> <strong>${currency} ${(m.security_deposit || 0).toLocaleString()}</strong>
                        <span class="text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${m.security_deposit_status === 'Settled' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'}">${m.security_deposit_status || 'Held'}</span>
                      </div>
                      <div>
                        ${m.whatsapp ? `
                          <a href="https://wa.me/${m.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                            <i class="fa-brands fa-whatsapp"></i> Chat
                          </a>
                        ` : '<span class="text-slate-400 text-[10px]">No Phone</span>'}
                      </div>
                    </div>

                    <!-- Actions Toolbar -->
                    <div class="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <button onclick="MembersView.viewStatement(${m.id})" class="flex-1 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1">
                        <i class="fa-solid fa-file-invoice text-indigo-600 text-xs"></i> Statement
                      </button>
                      <button onclick="MembersView.openEditModal(${JSON.stringify(m).replace(/"/g, '&quot;')}, ${JSON.stringify(rooms).replace(/"/g, '&quot;')})" class="flex-1 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1">
                        <i class="fa-regular fa-pen-to-square text-xs"></i> Edit
                      </button>
                      ${m.status === 'Active' ? `
                        <button onclick="MembersView.openLeavingSettlementModal(${m.id})" title="Leaving Settlement" class="p-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1">
                          <i class="fa-solid fa-person-walking-dashed-line-arrow-right text-xs"></i> Settle
                        </button>
                      ` : `
                        <button onclick="MembersView.reactivateMember(${m.id}, '${m.name}', ${JSON.stringify(rooms).replace(/"/g, '&quot;')})" class="p-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1">
                          <i class="fa-solid fa-user-check text-xs"></i> Reactivate
                        </button>
                      `}
                      <button onclick="MembersView.deleteMember(${m.id}, '${m.name.replace(/'/g, "\\'")}', '${m.unique_id}')" title="Delete Member" class="p-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition-all">
                        <i class="fa-regular fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="p-6 text-center text-xs text-slate-400">
                  No ${this.currentTab.toLowerCase()} members found matching your search.
                </div>
              `}
            </div>

            <!-- Pagination / Show More Toolbar (Fast & Clean) -->
            ${filtered.length > 6 ? `
              <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div class="text-slate-500 font-medium text-center sm:text-left">
                  Showing <span class="font-bold text-slate-800">${Math.min(this.visibleLimit || 6, filtered.length)}</span> of <span class="font-bold text-slate-800">${filtered.length}</span> members
                </div>
                <div class="flex items-center gap-2">
                  ${(this.visibleLimit || 6) < filtered.length ? `
                    <button onclick="MembersView.showMore()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5">
                      <i class="fa-solid fa-chevron-down text-xs"></i> Show More (+6)
                    </button>
                    <button onclick="MembersView.showAll()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl transition-all">
                      Show All (${filtered.length})
                    </button>
                  ` : ''}
                  ${(this.visibleLimit || 6) > 6 ? `
                    <button onclick="MembersView.showLess()" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl transition-all flex items-center gap-1">
                      <i class="fa-solid fa-chevron-up text-xs"></i> Show Less (6)
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading members: ${err.message}</div>`;
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
    this.currentTab = tab;
    this.visibleLimit = 6;
    App.refresh();
  },

  onSearch(query) {
    this.searchQuery = query;
    this.visibleLimit = 6;
    App.refresh();
  },

  openCreateModal(rooms) {
    const today = new Date().toISOString().slice(0, 10);
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Add New Member</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="MembersView.submitCreate(event)" class="space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name *</label>
              <input type="text" id="newMemName" required placeholder="e.g. Ali Ahmed" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">WhatsApp / Phone *</label>
              <input type="text" id="newMemPhone" placeholder="0300-1234567" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Email (Optional)</label>
              <input type="email" id="newMemEmail" placeholder="ali@example.com" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Join Date</label>
              <input type="date" id="newMemJoinDate" value="${today}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Member Type *</label>
              <select id="newMemType" onchange="MembersView.toggleRoomDropdown(this.value)" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="Inside" selected>Inside (Lives in flat, pays room rent)</option>
                <option value="Outside">Outside (No room, pays Rs. 0 rent)</option>
              </select>
            </div>
            <div id="newMemRoomContainer">
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Assign Room *</label>
              <select id="newMemRoomId" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">-- Select Room --</option>
                ${rooms.map(r => `<option value="${r.id}">${r.name} (Rs. ${r.base_rent.toLocaleString()})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Security Deposit (Rs.)</label>
              <input type="number" id="newMemDeposit" value="0" placeholder="e.g. 10000" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Opening Balance (Rs.)</label>
              <input type="number" id="newMemOpeningBalance" value="0" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Security Deposit Notes / Reference</label>
            <input type="text" id="newMemDepositNotes" placeholder="e.g. Paid in cash on move-in or bank ref" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            <strong class="font-semibold">Security & Login:</strong> A Unique ID (e.g. MEM-007) and secure password will be auto-generated so this member can log into their private dashboard.
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Add Member</button>
          </div>
        </form>
      </div>
    `);
  },

  toggleRoomDropdown(type) {
    const container = document.getElementById('newMemRoomContainer');
    if (container) {
      container.style.display = type === 'Outside' ? 'none' : 'block';
    }
  },

  async submitCreate(e) {
    e.preventDefault();
    const name = document.getElementById('newMemName').value;
    const whatsapp = document.getElementById('newMemPhone').value;
    const email = document.getElementById('newMemEmail').value;
    const join_date = document.getElementById('newMemJoinDate').value;
    const type = document.getElementById('newMemType').value;
    const room_id = type === 'Inside' ? document.getElementById('newMemRoomId').value : null;
    const security_deposit = document.getElementById('newMemDeposit').value;
    const security_deposit_notes = document.getElementById('newMemDepositNotes').value;
    const opening_balance = document.getElementById('newMemOpeningBalance').value;

    try {
      const res = await API.post('/api/members', {
        name, whatsapp, email, join_date, type, room_id, security_deposit, security_deposit_notes, opening_balance
      });
      App.toast(`Member added! Unique ID: ${res.unique_id}`, 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openEditModal(m, rooms) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Edit Member: ${m.name}</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="MembersView.submitEdit(event, ${m.id})" class="space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
              <input type="text" id="editMemName" value="${m.name}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">WhatsApp / Phone</label>
              <input type="text" id="editMemPhone" value="${m.whatsapp || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Portal Password</label>
              <input type="text" id="editMemPass" value="${m.password}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
              <input type="email" id="editMemEmail" value="${m.email || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Member Type</label>
              <select id="editMemType" onchange="document.getElementById('editRoomContainer').style.display = this.value === 'Outside' ? 'none' : 'block'" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="Inside" ${m.type === 'Inside' ? 'selected' : ''}>Inside (Lives in flat, pays room rent)</option>
                <option value="Outside" ${m.type === 'Outside' ? 'selected' : ''}>Outside (No room, Rs. 0 rent)</option>
              </select>
            </div>
            <div id="editRoomContainer" style="${m.type === 'Outside' ? 'display:none;' : ''}">
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Assigned Room</label>
              <select id="editMemRoomId" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">-- No Room --</option>
                ${rooms.map(r => `<option value="${r.id}" ${m.room_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Security Deposit (Rs.)</label>
              <input type="number" id="editMemDeposit" value="${m.security_deposit || 0}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Deposit Status</label>
              <select id="editMemDepositStatus" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="Held" ${(m.security_deposit_status || 'Held') === 'Held' ? 'selected' : ''}>Held</option>
                <option value="Refunded" ${m.security_deposit_status === 'Refunded' ? 'selected' : ''}>Refunded</option>
                <option value="Adjusted" ${m.security_deposit_status === 'Adjusted' ? 'selected' : ''}>Adjusted Against Bills</option>
                <option value="Settled" ${m.security_deposit_status === 'Settled' ? 'selected' : ''}>Settled on Departure</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Security Deposit Notes</label>
            <input type="text" id="editMemDepositNotes" value="${m.security_deposit_notes || ''}" placeholder="e.g. Cash receipt or bank ref" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Save Changes</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEdit(e, id) {
    e.preventDefault();
    const name = document.getElementById('editMemName').value;
    const whatsapp = document.getElementById('editMemPhone').value;
    const password = document.getElementById('editMemPass').value;
    const email = document.getElementById('editMemEmail').value;
    const type = document.getElementById('editMemType').value;
    const room_id = type === 'Inside' ? document.getElementById('editMemRoomId').value : null;
    const security_deposit = document.getElementById('editMemDeposit').value;
    const security_deposit_status = document.getElementById('editMemDepositStatus').value;
    const security_deposit_notes = document.getElementById('editMemDepositNotes').value;

    try {
      await API.put(`/api/members/${id}`, {
        name, whatsapp, password, email, type, room_id, security_deposit, security_deposit_status, security_deposit_notes
      });
      App.toast('Member profile updated!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // Leaving Settlement Statement Modal (What they owe, what is refundable)
  async openLeavingSettlementModal(memberId) {
    try {
      const data = await API.get(`/api/members/${memberId}/settlement-statement`);
      const m = data.member;
      const b = data.balance;
      const today = new Date().toISOString().slice(0, 10);

      App.showModal(`
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i>
              </span>
              <div>
                <h3 class="text-base font-black text-slate-900">Leaving Settlement Statement</h3>
                <p class="text-xs text-slate-500">${m.name} (${m.unique_id}) &bull; Room: ${m.room_name || 'Outside'}</p>
              </div>
            </div>
            <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- Financial Settlement Breakdown Cards -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <!-- 1. What Member Owes -->
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <span class="font-bold uppercase text-[10px] text-rose-700 block">Total Dues Owed</span>
              <div class="text-lg font-black text-rose-900">Rs. ${data.total_owed.toLocaleString()}</div>
              <div class="text-[11px] text-rose-700 pt-1 border-t border-rose-200/60">
                <div>&bull; Monthly Bills: Rs. ${b.bills_balance.toLocaleString()}</div>
                <div>&bull; Food Mess: Rs. ${b.food_balance.toLocaleString()}</div>
              </div>
            </div>

            <!-- 2. Security Deposit Held -->
            <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
              <span class="font-bold uppercase text-[10px] text-indigo-700 block">Security Deposit Held</span>
              <div class="text-lg font-black text-indigo-900">Rs. ${data.security_deposit.toLocaleString()}</div>
              <div class="text-[11px] text-indigo-700 pt-1 border-t border-indigo-200/60">
                Status: <span class="font-bold">${data.security_deposit_status}</span>
              </div>
            </div>
          </div>

          <!-- Net Calculation Banner -->
          <div class="p-4 rounded-xl border ${data.net_settlement > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : (data.net_settlement < 0 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-900')}">
            <div class="text-[10px] uppercase font-bold tracking-wider">Final Settlement Outcome</div>
            <div class="text-lg font-black mt-0.5">
              ${data.net_settlement > 0 ? `🎉 Refund of Rs. ${data.net_settlement.toLocaleString()} Payable to Member` : (data.net_settlement < 0 ? `⚠️ Member Must Pay Remaining Rs. ${Math.abs(data.net_settlement).toLocaleString()}` : `✅ Fully Settled & Cleared (Rs. 0)`)}
            </div>
            <p class="text-xs mt-1 leading-relaxed">${data.summary_text}</p>
          </div>

          <!-- Settlement Execution Form -->
          <form onsubmit="MembersView.submitSettlement(event, ${m.id})" class="space-y-3 pt-2 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-600 uppercase mb-1">Departure / Leave Date *</label>
                <input type="date" id="settleLeaveDate" value="${today}" required class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label class="block font-semibold text-slate-600 uppercase mb-1">Settlement Action</label>
                <select id="settleAction" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                  <option value="offset_and_refund">Adjust Deposit Against Dues & Refund Difference</option>
                  <option value="mark_cleared">Mark Dues Fully Cleared / Settled</option>
                  <option value="custom">Custom Settlement</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-600 uppercase mb-1">Settlement Notes / Payment Details</label>
              <input type="text" id="settleNotes" placeholder="e.g. Refunded Rs. 3,500 via JazzCash / Paid cash at checkout" class="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t">
              <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-check"></i> Finalize Departure & Save Statement
              </button>
            </div>
          </form>
        </div>
      `);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async submitSettlement(e, memberId) {
    e.preventDefault();
    const leave_date = document.getElementById('settleLeaveDate').value;
    const action = document.getElementById('settleAction').value;
    const settlement_notes = document.getElementById('settleNotes').value;

    try {
      const res = await API.post(`/api/members/${memberId}/execute-settlement`, {
        leave_date,
        action,
        settlement_notes,
        actor_name: App.currentUser?.name || 'Admin'
      });
      App.toast(res.message, 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async viewStatement(memberId) {
    App.openInvoiceModal(memberId, new Date().toISOString().slice(0, 7));
  },

  async deleteMember(id, name, uniqueId) {
    if (!confirm(`Are you sure you want to permanently delete member "${name}" (${uniqueId})?\n\nWarning: This will permanently delete their account and associated records.`)) {
      return;
    }
    try {
      const res = await API.delete(`/api/members/${id}`);
      App.toast(res.message, 'success');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
