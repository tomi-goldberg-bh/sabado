const DEFAULT_URL = `ws://${window.location.hostname}:3001`;

let ws = null;
let reconnectTimer = null;
let isConnected = false;
let subscriptions = new Set();

function notify(event, data) {
  subscriptions.forEach(cb => { try { cb(event, data); } catch {} });
}

export const syncService = {
  connect(url = DEFAULT_URL) {
    if (ws) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        isConnected = true;
        notify('status', true);
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      };
      ws.onclose = () => {
        isConnected = false;
        notify('status', false);
        ws = null;
        reconnectTimer = setTimeout(() => this.connect(url), 3000);
      };
      ws.onerror = () => {};
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          notify(msg.type, msg.data);
        } catch {}
      };
    } catch {
      isConnected = false;
      notify('status', false);
    }
  },

  disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) { ws.close(); ws = null; }
    isConnected = false;
    notify('status', false);
  },

  send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  },

  saveRecord(record) {
    this.send({ type: 'save_record', record });
  },

  deleteRecord(id) {
    this.send({ type: 'delete_record', id });
  },

  closeDay(date) {
    this.send({ type: 'close_day', date });
  },

  subscribe(callback) {
    subscriptions.add(callback);
    return () => subscriptions.delete(callback);
  },

  isConnected() { return isConnected; },
};
