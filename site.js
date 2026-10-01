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
