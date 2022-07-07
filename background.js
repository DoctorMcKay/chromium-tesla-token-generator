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
			// Initialize net request rules for this tab

			g_OurTabIds[sender.tab.id] = {
				codeVerifier: msg.codeVerifier,
				codeChallenge: msg.codeChallenge
			};

			// It really isn't all that important that we block this request, and I'm not even sure that it's necessary
			// to add this block rule since we're closing the tab before it even makes the request, but let's do this
			// anyway to be a good citizen.
			chrome.declarativeNetRequest.updateSessionRules({
				addRules: [
					{
						id: sender.tab.id,
						condition: {
							tabIds: [sender.tab.id],
							urlFilter: '|https://auth.tesla.com/void/callback*',
							resourceTypes: ['main_frame']
						},
						action: {
							type: 'block'
						}
					}
				]
			});

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

	// Edge doesn't like it if we try to redirect to an extension page, even with declarativeNetRequest.
	// So instead, create a new tab and close the old one.
	let tab = await chrome.tabs.get(info.tabId);
	let newTab = await chrome.tabs.create({
		url: 'auth.html',
		index: tab.index
	});

	g_OurTabIds[newTab.id] = g_OurTabIds[tab.id];
	delete g_OurTabIds[tab.id];

	chrome.tabs.remove(tab.id);

	chrome.declarativeNetRequest.updateSessionRules({
		removeRuleIds: [tab.id]
	});
}, {urls: ['https://auth.tesla.com/void/callback*']});
