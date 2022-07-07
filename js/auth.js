const outputDiv = document.getElementById('output');

main();
async function main() {
	let response = await chrome.runtime.sendMessage({type: 'finalizeAuth'});
	if (!response) {
		fatalError('This login attempt has expired.');
		return;
	}

	let {codeVerifier, codeChallenge, authUrl} = response;

	let qsPos = authUrl.indexOf('?');
	let rawQueryString = authUrl.substring(qsPos + 1).split('&');
	let queryString = {};
	rawQueryString.forEach((rawQueryStringPart) => {
		let parts = rawQueryStringPart.split('=');
		queryString[parts[0]] = decodeURIComponent(parts.slice(1).join('='));
	});

	if (!queryString.code) {
		fatalError('Unable to login. No authorization code was issued.');
		return;
	}

	let xhr = new XMLHttpRequest();
	xhr.open('POST', (queryString.issuer || 'https://auth.tesla.com/oauth2/v3') + '/token');
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify({
		grant_type: 'authorization_code',
		client_id: 'ownerapi',
		code_verifier: codeVerifier,
		code: queryString.code,
		redirect_uri: authUrl.substring(0, qsPos)
	}));

	xhr.onreadystatechange = function() {
		if (xhr.readyState != XMLHttpRequest.DONE) {
			return;
		}

		try {
			let result = JSON.parse(xhr.responseText);
			document.getElementById('access-token').textContent = result.access_token || '(none returned)';
			document.getElementById('refresh-token').textContent = result.refresh_token || '(none returned)';
			document.getElementById('id-token').textContent = result.id_token || '(none returned)';
			document.getElementById('access-token-validity').textContent = `${result.expires_in / 60} minutes`;
			document.getElementById('output-tokens').style.display = 'block';

			outputDiv.style.display = 'block';
		} catch (ex) {
			fatalError('There was an error logging in. Invalid JSON was returned.');
		}
	};
}

// Set up click listeners
document.getElementById('tokens-show-more').addEventListener('click', function(event) {
	this.style.display = 'none';
	document.getElementById('output-tokens-more').style.display = 'block';
});

let codeTags = document.getElementsByTagName('code');
let g_ConfirmMessageClearTimer;
for (let i = 0; i < codeTags.length; i++) {
	codeTags[i].addEventListener('click', function() {
		if (!this.dataset.type) {
			return;
		}

		clearTimeout(g_ConfirmMessageClearTimer);
		navigator.clipboard.writeText(this.textContent);
		let confirmDiv = document.getElementById('confirm-message');
		confirmDiv.textContent = this.dataset.type + ' token copied!';

		g_ConfirmMessageClearTimer = setTimeout(() => {
			confirmDiv.textContent = '';
		}, 5000);
	});
}

function fatalError(msg) {
	outputDiv.className = 'fatal-error-message';
	outputDiv.textContent = msg;
	outputDiv.style.display = 'block';
}
