// Public account address only; never put account credentials or API tokens here.
(() => {
  const statsOrigin = 'https://palestyhr.goatcounter.com';
  if (location.hostname !== 'palestyhr.github.io') return;


  // A first-party opt-out avoids the tracker's blocking alert dialog.
  const optOutKey = 'homepage.analytics.disabled';
  const toggle = location.hash === '#toggle-goatcounter';
  const forceOff = location.hash === '#analytics-off';
  let disabled = false;
  try {
    disabled = localStorage.getItem(optOutKey) === '1';
    if (toggle || forceOff) {
      disabled = forceOff || !disabled;
      if (disabled) localStorage.setItem(optOutKey, '1');
      else localStorage.removeItem(optOutKey);
    }
  } catch (_) {
    // The explicit opt-out still applies to this load if storage is blocked.
    if (toggle || forceOff) disabled = true;
  }
  if (toggle || forceOff) {
    history.replaceState(null, '', location.pathname + location.search);
    const status = document.createElement('span');
    status.className = 'analytics-status';
    status.setAttribute('role', 'status');
    status.textContent = disabled ? 'Analytics disabled for this browser.' : 'Analytics enabled for this browser.';
    document.querySelector('footer')?.appendChild(status);
  }
  // Keep alternate homepage URLs and navigation hashes in one page bucket.
  const path = location.pathname === '/' || location.pathname === '/index.html'
    ? '/' : location.pathname;
  let referrer = '';
  try {
    if (document.referrer) {
      const source = new URL(document.referrer);
      if (source.origin !== location.origin) referrer = source.origin;
    }
  } catch (_) { /* Ignore malformed referrers. */ }

  window.goatcounter = {
    path,
    title: path === '/' ? 'Youbin He @PolyU' : 'My Journey - Youbin He @PolyU',
    referrer,
    no_events: true,
  };
  const tracker = document.createElement('script');
  tracker.src = 'https://gc.zgo.at/count.js';
  tracker.async = true;
  tracker.dataset.goatcounter = `${statsOrigin}/count`;
  tracker.referrerPolicy = 'no-referrer';
  if (!disabled) document.head.appendChild(tracker);

  // The public TOTAL counter is separate from the private analytics dashboard.
  // Its response may be cached for up to four hours by the service.
  const counter = document.querySelector('.visitor-count');
  const value = document.querySelector('[data-visitor-count]');
  if (!counter || !value) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  fetch(`${statsOrigin}/counter/TOTAL.json`, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error('Visitor counter unavailable');
      return response.json();
    })
    .then((data) => {
      const count = String(data.count ?? '');
      if (!/^\d[\d\s,.]*$/.test(count)) return;
      value.textContent = count;
      counter.hidden = false;
    })
    .catch(() => { /* A blocked or unavailable counter must not disrupt the page. */ })
    .finally(() => clearTimeout(timeout));
})();