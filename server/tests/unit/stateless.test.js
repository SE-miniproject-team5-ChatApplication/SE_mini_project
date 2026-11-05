// NFR-QA-7: socket handlers are stateless apart from connection maps, so that a
// Redis adapter can be added later (docs/SCALABILITY.md). This test fails when
// new in-memory state appears at the top level of the socket gateway, its
// handlers, the services, the middleware or the utilities. A new entry belongs
// in ALLOWED only with a reason, and in docs/SCALABILITY.md.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'src');
const DIRS = ['sockets', 'sockets/handlers', 'services', 'middleware', 'utils'];

// file -> names of the top-level state it may keep
const ALLOWED = {
  'middleware/auth.js': ['PUBLIC_ROUTES'], // a constant list of routes, only read
  'services/presenceService.js': ['sessions'], // connection map: userId -> open connections (REQ-PRS-4)
  'utils/eventBus.js': ['bus'], // in-process events; nothing listens across servers
  'utils/logger.js': ['REDACT_PATHS'], // a constant list of log fields, only read
  'utils/realtime.js': ['io'], // the Socket.IO server itself
  'utils/unsafeKeys.js': ['FORBIDDEN'], // a constant list of key names
};

// Top-level `let`, and top-level containers that can change at run time.
const STATE = /^(?:let\s+([A-Za-z_$][\w$]*)|(?:const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:new\s+(?:Map|Set|WeakMap|WeakSet|EventEmitter|Array)\b|\[))/gm;

function topLevelState() {
  const found = {};
  for (const dir of DIRS) {
    for (const file of fs.readdirSync(path.join(SRC, dir)).filter((f) => f.endsWith('.js'))) {
      const rel = `${dir}/${file}`;
      const text = fs.readFileSync(path.join(SRC, dir, file), 'utf8');
      for (const m of text.matchAll(STATE)) (found[rel] = found[rel] || []).push(m[1] || m[2]);
    }
  }
  return found;
}

describe('NFR-QA-7 stateless socket handlers', () => {
  test('the only top-level state is the allowed connection map and fixed objects', () => {
    expect(topLevelState()).toEqual(ALLOWED);
  });

  test('socket handler modules export only functions (init, register, onConnect, helpers)', () => {
    const dir = path.join(SRC, 'sockets', 'handlers');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      const exported = require(path.join(dir, file));
      for (const [name, value] of Object.entries(exported)) {
        expect([file, name, typeof value]).toEqual([file, name, 'function']);
      }
    }
  });
});
