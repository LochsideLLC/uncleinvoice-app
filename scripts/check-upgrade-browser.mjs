import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Port 9339 must be forwarded to the isolated headless browser on steelbreeze.
const tabs = await (await fetch("http://127.0.0.1:9339/json/list")).json();
const tab = tabs.find((tab) => tab.type === "page");
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  const request = pending.get(message.id);
  if (request) { pending.delete(message.id); if (message.error) request.reject(message.error); else request.resolve(message.result); }
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const current = ++id;
    pending.set(current, { resolve, reject });
    ws.send(JSON.stringify({ id: current, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function navigate(path) {
  await call("Page.navigate", { url: `http://127.0.0.1:3317${path}` });
  await waitFor('document.querySelector("h1") !== null');
  await evaluate('document.fonts.ready.then(() => true)');
}
async function click(text) {
  await evaluate(`{ const button = Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === ${JSON.stringify(text)}); button.focus(); button.click(); }`);
}
let checks = 0;
function check(condition, message) { assert.ok(condition, message); console.log(`PASS ${++checks}: ${message}`); }
const screenshots = await mkdtemp(join(tmpdir(), "uncleinvoice-upgrade-screens-"));
async function screenshot(name) {
  const { data } = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(join(screenshots, name), Buffer.from(data, "base64"));
}
try {
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/");
  await evaluate('localStorage.clear()');
  await navigate("/");
  await waitFor('document.body.textContent.includes("Dismiss")');
  await click("Dismiss");
  check(!await evaluate('document.querySelector("aside") !== null'), "offer dismisses immediately");
  await navigate("/");
  check(!await evaluate('document.querySelector("aside") !== null'), "dismissal survives reload");

  await evaluate(`document.querySelector('input[aria-label="Select SAMPLE-001"]').click()`);
  await waitFor('document.body.textContent.includes("Download selected")');
  await click("Download selected · Bookkeeper");
  await waitFor('document.querySelector("dialog[open]") !== null');
  check(await evaluate('document.activeElement.textContent === "Keep working"'), "dialog focuses the safe return action");
  check(await evaluate('document.querySelector("dialog[open] a").target === "_blank"'), "plans open separately from unfinished work");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitFor('document.querySelector("dialog[open]") === null');
  check(await evaluate(`document.querySelector('input[aria-label="Select SAMPLE-001"]').checked`), "Escape preserves the selected invoice");
  check(await evaluate(`document.querySelector('input[aria-label="Unfinished invoice note"]').value === "Keep this draft"`), "opening an offer preserves unfinished text");
  check(await evaluate('document.activeElement.textContent.includes("Download selected")'), "Escape returns focus to the offer button");
  await click("Preview invoice");
  await waitFor('document.querySelector("dialog[open]") !== null');
  check(await evaluate('document.querySelector("dialog[open] .invoice-sheet").textContent.includes("uncleinvoice.com")'), "Free preview shows the real credit");
  await evaluate('document.querySelectorAll("dialog[open] input[type=radio]")[1].click()');
  await waitFor('!document.querySelector("dialog[open] .invoice-sheet").textContent.includes("uncleinvoice.com")');
  check(await evaluate('document.querySelector("dialog[open] .invoice-sheet").textContent.includes("$250.00")'), "paid preview removes credit but keeps invoice values");

  await navigate("/app/plans");
  await screenshot("plans-desktop.png");
  for (const width of [390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate("/app/plans");
    check(await evaluate(`document.documentElement.scrollWidth <= ${width}`), `plans fit a ${width}px screen without horizontal scrolling`);
    check(await evaluate('Array.from(document.querySelectorAll("nav a")).some(el => el.textContent === "Plans" && el.getBoundingClientRect().width > 0)'), `Plans remains visible at ${width}px`);
    if (width === 390) await screenshot("plans-mobile.png");
  }
  await navigate("/app/plans?plan=bookkeeper");
  check(await evaluate('document.documentElement.scrollWidth <= 320'), "Bookkeeper navigation fits a 320px screen");
  check(await evaluate('document.body.textContent.includes("Your plan") && !document.body.textContent.includes("Request Bookkeeper") && !document.body.textContent.includes("Request Invoice")'), "Bookkeeper sees its plan without upgrade requests");
  console.log(`${checks} browser checks passed. Screenshots: ${screenshots}`);
} finally { ws.close(); }
