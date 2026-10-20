(() => {
  const headline = document.querySelector('.greeting-main');
  if (!headline) return;
  function greetingForHour(hour) {
    if (hour >= 5 && hour < 12) return 'Morning!';
    if (hour >= 12 && hour < 14) return 'Had lunch?';
    if (hour >= 14 && hour < 18) return 'Good afternoon!';
    if (hour >= 18 && hour < 22) return 'Good evening!';
    return 'Still up?';
  }
  function updateGreeting() {
    const greeting = greetingForHour(new Date().getHours());
    if (headline.textContent !== greeting) headline.textContent = greeting;
  }
  updateGreeting();
  // Refresh when a tab returns to the foreground or stays open across a boundary.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateGreeting();
  });
  setInterval(() => { if (!document.hidden) updateGreeting(); }, 60000);
})();

(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-enter');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('main .card, .news-feed').forEach((section) => observer.observe(section));
})();

// Show the homepage identity until a visitor chooses a section.
(() => {
  const suffix = 'Youbin He @PolyU';
  if (document.querySelector('.journey-card')) {
    document.title = `My Journey - ${suffix}`;
    return;
  }
  document.title = suffix;
  function titleForHash(hash) {
    const section = hash === '#publications' ? 'Publications' : hash === '#about' ? 'About Me' : null;
    if (section) document.title = `${section} - ${suffix}`;
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = new URL(link.href, location.href);
    if (target.origin === location.origin && target.pathname === location.pathname) titleForHash(target.hash);
  });
  window.addEventListener('hashchange', () => titleForHash(location.hash));
})();

// A small pointer-driven tilt complements the independent hover translation.
(() => {
  const motion = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  document.querySelectorAll('.section-module > .card, .news-feed').forEach((surface) => {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      // Keep the last axis while the angle returns to zero, avoiding a sideways turn.
      surface.style.setProperty('--tilt-angle', '0deg');
      surface.style.removeProperty('--hover-shadow-x');
      surface.style.removeProperty('--hover-shadow-y');
    }
    surface.addEventListener('pointermove', (event) => {
      if (!motion.matches || event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = surface.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (pointerX - rect.left) / rect.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (pointerY - rect.top) / rect.height * 2 - 1));
        const distance = Math.hypot(x, y);
        surface.style.setProperty('--tilt-axis-x', distance ? -y / distance : 1);
        surface.style.setProperty('--tilt-axis-y', distance ? x / distance : 0);
        surface.style.setProperty('--tilt-angle', `${Math.min(.35, distance * .25)}deg`);
        surface.style.setProperty('--hover-shadow-x', `${-x * 2}px`);
        surface.style.setProperty('--hover-shadow-y', `${8 - y * 1.2}px`);
      });
    });
    surface.addEventListener('pointerleave', reset);
    surface.addEventListener('pointercancel', reset);
    motion.addEventListener('change', reset);
    window.addEventListener('blur', reset);
  });
})();

// Keep a visible news scroll rail even before the update list fills its viewport.
(() => {
  const feed = document.querySelector('#news-feed');
  const rail = document.querySelector('.news-scrollbar');
  if (!feed || !rail) return;
  const thumb = rail.firstElementChild;
  let drag = null;
  function dimensions() {
    const maximum = Math.max(0, feed.scrollHeight - feed.clientHeight);
    const height = rail.clientHeight;
    const thumbHeight = Math.min(height, Math.max(18, height * feed.clientHeight / feed.scrollHeight));
    return {maximum, height, thumbHeight, travel: height - thumbHeight};
  }
  function update() {
    const {maximum, thumbHeight, travel} = dimensions();
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${maximum ? feed.scrollTop / maximum * travel : 0}px)`;
    rail.setAttribute('aria-valuemax', maximum);
    rail.setAttribute('aria-valuenow', Math.round(feed.scrollTop));
    rail.setAttribute('aria-disabled', maximum ? 'false' : 'true');
    rail.tabIndex = maximum ? 0 : -1;
  }
  rail.addEventListener('pointerdown', event => {
    const {maximum, travel, thumbHeight} = dimensions();
    if (!maximum || !travel || event.button !== 0) return;
    event.preventDefault();
    if (event.target !== thumb) feed.scrollTop = (event.clientY - rail.getBoundingClientRect().top - thumbHeight / 2) / travel * maximum;
    drag = {y: event.clientY, scroll: feed.scrollTop};
    rail.setPointerCapture(event.pointerId);
  });
  rail.addEventListener('pointermove', event => {
    if (!drag) return;
    const {maximum, travel} = dimensions();
    if (travel) feed.scrollTop = drag.scroll + (event.clientY - drag.y) / travel * maximum;
  });
  const stopDrag = () => { drag = null; };
  rail.addEventListener('lostpointercapture', stopDrag);
  rail.addEventListener('pointerup', stopDrag);
  rail.addEventListener('pointercancel', stopDrag);
  rail.addEventListener('keydown', event => {
    const changes = {ArrowDown: 32, ArrowUp: -32, PageDown: feed.clientHeight, PageUp: -feed.clientHeight, Home: -feed.scrollHeight, End: feed.scrollHeight};
    if (!(event.key in changes)) return;
    event.preventDefault();
    feed.scrollTop += changes[event.key];
  });
  feed.addEventListener('scroll', update, {passive: true});
  new ResizeObserver(update).observe(feed);
  new ResizeObserver(update).observe(feed.querySelector('.news-list'));
  update();
})();
