// Clean API client wrapper with Automatic Token Injection & Offline-First Support
const API = {
  getHeaders(isFormData = false) {
    const token = localStorage.getItem('flat_token') || '';
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async rawRequest(url, method = 'GET', data = null) {
    const isFormData = data instanceof FormData;
    const options = {
      method,
      headers: this.getHeaders(isFormData)
    };
    if (data && method !== 'GET') {
      options.body = isFormData ? data : JSON.stringify(data);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async get(url) {
    // If offline, retrieve directly from local cache
    if (typeof OfflineStore !== 'undefined' && !OfflineStore.isOnline) {
      const cached = OfflineStore.getCachedData(url);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const data = await this.rawRequest(url, 'GET');
      if (typeof OfflineStore !== 'undefined') {
        OfflineStore.cacheData(url, data);
      }
      return data;
    } catch (err) {
      // If network fails, try offline cache fallback
      if (typeof OfflineStore !== 'undefined') {
        const cached = OfflineStore.getCachedData(url);
        if (cached !== null) {
          console.log(`[OfflineCache] Serving ${url} from local storage`);
          return cached;
        }
      }
      throw err;
    }
  },

  async post(url, data) {
    // If offline, queue action for later sync
    if (typeof OfflineStore !== 'undefined' && !OfflineStore.isOnline && !url.includes('/auth/')) {
      OfflineStore.enqueueAction(url, 'POST', data);
      return { success: true, offline: true, message: 'Saved locally in offline mode' };
    }

    try {
      return await this.rawRequest(url, 'POST', data);
    } catch (err) {
      if (typeof OfflineStore !== 'undefined' && !url.includes('/auth/') && (!navigator.onLine || err.message.includes('Failed to fetch'))) {
        OfflineStore.enqueueAction(url, 'POST', data);
        return { success: true, offline: true, message: 'Offline: queued for auto-sync' };
      }
      throw err;
    }
  },

  async put(url, data) {
    if (typeof OfflineStore !== 'undefined' && !OfflineStore.isOnline) {
      OfflineStore.enqueueAction(url, 'PUT', data);
      return { success: true, offline: true, message: 'Saved locally in offline mode' };
    }

    try {
      return await this.rawRequest(url, 'PUT', data);
    } catch (err) {
      if (typeof OfflineStore !== 'undefined' && (!navigator.onLine || err.message.includes('Failed to fetch'))) {
        OfflineStore.enqueueAction(url, 'PUT', data);
        return { success: true, offline: true, message: 'Offline: queued for auto-sync' };
      }
      throw err;
    }
  },

  async delete(url, data = {}) {
    if (typeof OfflineStore !== 'undefined' && !OfflineStore.isOnline) {
      OfflineStore.enqueueAction(url, 'DELETE', data);
      return { success: true, offline: true, message: 'Queued for deletion when reconnected' };
    }

    try {
      return await this.rawRequest(url, 'DELETE', data);
    } catch (err) {
      if (typeof OfflineStore !== 'undefined' && (!navigator.onLine || err.message.includes('Failed to fetch'))) {
        OfflineStore.enqueueAction(url, 'DELETE', data);
        return { success: true, offline: true, message: 'Offline: queued for auto-sync' };
      }
      throw err;
    }
  }
};
