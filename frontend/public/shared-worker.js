// Shared Worker: a single instance shared by every open tab of the app.
// It tells the other tabs when one of them changes the schedule.

const ports = new Set();
let lastChange = null; // shared state: the latest change, even for tabs opened later

function sendToAll(message) {
  for (const port of ports) port.postMessage(message);
}

function sendToOthers(message, origin) {
  for (const port of ports) {
    if (port !== origin) port.postMessage(message);
  }
}

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = (message) => {
    const data = message.data || {};

    if (data.type === 'schedule-changed') {
      lastChange = { action: String(data.action || 'change'), time: Date.now() };
      sendToOthers({ type: 'schedule-changed', ...lastChange }, port);
    }

    if (data.type === 'disconnect') {
      ports.delete(port);
      sendToAll({ type: 'tabs', total: ports.size });
    }
  };

  // The new tab gets the current state and every other tab learns there is one more
  port.postMessage({ type: 'init', total: ports.size, lastChange });
  sendToOthers({ type: 'tabs', total: ports.size }, port);
};
