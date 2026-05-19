const QUEUE_KEY = 'google_sync_queue';
const URL_KEY = 'google_script_url';
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwanY8Iu1rUsGatUKI13gpiX7oqmEwn4_ryVEIj66QumIybtRQr5mvaWS9cxB_27gpW/exec';

let isSyncing = false;
let syncInterval = null;

function getQueue() {
  try {
    const q = localStorage.getItem(QUEUE_KEY);
    return q ? JSON.parse(q) : [];
  } catch {
    return [];
  }
}

function saveQueue(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

export const googleSyncService = {
  getScriptUrl() {
    return localStorage.getItem(URL_KEY) || DEFAULT_URL;
  },

  setScriptUrl(url) {
    localStorage.setItem(URL_KEY, url);
    this.startSync();
  },

  enqueueRecord(record) {
    const q = getQueue();
    // Avoid duplicates if we edit the same record multiple times
    const existingIdx = q.findIndex(r => r.id === record.id);
    if (existingIdx >= 0) {
      q[existingIdx] = record;
    } else {
      q.push(record);
    }
    saveQueue(q);
    this.processQueue();
  },

  async processQueue() {
    if (isSyncing) return;
    
    const url = this.getScriptUrl();
    if (!url) return;

    const q = getQueue();
    if (q.length === 0) return;

    if (!navigator.onLine) return; // Don't try if offline

    isSyncing = true;

    try {
      // Send all pending records as a batch
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(q)
      });

      const result = await response.json();
      
      if (result.result === 'success') {
        // Clear queue on success
        saveQueue([]);
      }
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      // It will retry later
    } finally {
      isSyncing = false;
    }
  },

  startSync() {
    if (syncInterval) clearInterval(syncInterval);
    // Try to sync every 15 seconds
    syncInterval = setInterval(() => this.processQueue(), 15000);
    // Also try to sync when we come back online
    window.addEventListener('online', () => this.processQueue());
    // Initial try
    this.processQueue();
  }
};

// Start background process
googleSyncService.startSync();
