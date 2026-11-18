(() => {
  "use strict";

  const SITE_TITLE = "Youbin He @PolyU";
  const TILT_OPTIONS = {
    maximumAngleDegrees: 0.75,
    anglePerUnitDistance: 0.55,
    horizontalShadowPixels: 2,
    verticalShadowPixels: 8,
    verticalShadowRangePixels: 1.2,
  };
  const NEWS_SCROLL_OPTIONS = {
    minimumThumbPixels: 18,
    keyboardStepPixels: 32,
  };

  function greetingForHour(hour) {
    if (hour >= 5 && hour < 12) return "Morning!";
    if (hour >= 12 && hour < 14) return "Had lunch?";
    if (hour >= 14 && hour < 18) return "Good afternoon!";
    if (hour >= 18 && hour < 22) return "Good evening!";
    return "Still up?";
  }

  function initializeGreeting() {
    const headline = document.querySelector(".greeting-main");
    if (!headline) return;

    function updateGreeting() {
      const greeting = greetingForHour(new Date().getHours());
      if (headline.textContent !== greeting) headline.textContent = greeting;
    }

    function updateVisibleGreeting() {
      if (!document.hidden) updateGreeting();
    }

    updateGreeting();
    document.addEventListener("visibilitychange", updateVisibleGreeting);
    window.setInterval(updateVisibleGreeting, 60_000);
  }

  function initializeSectionEntrance() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal-enter");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 },
    );

    for (const section of document.querySelectorAll("main .card, .news-feed")) {
      observer.observe(section);
    }
  }

  function initializePageTitle() {
    if (document.querySelector(".journey-card")) {
      document.title = `My Journey - ${SITE_TITLE}`;
      return;
    }

    const sectionTitles = {
      "#publications": "Publications",
      "#about": "About Me",
    };
    document.title = SITE_TITLE;

    function updateTitle(hash) {
      const section = sectionTitles[hash];
      if (section) document.title = `${section} - ${SITE_TITLE}`;
    }

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      const modifiedClick =
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        modifiedClick
      )
        return;

      const target = new URL(link.href, location.href);
      if (
        target.origin === location.origin &&
        target.pathname === location.pathname
      ) {
        updateTitle(target.hash);
      }
    });
    window.addEventListener("hashchange", () => updateTitle(location.hash));
  }

  function attachPointerTilt(surface, motionQuery, options) {
    const pointer = { x: 0, y: 0, frame: 0 };

    function resetTilt() {
      cancelAnimationFrame(pointer.frame);
      pointer.frame = 0;
      // Preserve the current axis while the angle returns to zero to avoid a sideways twist.
      surface.style.setProperty("--tilt-angle", "0deg");
      surface.style.removeProperty("--hover-shadow-x");
      surface.style.removeProperty("--hover-shadow-y");
    }

    function updateTilt() {
      pointer.frame = 0;
      const bounds = surface.getBoundingClientRect();
      const relativeX = ((pointer.x - bounds.left) / bounds.width) * 2 - 1;
      const relativeY = ((pointer.y - bounds.top) / bounds.height) * 2 - 1;
      const x = Math.max(-1, Math.min(1, relativeX));
      const y = Math.max(-1, Math.min(1, relativeY));
      const distance = Math.hypot(x, y);
      const angle = Math.min(
        options.maximumAngleDegrees,
        distance * options.anglePerUnitDistance,
      );
      const shadowX = -x * options.horizontalShadowPixels;
      const shadowY =
        options.verticalShadowPixels - y * options.verticalShadowRangePixels;

      surface.style.setProperty("--tilt-axis-x", distance ? -y / distance : 1);
      surface.style.setProperty("--tilt-axis-y", distance ? x / distance : 0);
      surface.style.setProperty("--tilt-angle", `${angle}deg`);
      surface.style.setProperty("--hover-shadow-x", `${shadowX}px`);
      surface.style.setProperty("--hover-shadow-y", `${shadowY}px`);
    }

    function handlePointerMove(event) {
      if (!motionQuery.matches || event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!pointer.frame) pointer.frame = requestAnimationFrame(updateTilt);
    }

    surface.addEventListener("pointermove", handlePointerMove);
    surface.addEventListener("pointerleave", resetTilt);
    surface.addEventListener("pointercancel", resetTilt);
    motionQuery.addEventListener("change", resetTilt);
    window.addEventListener("blur", resetTilt);
  }

  function initializePointerTilt() {
    const motionQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    for (const surface of document.querySelectorAll(
      ".section-module > .card, .news-feed",
    )) {
      attachPointerTilt(surface, motionQuery, TILT_OPTIONS);
    }
  }

  function measureNewsScrollbar(feed, rail, minimumThumbPixels) {
    const maximumScroll = Math.max(0, feed.scrollHeight - feed.clientHeight);
    const railHeight = rail.clientHeight;
    const contentRatio = feed.clientHeight / feed.scrollHeight;
    const thumbHeight = Math.min(
      railHeight,
      Math.max(minimumThumbPixels, railHeight * contentRatio),
    );
    return {
      maximumScroll,
      thumbHeight,
      thumbTravel: railHeight - thumbHeight,
    };
  }

  function initializeNewsScrollbar() {
    const feed = document.querySelector("#news-feed");
    const rail = document.querySelector(".news-scrollbar");
    if (!feed || !rail) return;

    const thumb = rail.querySelector(".news-scroll-thumb");
    let dragStart = null;

    function updateScrollbar() {
      const { maximumScroll, thumbHeight, thumbTravel } = measureNewsScrollbar(
        feed,
        rail,
        NEWS_SCROLL_OPTIONS.minimumThumbPixels,
      );
      const position = maximumScroll
        ? (feed.scrollTop / maximumScroll) * thumbTravel
        : 0;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${position}px)`;
      rail.setAttribute("aria-valuemax", maximumScroll);
      rail.setAttribute("aria-valuenow", Math.round(feed.scrollTop));
      rail.setAttribute("aria-disabled", maximumScroll ? "false" : "true");
      rail.tabIndex = maximumScroll ? 0 : -1;
    }

    function startDrag(event) {
      const { maximumScroll, thumbTravel, thumbHeight } = measureNewsScrollbar(
        feed,
        rail,
        NEWS_SCROLL_OPTIONS.minimumThumbPixels,
      );
      if (!maximumScroll || !thumbTravel || event.button !== 0) return;
      event.preventDefault();

      if (event.target !== thumb) {
        const pointerPosition =
          event.clientY - rail.getBoundingClientRect().top;
        feed.scrollTop =
          ((pointerPosition - thumbHeight / 2) / thumbTravel) * maximumScroll;
      }
      dragStart = { pointerY: event.clientY, scrollTop: feed.scrollTop };
      rail.setPointerCapture(event.pointerId);
    }

    function moveDrag(event) {
      if (!dragStart) return;
      const { maximumScroll, thumbTravel } = measureNewsScrollbar(
        feed,
        rail,
        NEWS_SCROLL_OPTIONS.minimumThumbPixels,
      );
      if (!thumbTravel) return;
      const pointerDistance = event.clientY - dragStart.pointerY;
      feed.scrollTop =
        dragStart.scrollTop + (pointerDistance / thumbTravel) * maximumScroll;
    }

    function stopDrag() {
      dragStart = null;
    }

    function handleScrollKey(event) {
      let distance;
      switch (event.key) {
        case "ArrowDown":
          distance = NEWS_SCROLL_OPTIONS.keyboardStepPixels;
          break;
        case "ArrowUp":
          distance = -NEWS_SCROLL_OPTIONS.keyboardStepPixels;
          break;
        case "PageDown":
          distance = feed.clientHeight;
          break;
        case "PageUp":
          distance = -feed.clientHeight;
          break;
        case "Home":
          distance = -feed.scrollHeight;
          break;
        case "End":
          distance = feed.scrollHeight;
          break;
        default:
          return;
      }
      event.preventDefault();
      feed.scrollTop += distance;
    }

    rail.addEventListener("pointerdown", startDrag);
    rail.addEventListener("pointermove", moveDrag);
    rail.addEventListener("lostpointercapture", stopDrag);
    rail.addEventListener("pointerup", stopDrag);
    rail.addEventListener("pointercancel", stopDrag);
    rail.addEventListener("keydown", handleScrollKey);
    feed.addEventListener("scroll", updateScrollbar, { passive: true });

    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(feed);
    observer.observe(feed.querySelector(".news-list"));
    updateScrollbar();
  }

  initializeGreeting();
  initializeSectionEntrance();
  initializePageTitle();
  initializePointerTilt();
  initializeNewsScrollbar();
})();
