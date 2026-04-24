// BrainHistory – Background Service Worker
// Minimal: only handles install events and badge updates.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    // Open the app on first install so the user can sign in
    chrome.tabs.create({ url: "https://brainhistory.app" });
  }
});
