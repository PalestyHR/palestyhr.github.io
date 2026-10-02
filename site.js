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
  document.querySelectorAll('main .card').forEach((section) => observer.observe(section));
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
