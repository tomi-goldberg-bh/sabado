const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

let db = { records: {}, closedDays: [] };

try {
  db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
} catch {}

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getTodayKey() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  ws.clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  ws.send(JSON.stringify({ type: 'init', data: db }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'save_record': {
        const { record } = msg;
        if (!record.id) record.id = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const date = record.date || getTodayKey();
        if (!db.records[date]) db.records[date] = [];
        const idx = db.records[date].findIndex(r => r.id === record.id);
        if (idx >= 0) {
          db.records[date][idx] = record;
        } else {
          db.records[date].push(record);
        }
        saveDb();
        broadcast({ type: 'new_record', data: { record, date } }, ws.clientId);
        ws.send(JSON.stringify({ type: 'ack', data: { id: record.id } }));
        break;
      }
      case 'delete_record': {
        const { id } = msg;
        for (const date of Object.keys(db.records)) {
          db.records[date] = db.records[date].filter(r => r.id !== id);
          if (db.records[date].length === 0) delete db.records[date];
        }
        saveDb();
        broadcast({ type: 'deleted_record', data: { id } }, ws.clientId);
        break;
      }
      case 'close_day': {
        const { date } = msg;
        if (!db.closedDays.includes(date)) db.closedDays.push(date);
        saveDb();
        broadcast({ type: 'day_closed', data: { date, by: ws.clientId } });
        break;
      }
    }
  });
});

function broadcast(message, excludeId) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.clientId !== excludeId) {
      client.send(data);
    }
  });
}

console.log(`Sync server running on ws://0.0.0.0:${PORT}`);
