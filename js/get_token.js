let teslaFrame = document.getElementById('tesla-frame');
let outputDiv = document.getElementById('output');

let codeVerifier = generateCodeVerifier();
let codeChallenge = generateCodeChallenge(codeVerifier);
let queryString = {
//        audience: '',
	client_id: 'ownerapi',
	code_challenge: codeChallenge,
	code_challenge_method: 'S256',
	locale: 'en',
	prompt: 'login',
	redirect_uri: 'https://auth.tesla.com/void/callback',
	response_type: 'code',
	scope: 'openid email offline_access',
	state: generateCodeChallenge(generateCodeVerifier())
};

teslaFrame.src = 'https://auth.tesla.com/oauth2/v3/authorize?' + Object.keys(queryString).map(k => `${k}=${encodeURIComponent(queryString[k])}`).join('&');

chrome.runtime.onMessage.addListener(function(msg, sender, respond) {
	if (msg.type != 'authSuccess') {
		console.warn('Unknown tab message');
		console.warn(msg);
		return;
	}

	let qsPos = msg.url.indexOf('?');
	let rawQueryString = msg.url.substring(qsPos + 1).split('&');
	let queryString = {};
	rawQueryString.forEach((rawQueryStringPart) => {
		let parts = rawQueryStringPart.split('=');
		queryString[parts[0]] = decodeURIComponent(parts.slice(1).join('='));
	});

	teslaFrame.style.display = 'none';
	outputDiv.style.display = 'block';

	if (!queryString.code) {
		outputDiv.textContent = 'Unable to login. No authorization code was issued.';
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
		redirect_uri: msg.url.substring(0, qsPos)
	}));

	xhr.onreadystatechange = function() {
		if (xhr.readyState != XMLHttpRequest.DONE) {
			return;
		}

		try {
			let result = JSON.parse(xhr.responseText);
			outputDiv.innerHTML = '<p><i>Click to copy a token</i></p>';
			outputDiv.innerHTML += `<div><b>Access Token:</b> <code data-type="Access">${result.access_token || '(none returned)'}</code></div>`;
			outputDiv.innerHTML += `<div><b>Refresh Token:</b> <code data-type="Refresh">${result.refresh_token || '(none returned)'}</code></div>`;
			outputDiv.innerHTML += `<div><b>ID Token:</b> <code data-type="ID">${result.id_token || '(none returned)'}</code></div>`;
			outputDiv.innerHTML += `<div><b>Valid Time:</b> ${result.expires_in / 60} minutes</div>`;
		} catch (ex) {
			outputDiv.textContent = 'There was an error logging in. Invalid JSON was returned.';
		}

		let codeTags = document.getElementsByTagName('code');
		for (let i = 0; i < codeTags.length; i++) {
			codeTags[i].addEventListener('click', function() {
				if (!this.dataset.type) {
					return;
				}

				navigator.clipboard.writeText(this.textContent);
				let confirmDiv = document.createElement('div');
				confirmDiv.className = 'confirm-message';
				confirmDiv.textContent = this.dataset.type + ' token copied!';
				outputDiv.appendChild(confirmDiv);

				setTimeout(() => {
					outputDiv.removeChild(confirmDiv);
				}, 5000);
			});
		}
	};
});

function generateCodeVerifier() {
	// Tesla might use something more sophisticated, but in my experience it's a 112-char alphanumeric string so let's just do that
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
	let output = '';
	for (let i = 0; i < 86; i++) {
		let rand = Math.floor(Math.random() * chars.length); // there are way more secure ways to do this, but this should be fine for our purposes
		output += chars[rand];
	}
	return output;
}

function generateCodeChallenge(verifier) {
	let hex = sha256(verifier);
	let binaryString = '';
	for (let i = 0; i < hex.length; i += 2) {
		let byteHex = hex.substring(i, i + 2);
		binaryString += String.fromCharCode(parseInt(byteHex, 16));
	}

	return btoa(binaryString)
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}
