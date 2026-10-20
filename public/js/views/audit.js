// Audit Trail Log View
const AuditView = {
  async render() {
    try {
      const logs = await API.get('/api/audit?limit=150');

      return `
        <div class="space-y-6 max-w-5xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 card-shadow">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Security & Change History Log</h1>
              <p class="text-sm text-slate-500 mt-0.5">Immutable audit trail of all changes made across the flat management system</p>
            </div>
            <button onclick="App.refresh()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-arrows-rotate"></i> Refresh Log
            </button>
          </div>

          <!-- Logs Table -->
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th class="py-3 px-4">Timestamp</th>
                    <th class="py-3 px-4">Actor</th>
                    <th class="py-3 px-4">Action</th>
                    <th class="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono">
                  ${logs.length > 0 ? logs.map(l => `
                    <tr class="table-row-hover font-sans">
                      <td class="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        ${l.created_at}
                      </td>
                      <td class="py-3 px-4">
                        <span class="font-bold text-slate-800">${l.actor_name || 'System'}</span>
                        <span class="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded ${l.actor_type === 'super_admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'} ml-1">
                          ${l.actor_type}
                        </span>
                      </td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700">
                          ${l.action}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-slate-600 text-xs">
                        ${l.details}
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="4" class="py-8 text-center text-slate-400 font-sans">No audit events recorded yet.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-6 bg-red-50 text-red-700 rounded-xl">Error loading audit log: ${err.message}</div>`;
    }
  }
};
