main();
async function main() {
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

	await chrome.runtime.sendMessage({
		type: 'init',
		codeVerifier,
		codeChallenge
	});

	location.href = 'https://auth.tesla.com/oauth2/v3/authorize?' + Object.keys(queryString).map(k => `${k}=${encodeURIComponent(queryString[k])}`).join('&');
}

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
