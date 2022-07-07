# Tesla Access Token Generator

There are a number of useful third-party services and apps that integrate with Tesla vehicle and energy products,
but as of yet Tesla doesn't have an OAuth API that's open to the public. The only way to get access to Tesla product
data, therefore, is using an authentication token.

This extension for Chrome and Chromium based browsers enables you to get those tokens easily and safely. All
communication goes directly to tesla.com; in fact, auth.tesla.com is the only origin declared in the extension's
manifest so Chromium's security model prevents sending credentials or any other data to any server besides Tesla.

**Why is the extension requesting access to read my browsing history?** Because of the way that Tesla's authentication
server works, it's necessary to watch your browsing traffic to detect when the login has completed. This particular
login request is the only thing that the extension is watching for.

Once you have the extension installed, click the Tesla Access Token Generator button on your toolbar to get started.

- [Get it from the Chrome Web Store](https://chrome.google.com/webstore/detail/tesla-access-token-genera/kokkedfblmfbngojkeaepekpidghjgag)
- [Get it from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tesla-access-token-genera/mjpplpkadjdmedpklcioagjgaflfphbo)
