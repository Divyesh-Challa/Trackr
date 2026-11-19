# Trackr Autofill (Chrome extension)

Fills Greenhouse, Lever and Ashby application forms from your Trackr profile and apply kit, and attaches your résumé PDF. It never submits: you press Submit, and then it saves what the form said as a receipt in Trackr. On other boards (Workday, Jobvite…), click the toolbar button for a side panel of copy-ready answers.

## Load it

1. `npm ci && npm run build`
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → pick `extension/dist`.
3. In Trackr, open Profile → **Extension tokens** → Create token. Paste it into the extension's options with your résumé PDF.

Dropdowns that only open for a real click (Greenhouse's) get a "Trackr suggests: …" note instead of being set.
