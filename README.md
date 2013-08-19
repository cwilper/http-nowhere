HTTP Nowhere
============

A browser extension to block unencrypted web traffic for added security.

This extension adds a button to your Firefox toolbar that lets you disable all unencrypted web requests and only permit those you choose. When URLs are blocked, an indicator appears on the button and you can then choose to allow or ignore those URLs. You can also manually manage your allowed and ignored URLs and quickly switch between enabled (red) and disabled (gray) mode.

**Background:**
One of the most effective ways to improve your privacy on the web is to opt for encrypted communication whenever possible. By blocking plain HTTP web traffic by default, this extension gives you the power to decide exactly which unencrypted URLs, if any, you will permit your browser to make requests to on your behalf.

**Compatibility with HTTPS Everywhere:**
HTTP Nowhere has been tested with and works when HTTPS Everywhere is installed. However, when both extensions are enabled, HTTP Nowhere effectively disables HTTPS Everywhere's automatic redirecting capability.

**Compatibility with the Tor Browser Bundle:**
HTTP Nowhere has also been tested with the Tor Browser Bundle (TBB), and can be used to effectively prevent leaking unencrypted payloads to hostile exit nodes. Note that *.onion sites will be blocked by default since they appear to the browser as unencrypted URLs. To enable them when HTTP Nowhere is enabled, just add the following to your list of Allowed HTTP URLs: *.onion:80/*
