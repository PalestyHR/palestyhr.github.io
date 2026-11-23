const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { before, after, test } = require("node:test");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
};
let browser;
let server;
let origin;

async function fileResponse(url) {
  const pathname = new URL(url).pathname;
  const filename = path.join(ROOT, pathname === "/" ? "index.html" : pathname);
  try {
    const body = await fs.readFile(filename);
    return {
      status: 200,
      contentType: CONTENT_TYPES[path.extname(filename)],
      body,
    };
  } catch {
    return { status: 404, contentType: "text/plain", body: "Not found" };
  }
}

async function openPage(options = {}, filename = "index.html") {
  const context = await browser.newContext(options);
  await context.route("https://**/*", (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/${filename}`);
  return { context, page, errors };
}

before(async () => {
  server = http.createServer(async (request, response) => {
    const result = await fileResponse(new URL(request.url, "http://localhost"));
    response.writeHead(result.status, { "Content-Type": result.contentType });
    response.end(result.body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("both pages retain their content, local assets and responsive layout", async () => {
  const { context, page, errors } = await openPage({ reducedMotion: "reduce" });
  try {
    for (const filename of ["index.html", "journey.html"]) {
      for (const width of [1440, 1024, 900, 720, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${origin}/${filename}`);
        const content = await page.locator("main").innerText();
        assert.ok(
          content.includes(
            filename === "index.html"
              ? "Research Experience"
              : "Finding my direction",
          ),
        );

        const invalidIds = await page.evaluate(() => {
          const ids = [...document.querySelectorAll("[id]")].map(
            (element) => element.id,
          );
          return ids.length !== new Set(ids).size;
        });
        assert.equal(invalidIds, false);

        const layout = await page.evaluate(() => {
          const container = document
            .querySelector("main")
            .getBoundingClientRect();
          const sections = [
            ...document.querySelectorAll(
              "main > .section-module, .background-grid",
            ),
          ];
          return sections.every((section) => {
            const bounds = section.getBoundingClientRect();
            return (
              bounds.left >= container.left - 1 &&
              bounds.right <= container.right + 1
            );
          });
        });
        assert.equal(layout, true, `${filename} at ${width}px`);
      }

      const localAssets = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          "[src], link[href], a[href]",
        );
        return [...elements]
          .map((element) => element.src || element.href)
          .filter((url) => url && new URL(url).origin === location.origin);
      });
      for (const url of new Set(localAssets)) {
        const response = await page.request.get(url);
        assert.equal(response.status(), 200, url);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("greetings follow time boundaries and refresh with the clock", async () => {
  const context = await browser.newContext({ timezoneId: "Asia/Shanghai" });
  await context.route("https://**/*", (route) => route.abort());
  const page = await context.newPage();
  const cases = [
    [0, "Still up?"],
    [5, "Morning!"],
    [12, "Had lunch?"],
    [14, "Good afternoon!"],
    [18, "Good evening!"],
    [22, "Still up?"],
  ];
  try {
    await page.clock.install();
    for (const [hour, expected] of cases) {
      const time = `2026-11-19T${String(hour).padStart(2, "0")}:00:00+08:00`;
      await page.clock.setSystemTime(new Date(time));
      await page.goto(`${origin}/`);
      assert.equal(await page.locator(".greeting-main").innerText(), expected);
    }
    await page.clock.setSystemTime(new Date("2026-11-19T11:59:00+08:00"));
    await page.goto(`${origin}/`);
    await page.clock.runFor(60_000);
    assert.equal(
      await page.locator(".greeting-main").innerText(),
      "Had lunch?",
    );
  } finally {
    await context.close();
  }
});

test("navigation titles and section entrance work on the actual pages", async () => {
  const { context, page, errors } = await openPage();
  try {
    assert.equal(await page.title(), "Youbin He @PolyU");
    await page.locator('nav a[href="#publications"]').click();
    assert.equal(await page.title(), "Publications - Youbin He @PolyU");
    await page.locator("#news-feed").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      document.querySelector("#news-feed").classList.contains("reveal-enter"),
    );
    assert.equal(await page.locator('a[href="journey.html"]').count(), 0);
    await page.goto(`${origin}/journey.html`);
    assert.equal(await page.title(), "My Journey - Youbin He @PolyU");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("pointer tilt, matching shadows and reduced motion preserve their behavior", async () => {
  const { context, page, errors } = await openPage({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    await page.addStyleTag({ content: ".reveal-enter{animation:none}" });
    const surface = page.locator("#news-feed");
    await surface.scrollIntoViewIfNeeded();
    const bounds = await surface.boundingBox();
    for (const fraction of [0.05, 0.95]) {
      await page.mouse.move(
        bounds.x + bounds.width * fraction,
        bounds.y + bounds.height * 0.2,
      );
      await page.waitForFunction(
        () =>
          !!document
            .querySelector("#news-feed")
            .style.getPropertyValue("--tilt-angle"),
      );
      const tilt = await surface.evaluate((element) => ({
        angle: parseFloat(element.style.getPropertyValue("--tilt-angle")),
        axis: Number(element.style.getPropertyValue("--tilt-axis-y")),
        shadow: parseFloat(element.style.getPropertyValue("--hover-shadow-x")),
      }));
      assert.ok(tilt.angle > 0 && tilt.angle <= 0.75);
      assert.equal(Math.sign(tilt.axis), fraction < 0.5 ? -1 : 1);
      assert.equal(Math.sign(tilt.shadow), -Math.sign(tilt.axis));
      await page.mouse.move(0, 0);
      await page.waitForFunction(
        () =>
          document
            .querySelector("#news-feed")
            .style.getPropertyValue("--tilt-angle") === "0deg",
      );
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await surface.hover();
    assert.equal(
      await surface.evaluate((element) => getComputedStyle(element).rotate),
      "none",
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("News supports wheel, keyboard, track clicks, thumb dragging and resize", async () => {
  const { context, page, errors } = await openPage({ reducedMotion: "reduce" });
  const rail = page.locator(".news-scrollbar");
  const feed = page.locator("#news-feed");
  try {
    assert.equal(await rail.getAttribute("aria-disabled"), "true");
    await page.locator(".news-list").evaluate((list) => {
      for (let index = 0; index < 20; index++)
        list.append(list.firstElementChild.cloneNode(true));
    });
    await page.waitForFunction(
      () =>
        document
          .querySelector(".news-scrollbar")
          .getAttribute("aria-disabled") === "false",
    );
    await rail.focus();
    await page.keyboard.press("End");
    assert.equal(
      await feed.evaluate((element) => element.scrollTop),
      await feed.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    );
    await page.keyboard.press("Home");
    for (const key of ["ArrowDown", "PageDown", "ArrowUp", "PageUp"])
      await page.keyboard.press(key);
    await page.keyboard.press("Home");
    await feed.hover();
    await page.mouse.wheel(0, 150);
    await page.waitForFunction(
      () => document.querySelector("#news-feed").scrollTop > 0,
    );
    await rail.click({ position: { x: 2, y: 150 } });
    assert.ok(await feed.evaluate((element) => element.scrollTop > 0));
    await rail.focus();
    await page.keyboard.press("Home");
    const thumb = await page.locator(".news-scroll-thumb").boundingBox();
    await page.mouse.move(
      thumb.x + thumb.width / 2,
      thumb.y + thumb.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + 120);
    await page.mouse.up();
    assert.ok(await feed.evaluate((element) => element.scrollTop > 0));
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.waitForFunction(
      () =>
        Number(
          document
            .querySelector(".news-scrollbar")
            .getAttribute("aria-valuemax"),
        ) ===
        document.querySelector("#news-feed").scrollHeight -
          document.querySelector("#news-feed").clientHeight,
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("News highlighting, image zoom and touch behavior remain intact", async () => {
  const { context, page } = await openPage();
  try {
    await page.locator(".news-list li").first().hover();
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".news-list li"))
          .backgroundColor === "rgba(126, 169, 203, 0.14)",
    );
    await page.locator(".paper-figure").hover();
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".paper-figure img"))
          .transform === "matrix(1.1, 0, 0, 1.1, 0, 0)",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".paper-figure img")
        .evaluate((element) => getComputedStyle(element).transform),
      "none",
    );
  } finally {
    await context.close();
  }
  const touch = await openPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    await touch.page.locator("#news-feed").tap({ position: { x: 5, y: 5 } });
    assert.equal(
      await touch.page
        .locator("#news-feed")
        .evaluate((element) =>
          parseFloat(element.style.getPropertyValue("--tilt-angle") || "0"),
        ),
      0,
    );
  } finally {
    await touch.context.close();
  }
});

test("analytics preferences and public counter work without real tracking", async () => {
  const context = await browser.newContext();
  let trackerRequests = 0;
  let counterStatus = 200;
  let counterValue = "1,234";
  await context.route("https://**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "palestyhr.github.io")
      return route.fulfill(await fileResponse(url));
    if (url.hostname === "gc.zgo.at") {
      trackerRequests++;
      return route.fulfill({ contentType: "text/javascript", body: "" });
    }
    if (url.hostname === "palestyhr.goatcounter.com") {
      return route.fulfill({
        status: counterStatus,
        json: { count: counterValue },
      });
    }
    return route.abort();
  });
  const page = await context.newPage();
  try {
    await page.goto("https://palestyhr.github.io/?source=test#about");
    await page.locator(".visitor-count").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("[data-visitor-count]").innerText(),
      "1,234",
    );
    assert.equal(trackerRequests, 1);
    assert.deepEqual(
      await page.evaluate(() => ({
        path: window.goatcounter.path,
        noEvents: window.goatcounter.no_events,
      })),
      { path: "/", noEvents: true },
    );

    await page.goto("https://palestyhr.github.io/#analytics-off");
    await page.locator(".analytics-status").waitFor();
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("homepage.analytics.disabled"),
      ),
      "1",
    );
    assert.equal(trackerRequests, 1);
    assert.equal(new URL(page.url()).hash, "");
    await page.goto("https://palestyhr.github.io/#toggle-goatcounter");
    await page.reload();
    await page.locator(".analytics-status").waitFor();
    await page.waitForLoadState("networkidle");
    assert.equal(trackerRequests, 2);

    counterValue = "invalid";
    await page.goto("https://palestyhr.github.io/journey.html");
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator(".visitor-count").isHidden(), true);
    counterStatus = 503;
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator(".visitor-count").isHidden(), true);

    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("Storage blocked");
      };
    });
    const requestsBeforeOptOut = trackerRequests;
    await page.goto("https://palestyhr.github.io/#analytics-off");
    await page.locator(".analytics-status").waitFor();
    assert.equal(trackerRequests, requestsBeforeOptOut);
    assert.match(
      await page.locator(".analytics-status").innerText(),
      /disabled/,
    );
  } finally {
    await context.close();
  }
});
