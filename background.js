let g_OurTabIds = {};

chrome.action.onClicked.addListener(async function(tab) {
	let newTab = await chrome.tabs.create({url: 'get_token.html'});
	g_OurTabIds[newTab.id] = true;
});

chrome.runtime.onMessage.addListener(function(msg, sender) {
	if (!sender || !sender.tab || !sender.tab.id || !g_OurTabIds[sender.tab.id]) {
		return;
	}

	if (msg && msg.type && msg.type == 'init') {
		// Initialize net request rules for this tab
		chrome.declarativeNetRequest.updateSessionRules({
			addRules: [
				{
					// This is the rule that strips x-frame-options from the auth frame
					id: sender.tab.id,
					condition: {
						tabIds: [sender.tab.id],
						urlFilter: '|https://auth.tesla.com/*'
					},
					action: {
						type: 'modifyHeaders',
						responseHeaders: [
							{
								header: 'x-frame-options',
								operation: 'remove'
							},
							{
								header: 'frame-options',
								operation: 'remove'
							}
						]
					}
				},
				{
					// This is the rule that blocks the /void/callback request
					id: sender.tab.id + 1,
					condition: {
						tabIds: [sender.tab.id],
						urlFilter: '|https://auth.tesla.com/void/callback*'
					},
					action: {
						type: 'block'
					}
				}
			]
		});
	}
});

chrome.webRequest.onBeforeRequest.addListener(function(info) {
	if (!g_OurTabIds[info.tabId]) {
		console.log('Ignoring callback because it was not in a tab opened by us');
		return;
	}

	// Auth succeeded
	chrome.tabs.sendMessage(info.tabId, {type: 'authSuccess', url: info.url});

	// We can now remove the rules for this tab
	chrome.declarativeNetRequest.updateSessionRules({
		removeRuleIds: [info.tabId, info.tabId + 1]
	});
}, {urls: ['https://auth.tesla.com/void/callback*']});
