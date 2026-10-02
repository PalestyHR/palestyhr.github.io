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

// Keep tab titles aligned with the active page or homepage section.
(() => {
  const suffix = 'Youbin He @PolyU';
  if (document.querySelector('.journey-card')) {
    document.title = `My Journey - ${suffix}`;
    return;
  }
  const sections = [...document.querySelectorAll('#about, #publications')];
  if (!sections.length) return;
  function titleFor(id) {
    document.title = `${id === 'publications' ? 'Publications' : 'About Me'} - ${suffix}`;
  }
  function titleFromHash() {
    titleFor(location.hash.slice(1));
  }
  titleFromHash();
  window.addEventListener('hashchange', titleFromHash);
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const header = document.querySelector('.navbar');
      const boundary = (header?.getBoundingClientRect().bottom || 0) + 100;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3;
      const active = sections.filter(section => section.getBoundingClientRect().top <= boundary).at(-1);
      titleFor(atBottom ? 'publications' : (active?.id || 'about'));
    });
  }, { passive: true });
})();
