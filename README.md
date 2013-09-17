HTTP Nowhere
============

A browser extension to block unencrypted web traffic for added security.

This extension adds a button to your Firefox toolbar that lets you disable all unencrypted web requests and only permit those you choose. When URLs are blocked, an indicator appears on the button and you can then choose to allow or ignore them. You can also opt to try redirecting all non-secure urls to HTTPS.

Motivation
--
One of the most effective ways to improve your privacy on the web is to opt for encrypted communication whenever possible. By blocking plain HTTP web traffic by default, this extension gives you the power to decide exactly which unencrypted URLs you will permit your browser to request.

Screenshots
--
![Screenshot](https://raw.github.com/cwilper/http-nowhere/master/screenshot-button-menu.png "HTTP Nowhere Screenshot: Button Menu")

![Screenshot](https://raw.github.com/cwilper/http-nowhere/master/screenshot-prefs-allowed.png "HTTP Nowhere Screenshot: Allowed URLs")

![Screenshot](https://raw.github.com/cwilper/http-nowhere/master/screenshot-prefs-ignored.png "HTTP Nowhere Screenshot: Ignored URLs")

Compatibility with HTTPS Everywhere
--
HTTP Nowhere has been tested with and works when HTTPS Everywhere is installed. However, when both extensions are enabled, HTTP Nowhere effectively disables HTTPS Everywhere's automatic redirecting capability.

Compatibility with the Tor Browser Bundle
--
HTTP Nowhere has also been tested with the Tor Browser Bundle (TBB), and can be used to effectively prevent leaking unencrypted payloads to hostile exit nodes. Note that \*.onion sites will be blocked by default since they appear to the browser as unencrypted URLs. To enable them when HTTP Nowhere is enabled, just add the following to your list of Allowed HTTP URLs: \*.onion:80/\*

Changelog
--
**v2.1.0**
- For Firefox 20+, automatically tries https for hostnames entered in the urlbar
- For Firefox 20+, added new option to auto-redirect to HTTPS instead of blocking
- Cleaned up some extraneous console logging

**v2.0.2**
- Changed initial install location of button to right of urlbar based on review feedback
- Bugfix; added small (16px) versions of icons for small icon mode / non-Gnome browsers

**v2.0.1**
- Bugfix; removed use of non-widely supported Javascript string.startsWith method (problematic for Firefox 4).

**v2.0.0**
- No longer using browser proxy hack to block HTTP urls across the board
- Can now configure and manage allowed URLs, with * as wildcard
- Added button coloring & badge to indicate block (rather than proxy error page)
- Can also configure and manage ignored URLs
- Major code and UI overhaul
- Pre-4.0 versions of Firefox are no longer supported

**v1.0.0**
- First version, proof of concept, button-only
- Uses browser proxy settings to prevent all HTTP requests, causing them to fail with a proxy error
