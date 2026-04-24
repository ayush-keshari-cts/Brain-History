/**
 * BrainHistory Chrome Extension – Popup Script
 *
 * Flow:
 *   1. Get current tab URL + title
 *   2. Call /api/extension/status to check auth (credentials: include)
 *   3. If authenticated → show save form
 *   4. On save → POST /api/content (existing route, credentials: include)
 *
 * ⚠️  Update BRAINHISTORY_URL to your production domain before publishing
 *     to the Chrome Web Store.
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const BRAINHISTORY_URL = "https://brainhistory.app"; // TODO: update before publishing

// ─── State machine ────────────────────────────────────────────────────────────
const STATES = ["loading", "unsaveable", "auth", "form", "saved", "error"];

function showOnly(name) {
  STATES.forEach((s) => {
    const el = document.getElementById("state-" + s);
    if (el) el.classList.toggle("hidden", s !== name);
  });
}

// ─── Helper: shorten URL for display ─────────────────────────────────────────
function shortenUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    const full = u.hostname + path;
    return full.length > 46 ? full.slice(0, 46) + "…" : full;
  } catch {
    return url.slice(0, 46);
  }
}

// ─── Helper: check if a URL can be saved ─────────────────────────────────────
function isUnsaveable(url) {
  if (!url) return true;
  const blocked = ["chrome://", "chrome-extension://", "about:", "moz-extension://", "edge://", "data:"];
  return blocked.some((p) => url.startsWith(p));
}

// ─── Helper: get element by id ───────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── Init ─────────────────────────────────────────────────────────────────────
let currentTabUrl = "";

async function init() {
  showOnly("loading");

  // 1. Get current tab
  let tab = null;
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = t;
  } catch {
    showOnly("auth");
    return;
  }

  currentTabUrl = tab?.url ?? "";
  const pageTitle = tab?.title ?? "";

  // 2. Check if this page is saveable
  if (isUnsaveable(currentTabUrl)) {
    showOnly("unsaveable");
    return;
  }

  // 3. Populate form fields early
  const urlDisplay = $("url-display");
  if (urlDisplay) {
    urlDisplay.textContent = shortenUrl(currentTabUrl);
    urlDisplay.title = currentTabUrl;
  }
  const titleInput = $("input-title");
  if (titleInput) titleInput.value = pageTitle;

  const favicon = $("favicon");
  if (favicon && currentTabUrl) {
    try {
      const { hostname } = new URL(currentTabUrl);
      favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
    } catch { /* ignore */ }
  }

  // 4. Check authentication
  try {
    const res = await fetch(`${BRAINHISTORY_URL}/api/extension/status`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();

    if (data.authenticated) {
      const nameEl = $("user-name");
      const avatarEl = $("user-avatar");
      if (nameEl) nameEl.textContent = data.user?.name || data.user?.email || "Signed in";
      if (avatarEl && data.user?.image) {
        avatarEl.src = data.user.image;
        avatarEl.style.display = "block";
      }
      showOnly("form");
    } else {
      showOnly("auth");
    }
  } catch {
    // Network error or CORS – show auth prompt
    showOnly("auth");
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function handleSave() {
  const url   = currentTabUrl;
  const title = ($("input-title")?.value ?? "").trim();
  const tagsRaw = ($("input-tags")?.value ?? "").trim();
  const notes = ($("input-notes")?.value ?? "").trim();
  const tags  = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // Update button UI
  const btn     = $("save-btn");
  const spinner = $("save-spinner");
  const icon    = $("save-icon");
  const btnText = $("save-btn-text");
  if (btn)     btn.disabled = true;
  if (spinner) spinner.classList.remove("hidden");
  if (icon)    icon.classList.add("hidden");
  if (btnText) btnText.textContent = "Saving…";

  try {
    const res = await fetch(`${BRAINHISTORY_URL}/api/content`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, tags, notes }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && (data.success || data.contentId)) {
      const savedTitle = $("saved-title");
      if (savedTitle) savedTitle.textContent = data.title || title || url;
      showOnly("saved");
    } else {
      // Possible duplicate or extraction failure — still mostly a success UX
      const msg = data.details
        ? `${data.error ?? "Error"}: ${data.details}`
        : (data.error ?? `HTTP ${res.status}`);
      $("error-message").textContent = msg;
      showOnly("error");
      resetSaveBtn();
    }
  } catch {
    $("error-message").textContent =
      "Network error. Make sure you are signed in to BrainHistory and the app is reachable.";
    showOnly("error");
    resetSaveBtn();
  }
}

function resetSaveBtn() {
  const btn     = $("save-btn");
  const spinner = $("save-spinner");
  const icon    = $("save-icon");
  const btnText = $("save-btn-text");
  if (btn)     btn.disabled = false;
  if (spinner) spinner.classList.add("hidden");
  if (icon)    icon.classList.remove("hidden");
  if (btnText) btnText.textContent = "Save to BrainHistory";
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Save form
  $("save-btn")?.addEventListener("click", handleSave);

  // Open app buttons
  const openApp = () => { chrome.tabs.create({ url: BRAINHISTORY_URL }); window.close(); };
  const openSignin = () => { chrome.tabs.create({ url: BRAINHISTORY_URL + "/login" }); window.close(); };
  const openLibrary = () => { chrome.tabs.create({ url: BRAINHISTORY_URL + "/dashboard" }); window.close(); };

  $("open-app-btn")?.addEventListener("click", openApp);
  $("signin-btn")?.addEventListener("click", openSignin);
  $("view-library-btn")?.addEventListener("click", openLibrary);
  $("view-saved-btn")?.addEventListener("click", openLibrary);
  $("error-signin-btn")?.addEventListener("click", openSignin);

  // Save another — reset form and re-init for current tab
  $("save-another-btn")?.addEventListener("click", () => {
    $("input-title").value = "";
    $("input-tags").value  = "";
    $("input-notes").value = "";
    resetSaveBtn();
    init();
  });

  // Retry — go back to form
  $("retry-btn")?.addEventListener("click", () => {
    resetSaveBtn();
    showOnly("form");
  });

  // Allow Cmd/Ctrl + Enter to save from any field
  ["input-title", "input-tags", "input-notes"].forEach((id) => {
    $(id)?.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
    });
  });

  // Run init
  init();
});
