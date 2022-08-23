let g_OurTabIds = {};

chrome.action.onClicked.addListener(async function(tab) {
	let newTab = await chrome.tabs.create({url: 'setup.html'});
	g_OurTabIds[newTab.id] = true;
});

chrome.runtime.onMessage.addListener(function(msg, sender, respond) {
	if (!sender || !sender.tab || !sender.tab.id || !g_OurTabIds[sender.tab.id] || !msg || !msg.type) {
		return;
	}

	switch (msg.type) {
		case 'init':
			g_OurTabIds[sender.tab.id] = {
				codeVerifier: msg.codeVerifier,
				codeChallenge: msg.codeChallenge
			};
			break;

		case 'finalizeAuth':
			respond(g_OurTabIds[sender.tab.id]);
			delete g_OurTabIds[sender.tab.id];
			break;
	}
});

chrome.webRequest.onBeforeRequest.addListener(async function(info) {
	if (typeof g_OurTabIds[info.tabId] != 'object') {
		console.log('Ignoring callback because it was not in a tab opened by us');
		return;
	}

	// Auth succeeded
	let tabInfo = g_OurTabIds[info.tabId];
	tabInfo.authUrl = info.url;

	// Edge doesn't like it if we try to redirect to an extension page with declarativeNetRequest.
	// So instead, update its location here
	await chrome.tabs.update(info.tabId, {url: chrome.runtime.getURL('auth.html')});
}, {urls: ['https://auth.tesla.com/void/callback*']});
