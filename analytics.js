(() => {
  "use strict";

  const ANALYTICS = {
    hostname: "palestyhr.github.io",
    origin: "https://palestyhr.goatcounter.com",
    trackerScript: "https://gc.zgo.at/count.js",
    optOutKey: "homepage.analytics.disabled",
    counterTimeoutMilliseconds: 10_000,
  };

  function readAnalyticsPreference() {
    const toggleRequested = location.hash === "#toggle-goatcounter";
    const disableRequested = location.hash === "#analytics-off";
    const changed = toggleRequested || disableRequested;
    let disabled = false;

    try {
      disabled = localStorage.getItem(ANALYTICS.optOutKey) === "1";
      if (changed) {
        disabled = disableRequested || !disabled;
        if (disabled) localStorage.setItem(ANALYTICS.optOutKey, "1");
        else localStorage.removeItem(ANALYTICS.optOutKey);
      }
    } catch {
      // Honor an explicit opt-out for this load even when storage is blocked.
      if (changed) disabled = true;
    }
    return { disabled, changed };
  }

  function showAnalyticsPreference(disabled) {
    history.replaceState(null, "", location.pathname + location.search);
    const status = document.createElement("span");
    status.className = "analytics-status";
    status.setAttribute("role", "status");
    status.textContent = disabled
      ? "Analytics disabled for this browser."
      : "Analytics enabled for this browser.";
    document.querySelector("footer")?.appendChild(status);
  }

  function externalReferrerOrigin() {
    if (!document.referrer) return "";
    try {
      const source = new URL(document.referrer);
      if (source.origin !== location.origin) return source.origin;
    } catch {
      // A malformed referrer does not affect page rendering or tracking setup.
    }
    return "";
  }

  function configureTracker() {
    let path = location.pathname;
    if (path === "/index.html") path = "/";

    let title = "My Journey - Youbin He @PolyU";
    if (path === "/") title = "Youbin He @PolyU";

    window.goatcounter = {
      path,
      title,
      referrer: externalReferrerOrigin(),
      no_events: true,
    };
  }

  function loadTracker() {
    const tracker = document.createElement("script");
    tracker.src = ANALYTICS.trackerScript;
    tracker.async = true;
    tracker.dataset.goatcounter = `${ANALYTICS.origin}/count`;
    tracker.referrerPolicy = "no-referrer";
    document.head.appendChild(tracker);
  }

  async function updateVisitorCount() {
    const counter = document.querySelector(".visitor-count");
    const value = document.querySelector("[data-visitor-count]");
    if (!counter || !value) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      ANALYTICS.counterTimeoutMilliseconds,
    );

    try {
      const response = await fetch(`${ANALYTICS.origin}/counter/TOTAL.json`, {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (!response.ok) return;

      const data = await response.json();
      const count = String(data.count ?? "");
      if (!/^\d[\d\s,.]*$/.test(count)) return;

      value.textContent = count;
      counter.hidden = false;
    } catch {
      // Analytics failures must leave the public page usable and the counter hidden.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Restrict counting to the production host; local previews must not create visits.
  if (location.hostname !== ANALYTICS.hostname) return;

  const preference = readAnalyticsPreference();
  if (preference.changed) showAnalyticsPreference(preference.disabled);
  configureTracker();
  if (!preference.disabled) loadTracker();
  // The public total remains available independently of the tracking preference.
  updateVisitorCount();
})();
