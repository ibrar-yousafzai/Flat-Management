// Rooms View
const RoomsView = {
  async render() {
    try {
      const [rooms, settings] = await Promise.all([
        API.get('/api/rooms'),
        API.get('/api/settings')
      ]);

      const currency = settings.currency_symbol || 'Rs.';

      return `
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Rooms Management</h1>
              <p class="text-sm text-slate-500 mt-0.5">Fixed rent per room is automatically split equally among occupants</p>
            </div>
            <button onclick="RoomsView.openCreateModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all flex items-center gap-2">
              <i class="fa-solid fa-plus"></i> Add New Room
            </button>
          </div>

          <!-- Info Box on Freeze Rule -->
          <div class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
            <i class="fa-solid fa-circle-info text-blue-500 text-base mt-0.5"></i>
            <div>
              <strong class="font-semibold">Future-Safe Billing:</strong> Editing a room's fixed rent or occupants only applies to future months. Historical bills already calculated and locked for past months will never change.
            </div>
          </div>

          <!-- Rooms Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${rooms.map(room => `
              <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden flex flex-col justify-between">
                <div class="p-6">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-lg font-bold text-slate-800">${room.name}</h3>
                      <p class="text-xs text-slate-400 mt-0.5">${room.description || 'No description'}</p>
                    </div>
                    <div class="text-right">
                      <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ${currency} ${room.base_rent.toLocaleString()}
                      </span>
                      <p class="text-[10px] text-slate-400 mt-1">Total Room Rent</p>
                    </div>
                  </div>

                  <div class="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="flex items-center justify-between text-xs mb-2">
                      <span class="text-slate-500 font-medium">Occupancy</span>
                      <span class="font-bold text-slate-700">${room.occupant_count} Person(s)</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-500 font-medium">Equal Share per Person</span>
                      <span class="font-bold text-indigo-700 text-sm">${currency} ${room.rent_per_person.toLocaleString()}</span>
                    </div>
                  </div>

                  <div class="mt-4">
                    <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Occupants</p>
                    ${room.occupants.length > 0 ? `
                      <div class="space-y-1.5">
                        ${room.occupants.map(o => `
                          <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-xs">
                            <span class="font-semibold text-slate-700 flex items-center gap-1.5">
                              <i class="fa-solid fa-user-check text-emerald-500"></i> ${o.name}
                            </span>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">${o.unique_id}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <p class="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-dashed border-slate-200 text-center">
                        No members assigned yet
                      </p>
                    `}
                  </div>
                </div>

                <div class="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button onclick="RoomsView.openEditModal(${JSON.stringify(room).replace(/"/g, '&quot;')})" class="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 transition-all flex items-center gap-1">
                    <i class="fa-regular fa-pen-to-square"></i> Edit
                  </button>
                  <button onclick="RoomsView.deleteRoom(${room.id}, '${room.name}')" class="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-all flex items-center gap-1">
                    <i class="fa-regular fa-trash-can"></i> Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading rooms: ${err.message}</div>`;
    }
  },

  openCreateModal() {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Add New Room</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="RoomsView.submitCreate(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Room Name</label>
            <input type="text" id="newRoomName" required placeholder="e.g. Room 4, Master Bed, Hall" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Fixed Room Rent (Rs.)</label>
            <input type="number" id="newRoomRent" required min="0" placeholder="e.g. 25000" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p class="text-[11px] text-slate-400 mt-1">This amount will be split equally among all members inside this room.</p>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Description (Optional)</label>
            <input type="text" id="newRoomDesc" placeholder="e.g. Attached bath, Balcony" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Save Room</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitCreate(e) {
    e.preventDefault();
    const name = document.getElementById('newRoomName').value;
    const base_rent = document.getElementById('newRoomRent').value;
    const description = document.getElementById('newRoomDesc').value;

    try {
      await API.post('/api/rooms', { name, base_rent, description });
      App.toast('Room created successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openEditModal(room) {
    App.showModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-bold text-slate-800">Edit Room: ${room.name}</h3>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form onsubmit="RoomsView.submitEdit(event, ${room.id})" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Room Name</label>
            <input type="text" id="editRoomName" value="${room.name}" required class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Fixed Room Rent (Rs.)</label>
            <input type="number" id="editRoomRent" value="${room.base_rent}" required min="0" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p class="text-[11px] text-amber-600 mt-1">Note: Changes only affect future months. Past months will not change.</p>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Description</label>
            <input type="text" id="editRoomDesc" value="${room.description || ''}" class="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 border rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Update Room</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitEdit(e, roomId) {
    e.preventDefault();
    const name = document.getElementById('editRoomName').value;
    const base_rent = document.getElementById('editRoomRent').value;
    const description = document.getElementById('editRoomDesc').value;

    try {
      await API.put(`/api/rooms/${roomId}`, { name, base_rent, description });
      App.toast('Room updated successfully!', 'success');
      App.closeModal();
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteRoom(id, name) {
    if (!confirm(`Are you sure you want to delete ${name}? Members in this room will become unassigned.`)) return;
    try {
      await API.delete(`/api/rooms/${id}`);
      App.toast(`Room ${name} deleted`, 'info');
      App.refresh();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
