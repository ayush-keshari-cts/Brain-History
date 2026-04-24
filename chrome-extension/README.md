# BrainHistory Chrome Extension

Save any webpage to your BrainHistory knowledge library in one click.

---

## How it works

1. User clicks the extension icon on any webpage
2. Extension reads the current tab URL + title
3. Checks if the user is signed in via the BrainHistory session cookie
4. User can edit the title, add tags + notes, then click **Save**
5. Extension calls `/api/content` on the BrainHistory server — same API the web app uses

Authentication is handled entirely through the browser session cookie — no separate login
needed if the user is already signed in to BrainHistory in the same Chrome profile.

---

## File structure

```
chrome-extension/
├── manifest.json       ← Extension config (Manifest V3)
├── popup.html          ← UI (self-contained, no dependencies)
├── popup.js            ← All popup logic
├── background.js       ← Service worker (opens app on first install)
├── icons/
│   ├── make-icons.html ← Open in browser to generate PNG icons
│   ├── icon16.png      ← (generate with make-icons.html)
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Setup before first use

### 1. Generate icons

Open `icons/make-icons.html` in any browser and download all 4 PNG files into the `icons/` folder.

### 2. Set your production URL

Open `popup.js` and update line 1:

```js
const BRAINHISTORY_URL = "https://your-actual-domain.com";
```

Also update the same URL in `manifest.json` under `host_permissions` and in `background.js`.

### 3. Enable CORS on your Next.js app

`src/middleware.ts` has already been created in the app — it allows Chrome extensions to call
the BrainHistory API using the user's session cookie.

---

## Local development / testing

To test against localhost:

1. Temporarily add `"http://localhost:3000/*"` to `host_permissions` in `manifest.json`
2. Change `BRAINHISTORY_URL = "http://localhost:3000"` in `popup.js`
3. Load the extension as an unpacked extension (see below)

**Remove localhost entries before publishing to the Chrome Web Store.**

---

## Load as unpacked extension (dev)

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. The BrainHistory icon appears in the toolbar

---

## Publishing to Chrome Web Store

### Prepare

- [ ] Icons generated and in `icons/` (16, 32, 48, 128 px PNG)
- [ ] `BRAINHISTORY_URL` updated to production domain in `popup.js`, `manifest.json`, `background.js`
- [ ] Localhost entries removed from `host_permissions`
- [ ] Create a ZIP of the `chrome-extension/` folder (not including `README.md` is fine)

### Submit

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the one-time $5 developer registration fee (if not already done)
3. Click **New item** → upload the ZIP
4. Fill in:
   - **Name:** BrainHistory – Save to Library
   - **Short description** (132 chars): Save any webpage, video, or article to your BrainHistory knowledge library in one click.
   - **Detailed description:** (explain features, auth, privacy)
   - **Category:** Productivity
   - **Language:** English
   - **Screenshots:** at least 1 × 1280×800 or 640×400
   - **Promotional tile:** 440×280 PNG (optional but recommended)
5. **Privacy disclosures:**
   - The extension accesses the current tab URL to save it
   - It sends the URL to the BrainHistory server (your own server)
   - No data is sent to third parties
   - Add a Privacy Policy URL (can be hosted on your BrainHistory site, e.g. `/privacy`)
6. Submit for review — Google reviews take 1–7 business days

### Permissions justification (for review)

| Permission   | Reason |
|--------------|--------|
| `activeTab`  | To read the current tab's URL and title when the user clicks the extension icon |
| `storage`    | Reserved for future preferences (currently unused) |
| `host_permissions: brainhistory.app` | To call the BrainHistory API and send the session cookie for authentication |

---

## Update flow

1. Bump `"version"` in `manifest.json`
2. Re-zip the folder
3. Go to your item in the Developer Dashboard → **Package** → upload new ZIP
4. Submit for review
