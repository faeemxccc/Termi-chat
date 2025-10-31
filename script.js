// Replace this with your own Firebase config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSBKJybnPVa5RmQLcAlhOx2XAT3SpYMqc",
  authDomain: "termi-f0dda.firebaseapp.com",
  projectId: "termi-f0dda",
  storageBucket: "termi-f0dda.firebasestorage.app",
  messagingSenderId: "719932587451",
  appId: "1:719932587451:web:a54da904dc0585c1aa989e",
  measurementId: "G-QPS2RN6Z3C"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const chat = document.getElementById('chat');
const inputForm = document.getElementById('input-form');
const cmdline = document.getElementById('cmdline');
const prompt = document.getElementById('prompt');

let username = '';
let history = [];
let historyIndex = -1; // -1 means current input

// Prompt for username first
function askUsername() {
  renderPrompt({ user: 'login', host: 'terminal', path: '~', symbol: '$' });
  cmdline.setAttribute('data-placeholder', 'Enter username...');
  cmdline.focus();
}

function setPrompt() {
  renderPrompt({ user: username, host: 'terminal', path: '~', symbol: '$' });
  cmdline.setAttribute('data-placeholder', 'Type message...');
}

function renderPrompt({ user, host, path, symbol }) {
  if (!prompt) return;
  prompt.innerHTML = '';
  const dot = document.createElement('span');
  dot.className = 'status-dot';

  const userSpan = document.createElement('span');
  userSpan.className = 'user';
  userSpan.textContent = user;

  const at = document.createElement('span');
  at.className = 'at';
  at.textContent = '@';

  const hostSpan = document.createElement('span');
  hostSpan.className = 'host';
  hostSpan.textContent = host;

  const pathSpan = document.createElement('span');
  pathSpan.className = 'path';
  pathSpan.textContent = ':' + path;

  const sym = document.createElement('span');
  sym.className = 'symbol';
  sym.textContent = symbol;

  prompt.appendChild(dot);
  prompt.appendChild(userSpan);
  prompt.appendChild(at);
  prompt.appendChild(hostSpan);
  prompt.appendChild(pathSpan);
  prompt.appendChild(sym);
}

async function sendMessage(message, clientId = null) {
  const timestamp = new Date().toISOString();
  const payload = {
    username,
    message,
    timestamp
  };
  if (clientId) payload.clientId = clientId;
  await db.collection('messages').add(payload);
}

function renderMessage(data, docId) {
  const time = new Date(data.timestamp).toLocaleTimeString();

  const row = document.createElement('div');
  row.className = 'msg';
  if (docId) row.setAttribute('data-doc-id', docId);
  if (data.clientId) row.setAttribute('data-client-id', data.clientId);

  const ts = document.createElement('span');
  ts.className = 'time';
  ts.textContent = `[${time}]`;

  const user = document.createElement('span');
  user.className = 'user';
  user.textContent = data.username + ':';
  // apply a deterministic color per username
  try { user.style.color = colorForUser(data.username); } catch (e) { /* ignore */ }

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = ' ' + data.message;

  row.appendChild(ts);
  row.appendChild(user);
  row.appendChild(text);

  // If there's a pending local echo with matching clientId, replace it smoothly
  if (data.clientId) {
    const pending = chat.querySelector(`[data-client-id="${data.clientId}"]`);
    if (pending) {
      pending.replaceWith(row);
      trimMessages(20);
      chat.scrollTop = chat.scrollHeight;
      return;
    }
  }

  chat.appendChild(row);
  // Trim old messages and keep scroll at bottom
  trimMessages(20);
  chat.scrollTop = chat.scrollHeight;
}

// deterministic color generator for usernames
function colorForUser(name) {
  if (!name) return '#9eff9e';
  // simple hash
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
    h = h & h;
  }
  // map to hue 0-360
  const hue = Math.abs(h) % 360;
  // pick vibrant saturation/lightness
  return `hsl(${hue} 78% 58%)`;
}

// Keep only the last `limit` message elements in the chat container to
// avoid unbounded DOM growth. This trims oldest elements first.
function trimMessages(limit = 20) {
  if (!chat) return;
  // select both normal messages and system messages
  const nodes = chat.querySelectorAll('.msg, .system-msg');
  const removeCount = nodes.length - limit;
  if (removeCount > 0) {
    for (let i = 0; i < removeCount; i++) {
      const n = nodes[i];
      if (n && n.parentElement === chat) n.remove();
    }
  }
}

// Listen to DB changes incrementally to avoid clearing the whole chat (prevents flicker)
db.collection('messages')
  .orderBy('timestamp')
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        renderMessage(change.doc.data(), change.doc.id);
      }
      // future: handle 'modified' and 'removed' if needed
    });
  });

// Handle Enter on the contenteditable cmdline
cmdline.addEventListener('keydown', async (e) => {
  // Navigate history
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (history.length === 0) return;
    historyIndex = Math.max(0, historyIndex === -1 ? history.length - 1 : historyIndex - 1);
    cmdline.innerText = history[historyIndex] || '';
    placeCaretAtEnd(cmdline);
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (history.length === 0) return;
    if (historyIndex === -1) return;
    historyIndex = Math.min(history.length - 1, historyIndex + 1);
    cmdline.innerText = historyIndex === history.length - 1 ? '' : (history[historyIndex] || '');
    placeCaretAtEnd(cmdline);
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const value = cmdline.innerText.replace(/\u00A0/g, ' ').trim();
    if (!value) return;
    // push into history
    history.push(value);
    historyIndex = -1;

    // Local commands start with /
    if (value.startsWith('/')) {
      handleLocalCommand(value);
      cmdline.innerText = '';
      return;
    }

    if (!username) {
      username = value;
      echoSystem(`Logged in as ${username}`);
      cmdline.innerText = '';
      setPrompt();
    } else {
      // generate a clientId for local pending echo so we can replace it when the DB confirms
      const clientId = 'c' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      // echo the command locally as a terminal echo (pending)
      echoCommand(value, clientId);
      await sendMessage(value, clientId);
      cmdline.innerText = '';
    }
  }
});

function placeCaretAtEnd(el) {
  el.focus();
  if (typeof window.getSelection != 'undefined'
      && typeof document.createRange != 'undefined') {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function echoCommand(cmd, clientId = null) {
  const row = document.createElement('div');
  row.className = 'msg cmd-echo pending';
  // Create structured echo so username can be colored
  const userText = prompt.querySelector('.user')?.textContent || '';
  const host = prompt.querySelector('.host')?.textContent || '';
  const sym = prompt.querySelector('.symbol')?.textContent || '$';

  const ts = document.createElement('span');
  ts.className = 'time';
  ts.textContent = ''; // no timestamp for local echo

  const userSpan = document.createElement('span');
  userSpan.className = 'user';
  userSpan.textContent = userText + ':';
  try { userSpan.style.color = colorForUser(userText); } catch (e) {}

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = ' ' + cmd + ' ' + sym;

  row.appendChild(ts);
  row.appendChild(userSpan);
  row.appendChild(text);
  if (clientId) row.setAttribute('data-client-id', clientId);
  chat.appendChild(row);
  trimMessages(20);
  chat.scrollTop = chat.scrollHeight;
}

function echoSystem(text) {
  const row = document.createElement('div');
  row.className = 'system-msg';
  row.textContent = text;
  chat.appendChild(row);
  trimMessages(20);
  chat.scrollTop = chat.scrollHeight;
}

function handleLocalCommand(str) {
  const parts = str.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  if (cmd === '/nick' || cmd === '/nick:') {
    const newName = parts.slice(1).join(' ');
    if (!newName) return echoSystem('Usage: /nick NEWNAME');
    const old = username;
    username = newName;
    setPrompt();
    echoSystem(`User ${old || '(not set)'} changed name to ${username}`);
    return;
  }
  if (cmd === '/help') {
    echoSystem('Commands: /nick NEWNAME, /clear, /say MESSAGE, /help');
    return;
  }
  if (cmd === '/clear') {
    chat.innerHTML = '';
    return;
  }
  if (cmd === '/say') {
    const message = parts.slice(1).join(' ');
    if (!message) return echoSystem('Usage: /say MESSAGE');
    const clientId = 'c' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    echoCommand(message, clientId);
    // optionally send as system or broadcast; here we send as user message
    if (username) sendMessage(message, clientId);
    return;
  }
  echoSystem(`Unknown command: ${cmd}`);
}

// Start with username prompt
askUsername();

// ensure focus cycles into cmdline when clicking prompt area
document.addEventListener('click', (e) => {
  if (!document.activeElement || document.activeElement.id !== 'cmdline') {
    cmdline.focus();
  }
});

// simple toolbar menu behavior (Docs link)
const btnMenu = document.getElementById('btn-menu');
const menuDropdown = document.getElementById('menu-dropdown');
function openMenu() { if (!btnMenu || !menuDropdown) return; btnMenu.setAttribute('aria-expanded','true'); menuDropdown.setAttribute('aria-hidden','false'); menuDropdown.querySelector('.menu-item, a')?.focus(); }
function closeMenu() { if (!btnMenu || !menuDropdown) return; btnMenu.setAttribute('aria-expanded','false'); menuDropdown.setAttribute('aria-hidden','true'); }
btnMenu && btnMenu.addEventListener('click', (e) => { e.stopPropagation(); const open = menuDropdown.getAttribute('aria-hidden') === 'false'; if (open) closeMenu(); else openMenu(); });
document.addEventListener('click', (e) => { if (!menuDropdown) return; if (!menuDropdown.contains(e.target) && e.target !== btnMenu) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// --- Welcome modal behavior ---
const welcomeModal = document.getElementById('welcome-modal');
const startBtn = document.getElementById('start-btn');
const modalClose = document.querySelector('.modal-close');
const dontShowCheckbox = document.getElementById('dont-show');

function showModal() {
  if (!welcomeModal) return;
  welcomeModal.setAttribute('aria-hidden', 'false');
}
function hideModal() {
  if (!welcomeModal) return;
  welcomeModal.setAttribute('aria-hidden', 'true');
}

startBtn && startBtn.addEventListener('click', () => {
  if (dontShowCheckbox && dontShowCheckbox.checked) {
    localStorage.setItem('tc_hide_welcome', '1');
  }
  hideModal();
  cmdline.focus();
});
modalClose && modalClose.addEventListener('click', () => {
  if (dontShowCheckbox && dontShowCheckbox.checked) {
    localStorage.setItem('tc_hide_welcome', '1');
  }
  hideModal();
  cmdline.focus();
});

// Show modal unless user disabled it
if (localStorage.getItem('tc_hide_welcome') !== '1') {
  // small timeout so everything mounts nicely
  window.addEventListener('load', () => setTimeout(showModal, 180));
}
