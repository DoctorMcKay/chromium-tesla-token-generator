let g_OurTabIds = {};

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.create({
		url: 'get_token.html'
	}, function(newTab) {
		g_OurTabIds[newTab.id] = true;
	});
});

chrome.webRequest.onBeforeRequest.addListener(function(info) {
	if (!g_OurTabIds[info.tabId]) {
		console.log('Ignoring callback because it was not in a tab opened by us');
		return;
	}

	// Auth succeeded
	chrome.tabs.sendMessage(info.tabId, {type: 'authSuccess', url: info.url});
	return {cancel: true};
}, {urls: ['https://auth.tesla.com/void/callback*']}, ['blocking']);

chrome.webRequest.onHeadersReceived.addListener(function(info) {
	if (!g_OurTabIds[info.tabId]) {
		console.log(`Ignoring request to ${info.url} because it was not in a tab opened by us`);
		return;
	}

	let headers = info.responseHeaders;
	for (let i = headers.length - 1; i >= 0; i--) {
		let header = headers[i].name.toLowerCase();
		if (header == 'x-frame-options' || header == 'frame-options') {
			headers.splice(i, 1); // Remove header
		}
	}

	return {responseHeaders: headers};
}, {urls: ['https://auth.tesla.com/*']}, ['blocking', 'responseHeaders', chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS]);
