const BRIDGE_URL = 'http://127.0.0.1:49152';

async function getAuthHeaders(includeContentType = true) {
  const data = await chrome.storage.local.get(['bridgeAuthToken']);
  const headers = {
    'X-VaultKey-Client': 'extension'
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (data && data.bridgeAuthToken) {
    headers['Authorization'] = `Bearer ${data.bridgeAuthToken}`;
    headers['X-VaultKey-Token'] = data.bridgeAuthToken;
  }
  return headers;
}

async function checkBridgeStatus() {
  try {
    const headers = await getAuthHeaders(false);
    const res = await fetch(`${BRIDGE_URL}/api/status`, {
      method: 'GET',
      headers
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Bridge offline
  }
  return { success: false, state: 'OFFLINE' };
}

async function getMatchesForDomain(domain) {
  try {
    const headers = await getAuthHeaders(true);
    const res = await fetch(`${BRIDGE_URL}/api/match`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ domain })
    });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'UNAUTHORIZED', paired: false, matches: [] };
    }
  } catch (e) {}
  return { success: false, matches: [] };
}

async function updateBadgeForTab(tabId, url) {
  if (!url || !url.startsWith('http')) {
    chrome.action.setBadgeText({ text: '', tabId });
    return;
  }

  try {
    const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    const data = await getMatchesForDomain(domain);
    if (data.success && data.matches && data.matches.length > 0) {
      chrome.action.setBadgeText({ text: String(data.matches.length), tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateBadgeForTab(tab.id, tab.url);
    }
  } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHECK_STATUS') {
    checkBridgeStatus().then(sendResponse);
    return true;
  }

  if (request.action === 'GET_MATCHES') {
    getMatchesForDomain(request.domain).then(sendResponse);
    return true;
  }

  if (request.action === 'SET_BRIDGE_TOKEN') {
    chrome.storage.local.set({ bridgeAuthToken: request.token }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'GET_BRIDGE_TOKEN') {
    chrome.storage.local.get(['bridgeAuthToken']).then((data) => {
      sendResponse({ token: data.bridgeAuthToken || '' });
    });
    return true;
  }

  if (request.action === 'GET_CREDENTIALS') {
    getAuthHeaders(true).then((headers) => {
      fetch(`${BRIDGE_URL}/api/get-credentials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId: request.itemId })
      })
        .then((res) => res.json())
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.action === 'SAVE_CREDENTIALS') {
    getAuthHeaders(true).then((headers) => {
      fetch(`${BRIDGE_URL}/api/save-credentials`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload)
      })
        .then((res) => res.json())
        .then((data) => {
          if (sender.tab && sender.tab.id && sender.tab.url) {
            updateBadgeForTab(sender.tab.id, sender.tab.url);
          }
          sendResponse(data);
        })
        .catch((err) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.action === 'SEARCH') {
    getAuthHeaders(true).then((headers) => {
      fetch(`${BRIDGE_URL}/api/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: request.query })
      })
        .then((res) => res.json())
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.action === 'LOCK') {
    getAuthHeaders(true).then((headers) => {
      fetch(`${BRIDGE_URL}/api/lock`, {
        method: 'POST',
        headers
      })
        .then((res) => res.json())
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }
});
