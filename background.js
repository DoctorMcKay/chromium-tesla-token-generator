chrome.action.onClicked.addListener(async function(tab) {
	let newTab = await chrome.tabs.create({url: 'setup.html'});
	await chrome.storage.session.set({[`tab_${newTab.id}`]: true});
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	async function handle() {
		if (!sender || !sender.tab || !sender.tab.id || !msg || !msg.type) {
			return;
		}

		let tabInfoKey = `tab_${sender.tab.id}`;
		let tabInfo = (await chrome.storage.session.get(tabInfoKey))[tabInfoKey];
		if (!tabInfo) {
			return;
		}

		switch (msg.type) {
			case 'init':
				await chrome.storage.session.set({
					[tabInfoKey]: {
						codeVerifier: msg.codeVerifier,
						codeChallenge: msg.codeChallenge
					}
				});
				return;

			case 'finalizeAuth':
				await chrome.storage.session.remove(tabInfoKey);
				return tabInfo;
		}
	}

	// returning true indicates that we're going to asyncronously use sendResponse()
	handle().then(result => sendResponse(result));
	return true;
});

chrome.webRequest.onBeforeRequest.addListener(async function(info) {
	let tabInfoKey = `tab_${info.tabId}`;
	let tabInfo = (await chrome.storage.session.get(tabInfoKey))[tabInfoKey];
	if (typeof tabInfo != 'object') {
		console.log('Ignoring callback because it was not in a tab opened by us');
		return;
	}

	// Auth succeeded
	tabInfo.authUrl = info.url;
	await chrome.storage.session.set({[tabInfoKey]: tabInfo});

	// Edge doesn't like it if we try to redirect to an extension page with declarativeNetRequest.
	// So instead, update its location here
	await chrome.tabs.update(info.tabId, {url: chrome.runtime.getURL('auth.html')});
}, {urls: ['https://auth.tesla.com/void/callback*']});
