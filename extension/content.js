(function () {
  const CURRENT_DOMAIN = window.location.hostname.replace(/^www\./, '').toLowerCase();
  let cachedMatches = null;
  let activeDropdown = null;

  // Track latest entered credentials on this page
  let latestCaptured = {
    username: '',
    password: '',
    time: 0
  };

  const SHIELD_SVG = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  `;

  // -------------------------------------------------------------
  // 1. In-Field Icon & Autofill Dropdown
  // -------------------------------------------------------------

  function attachIconsToInputs() {
    const passwordInputs = document.querySelectorAll('input[type="password"]:not([data-vaultkey-injected])');
    passwordInputs.forEach((input) => {
      injectIcon(input, 'password');
    });

    const usernameInputs = document.querySelectorAll(
      'input[type="email"]:not([data-vaultkey-injected]), input[name*="user" i]:not([data-vaultkey-injected]), input[name*="login" i]:not([data-vaultkey-injected]), input[name*="email" i]:not([data-vaultkey-injected]), input[id*="user" i]:not([data-vaultkey-injected]), input[id*="login" i]:not([data-vaultkey-injected])'
    );
    usernameInputs.forEach((input) => {
      if (input.type !== 'password' && input.type !== 'hidden' && input.type !== 'submit') {
        injectIcon(input, 'username');
      }
    });
  }

  function injectIcon(input, fieldType) {
    input.setAttribute('data-vaultkey-injected', 'true');

    // Create wrapper icon
    const iconBtn = document.createElement('div');
    iconBtn.className = 'vaultkey-field-icon';
    iconBtn.title = 'VaultKey Autofill';
    iconBtn.innerHTML = SHIELD_SVG;

    document.body.appendChild(iconBtn);

    function positionIcon() {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || input.offsetParent === null) {
        iconBtn.style.display = 'none';
        return;
      }
      iconBtn.style.display = 'flex';
      iconBtn.style.top = `${window.scrollY + rect.top + (rect.height - 22) / 2}px`;
      iconBtn.style.left = `${window.scrollX + rect.right - 28}px`;
    }

    positionIcon();
    window.addEventListener('resize', positionIcon);
    window.addEventListener('scroll', positionIcon);

    iconBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAutofillDropdown(input);
    });
  }

  function openAutofillDropdown(targetInput) {
    closeDropdown();

    chrome.runtime.sendMessage({ action: 'GET_MATCHES', domain: CURRENT_DOMAIN }, (res) => {
      if (!res || !res.success || !res.matches || res.matches.length === 0) {
        showTemporaryTooltip(targetInput, res?.state === 'LOCKED' ? 'Vault is locked (Unlock in VaultKey)' : 'No matching logins found');
        return;
      }

      cachedMatches = res.matches;
      renderDropdown(targetInput, res.matches);
    });
  }

  function renderDropdown(targetInput, matches) {
    const dropdown = document.createElement('div');
    dropdown.className = 'vaultkey-dropdown';

    const rect = targetInput.getBoundingClientRect();
    dropdown.style.top = `${window.scrollY + rect.bottom + 6}px`;
    dropdown.style.left = `${window.scrollX + rect.left}px`;

    let itemsHtml = '';
    matches.forEach((item) => {
      const initial = (item.title || item.username || 'V').charAt(0).toUpperCase();
      itemsHtml += `
        <div class="vaultkey-dropdown-item" data-item-id="${item.id}">
          <div class="vaultkey-item-avatar">${initial}</div>
          <div class="vaultkey-item-info">
            <div class="vaultkey-item-title">${escapeHtml(item.title || CURRENT_DOMAIN)}</div>
            <div class="vaultkey-item-sub">${escapeHtml(item.username || 'No username')}</div>
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = `
      <div class="vaultkey-dropdown-header">
        <span>VaultKey Logins (${matches.length})</span>
      </div>
      <div class="vaultkey-dropdown-list">
        ${itemsHtml}
      </div>
    `;

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;

    dropdown.querySelectorAll('.vaultkey-dropdown-item').forEach((itemEl) => {
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = itemEl.getAttribute('data-item-id');
        fillCredentials(itemId, targetInput);
        closeDropdown();
      });
    });

    setTimeout(() => {
      document.addEventListener('click', onDocClickClose);
    }, 10);
  }

  function fillCredentials(itemId, targetInput) {
    chrome.runtime.sendMessage({ action: 'GET_CREDENTIALS', itemId }, (res) => {
      if (!res || !res.success) return;

      const form = targetInput.form || targetInput.closest('form') || document;
      const usernameInput =
        form.querySelector('input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[id*="user" i]') ||
        (targetInput.type !== 'password' ? targetInput : null);

      const passwordInput =
        (targetInput.type === 'password' ? targetInput : null) ||
        form.querySelector('input[type="password"]');

      if (usernameInput && res.username) {
        setValueAndDispatch(usernameInput, res.username);
      }
      if (passwordInput && res.password) {
        setValueAndDispatch(passwordInput, res.password);
      }
    });
  }

  function setValueAndDispatch(input, value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function closeDropdown() {
    if (activeDropdown) {
      activeDropdown.remove();
      activeDropdown = null;
      document.removeEventListener('click', onDocClickClose);
    }
  }

  function onDocClickClose(e) {
    if (activeDropdown && !activeDropdown.contains(e.target)) {
      closeDropdown();
    }
  }

  function showTemporaryTooltip(targetInput, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'vaultkey-dropdown';
    tooltip.style.padding = '8px 12px';
    tooltip.style.fontSize = '12px';
    tooltip.style.color = '#94A3B8';
    tooltip.innerText = text;

    const rect = targetInput.getBoundingClientRect();
    tooltip.style.top = `${window.scrollY + rect.bottom + 6}px`;
    tooltip.style.left = `${window.scrollX + rect.left}px`;

    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2500);
  }

  // -------------------------------------------------------------
  // 2. Sign-Up / Login Capture & Floating Auto-Save Banner
  // -------------------------------------------------------------

  function monitorInputValues() {
    document.addEventListener('input', (e) => {
      const target = e.target;
      if (!target || target.tagName !== 'INPUT') return;

      if (target.type === 'password' && target.value.length >= 4) {
        latestCaptured.password = target.value;
        latestCaptured.time = Date.now();

        // Try to find the associated username in the same form/context
        const form = target.form || target.closest('form') || document;
        const userField = form.querySelector('input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[id*="user" i]');
        if (userField && userField.value) {
          latestCaptured.username = userField.value.trim();
        }
      } else if (target.type !== 'password' && target.value) {
        latestCaptured.username = target.value.trim();
      }
    }, true);
  }

  function monitorFormSubmissions() {
    // 1. Form submit event
    document.addEventListener('submit', (e) => {
      captureAndPromptSave(e.target);
    }, true);

    // 2. Button clicks (for modern AJAX/SPA forms)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, input[type="submit"], a[role="button"]');
      if (!btn) return;

      const text = (btn.innerText || btn.value || '').toLowerCase();
      if (
        text.includes('sign up') ||
        text.includes('register') ||
        text.includes('create account') ||
        text.includes('log in') ||
        text.includes('login') ||
        text.includes('submit') ||
        text.includes('continue')
      ) {
        setTimeout(() => {
          captureAndPromptSave(btn.form || document);
        }, 100);
      }
    }, true);
  }

  function captureAndPromptSave(container) {
    if (!container) container = document;

    const passInput = container.querySelector('input[type="password"]');
    const userInput = container.querySelector('input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[id*="user" i]');

    const password = passInput ? passInput.value : latestCaptured.password;
    const username = userInput && userInput.value ? userInput.value.trim() : latestCaptured.username;

    if (!password || password.length < 4) return;

    // Check if we should prompt
    showAutoSaveBanner({
      username: username || 'User',
      password: password,
      domain: CURRENT_DOMAIN,
      url: window.location.href
    });
  }

  function showAutoSaveBanner(data) {
    if (document.getElementById('vaultkey-auto-save-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'vaultkey-auto-save-banner';
    banner.className = 'vaultkey-save-banner';

    banner.innerHTML = `
      <div class="vaultkey-save-banner-header">
        <div class="vaultkey-save-brand">
          <svg style="width:16px;height:16px;fill:#10B981;" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          <span>VaultKey</span>
        </div>
        <button class="vaultkey-save-close" id="vaultkey-save-dismiss">&times;</button>
      </div>
      <div class="vaultkey-save-body">
        <div class="vaultkey-save-question">
          Save password for <span class="vaultkey-save-domain">${escapeHtml(data.domain)}</span>?
        </div>
        <div class="vaultkey-save-detail">
          <strong>User:</strong> ${escapeHtml(data.username)}
        </div>
        <div class="vaultkey-save-actions">
          <button class="vaultkey-btn-save" id="vaultkey-save-confirm">
            <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
            Save to Vault
          </button>
          <button class="vaultkey-btn-dismiss" id="vaultkey-save-cancel">Not Now</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const dismiss = () => {
      banner.style.animation = 'vaultkey-fade-in 0.15s ease reverse forwards';
      setTimeout(() => banner.remove(), 150);
    };

    document.getElementById('vaultkey-save-dismiss').addEventListener('click', dismiss);
    document.getElementById('vaultkey-save-cancel').addEventListener('click', dismiss);

    document.getElementById('vaultkey-save-confirm').addEventListener('click', () => {
      const saveBtn = document.getElementById('vaultkey-save-confirm');
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';

      chrome.runtime.sendMessage(
        {
          action: 'SAVE_CREDENTIALS',
          payload: {
            title: data.domain.charAt(0).toUpperCase() + data.domain.slice(1),
            username: data.username,
            password: data.password,
            url: data.url,
            domain: data.domain
          }
        },
        (res) => {
          if (res && res.success) {
            saveBtn.style.background = '#059669';
            saveBtn.innerText = 'Saved!';
            setTimeout(dismiss, 1200);
          } else {
            saveBtn.style.background = '#EF4444';
            saveBtn.innerText = res?.error || 'Failed (Unlock Vault)';
            setTimeout(dismiss, 3000);
          }
        }
      );
    });

    // Auto-dismiss after 15 seconds if ignored
    setTimeout(() => {
      if (document.getElementById('vaultkey-auto-save-banner')) {
        dismiss();
      }
    }, 15000);
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

  // Initialize
  attachIconsToInputs();
  monitorInputValues();
  monitorFormSubmissions();

  // Re-check for dynamically rendered inputs (e.g. single page applications)
  const observer = new MutationObserver(() => {
    attachIconsToInputs();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
