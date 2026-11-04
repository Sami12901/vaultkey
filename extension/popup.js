let currentDomain = '';
let activeTabId = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initStatus();
  initCurrentTab();
  initGenerator();
  initSearch();
  initLockBtn();
});

// 1. Tabs
function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// 2. Status
function initStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');

  chrome.runtime.sendMessage({ action: 'CHECK_STATUS' }, (res) => {
    if (res && res.success && res.state === 'UNLOCKED') {
      dot.className = 'status-dot online';
      text.innerText = 'Connected';
    } else if (res && res.state === 'LOCKED') {
      dot.className = 'status-dot locked';
      text.innerText = 'Vault Locked';
    } else {
      dot.className = 'status-dot';
      text.innerText = 'App Closed';
    }
  });
}

// 3. Current Tab & Matches
async function initCurrentTab() {
  const domainEl = document.getElementById('active-domain');
  const listEl = document.getElementById('logins-list');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].url) {
      domainEl.innerText = 'No active webpage';
      listEl.innerHTML = '<div class="empty-state">Navigate to a website to see matching logins.</div>';
      return;
    }

    const tab = tabs[0];
    activeTabId = tab.id;
    const url = new URL(tab.url);
    if (!url.protocol.startsWith('http')) {
      domainEl.innerText = url.protocol;
      listEl.innerHTML = '<div class="empty-state">VaultKey autofill operates on standard web pages.</div>';
      return;
    }

    currentDomain = url.hostname.replace(/^www\./, '').toLowerCase();
    domainEl.innerText = currentDomain;

    loadMatchesForDomain(currentDomain, listEl);
  } catch (err) {
    domainEl.innerText = 'Browser Page';
    listEl.innerHTML = '<div class="empty-state">Cannot access active tab.</div>';
  }
}

function loadMatchesForDomain(domain, listEl) {
  chrome.runtime.sendMessage({ action: 'GET_MATCHES', domain }, (res) => {
    if (!res || !res.success) {
      if (res && res.state === 'LOCKED') {
        listEl.innerHTML = `
          <div class="empty-state">
            🔒 <strong>Desktop Vault is Locked</strong><br/>
            Please unlock VaultKey in your desktop app to access logins.
          </div>`;
      } else {
        listEl.innerHTML = `
          <div class="empty-state">
            ⚠️ <strong>VaultKey Desktop Offline</strong><br/>
            Please start VaultKey on your PC to enable autofill.
          </div>`;
      }
      return;
    }

    const matches = res.matches || [];
    if (matches.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          No saved logins for <strong>${escapeHtml(domain)}</strong>.<br/><br/>
          <em>Tip: Log in or sign up on this page and VaultKey will prompt to auto-save!</em>
        </div>`;
      return;
    }

    listEl.innerHTML = '';
    matches.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'login-card';
      card.innerHTML = `
        <div class="login-title">${escapeHtml(item.title || domain)}</div>
        <div class="login-user">${escapeHtml(item.username || 'No username')}</div>
        <div class="login-actions">
          <button class="btn-fill" data-id="${item.id}">
            <svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Autofill
          </button>
          <button class="btn-copy" data-copy-user="${escapeHtml(item.username || '')}">Copy User</button>
          <button class="btn-copy" data-copy-pass-id="${item.id}">Copy Pass</button>
        </div>
      `;
      listEl.appendChild(card);
    });

    // Wire action buttons
    listEl.querySelectorAll('.btn-fill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        autofillTabWithId(id, btn);
      });
    });

    listEl.querySelectorAll('[data-copy-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const user = btn.getAttribute('data-copy-user');
        navigator.clipboard.writeText(user);
        btn.innerText = 'Copied!';
        setTimeout(() => (btn.innerText = 'Copy User'), 1500);
      });
    });

    listEl.querySelectorAll('[data-copy-pass-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-copy-pass-id');
        btn.innerText = '...';
        chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS', itemId: id }, (res) => {
          if (res && res.success && res.password) {
            navigator.clipboard.writeText(res.password);
            btn.innerText = 'Copied!';
          } else {
            btn.innerText = 'Failed';
          }
          setTimeout(() => (btn.innerText = 'Copy Pass'), 1500);
        });
      });
    });
  });
}

function autofillTabWithId(itemId, btn) {
  btn.innerText = 'Filling...';
  chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS', itemId }, (res) => {
    if (!res || !res.success) {
      btn.innerText = 'Failed';
      setTimeout(() => (btn.innerText = 'Autofill'), 1500);
      return;
    }

    const { username, password } = res;
    if (activeTabId) {
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        func: (u, p) => {
          const passInputs = document.querySelectorAll('input[type="password"]');
          const userInputs = document.querySelectorAll('input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[id*="user" i]');

          if (userInputs.length > 0 && u) {
            userInputs[0].value = u;
            userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            userInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          }

          if (passInputs.length > 0 && p) {
            passInputs[0].value = p;
            passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            passInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        args: [username, password]
      });

      btn.innerText = 'Filled!';
      setTimeout(() => window.close(), 600);
    }
  });
}

// 4. Generator
function initGenerator() {
  const slider = document.getElementById('len-slider');
  const lenVal = document.getElementById('len-val');
  const passText = document.getElementById('gen-pass-text');
  const copyBtn = document.getElementById('btn-copy-gen');
  const regenBtn = document.getElementById('btn-regen');
  const fillBtn = document.getElementById('btn-fill-gen');

  const chkUpper = document.getElementById('chk-upper');
  const chkLower = document.getElementById('chk-lower');
  const chkNumbers = document.getElementById('chk-numbers');
  const chkSymbols = document.getElementById('chk-symbols');

  function generate() {
    const len = parseInt(slider.value, 10);
    lenVal.innerText = String(len);

    let charset = '';
    if (chkLower.checked) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (chkUpper.checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chkNumbers.checked) charset += '0123456789';
    if (chkSymbols.checked) charset += '!@#$%^&*()-_=+[]{}|;:,.<>?';

    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz';

    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    let pass = '';
    for (let i = 0; i < len; i++) {
      pass += charset[array[i] % charset.length];
    }
    passText.innerText = pass;
  }

  slider.addEventListener('input', generate);
  chkUpper.addEventListener('change', generate);
  chkLower.addEventListener('change', generate);
  chkNumbers.addEventListener('change', generate);
  chkSymbols.addEventListener('change', generate);
  regenBtn.addEventListener('click', generate);

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(passText.innerText);
    copyBtn.innerText = 'Copied!';
    setTimeout(() => (copyBtn.innerText = 'Copy'), 1500);
  });

  fillBtn.addEventListener('click', () => {
    const pass = passText.innerText;
    if (activeTabId && pass) {
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        func: (p) => {
          const passInputs = document.querySelectorAll('input[type="password"]');
          if (passInputs.length > 0) {
            passInputs.forEach((inp) => {
              inp.value = p;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            });
          }
        },
        args: [pass]
      });

      fillBtn.innerText = 'Filled in Page!';
      setTimeout(() => window.close(), 600);
    }
  });

  generate();
}

// 5. Search
function initSearch() {
  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');
  let timeout = null;

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    if (!q) {
      resultsEl.innerHTML = '<div class="empty-state">Type a query to search vault.</div>';
      return;
    }

    timeout = setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'SEARCH', query: q }, (res) => {
        if (!res || !res.success || !res.results || res.results.length === 0) {
          resultsEl.innerHTML = '<div class="empty-state">No matching logins found.</div>';
          return;
        }

        resultsEl.innerHTML = '';
        res.results.forEach((item) => {
          const card = document.createElement('div');
          card.className = 'login-card';
          card.innerHTML = `
            <div class="login-title">${escapeHtml(item.title)}</div>
            <div class="login-user">${escapeHtml(item.username || '')}</div>
            <div class="login-actions">
              <button class="btn-fill" data-id="${item.id}">Autofill</button>
              <button class="btn-copy" data-copy-user="${escapeHtml(item.username || '')}">Copy User</button>
              <button class="btn-copy" data-copy-pass-id="${item.id}">Copy Pass</button>
            </div>
          `;
          resultsEl.appendChild(card);
        });

        resultsEl.querySelectorAll('.btn-fill').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            autofillTabWithId(id, btn);
          });
        });

        resultsEl.querySelectorAll('[data-copy-user]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const user = btn.getAttribute('data-copy-user');
            navigator.clipboard.writeText(user);
            btn.innerText = 'Copied!';
            setTimeout(() => (btn.innerText = 'Copy User'), 1500);
          });
        });

        resultsEl.querySelectorAll('[data-copy-pass-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-copy-pass-id');
            btn.innerText = '...';
            chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS', itemId: id }, (res) => {
              if (res && res.success && res.password) {
                navigator.clipboard.writeText(res.password);
                btn.innerText = 'Copied!';
              } else {
                btn.innerText = 'Failed';
              }
              setTimeout(() => (btn.innerText = 'Copy Pass'), 1500);
            });
          });
        });
      });
    }, 250);
  });
}

// 6. Lock
function initLockBtn() {
  const lockBtn = document.getElementById('btn-lock-vault');
  lockBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'LOCK' }, () => {
      initStatus();
      const listEl = document.getElementById('logins-list');
      listEl.innerHTML = '<div class="empty-state">🔒 Vault is now locked.</div>';
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
