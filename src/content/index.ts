import { logError } from "../utils/logger";
import { getMarkdownText } from "./preview";

type MarkdownViewerApp = typeof import("./app");

function waitForDocumentReady(): Promise<void> {
  if (document.body && document.readyState !== "loading") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

function isRawMarkdownDocument(): boolean {
  const contentType = document.contentType.toLowerCase();
  if (contentType.includes("markdown") || contentType.startsWith("text/plain")) {
    return true;
  }

  const bodyChildren = Array.from(document.body?.children ?? []);
  return bodyChildren.length === 1 && bodyChildren[0].tagName === "PRE";
}

async function init(): Promise<void> {
  await waitForDocumentReady();

  if (!isRawMarkdownDocument()) {
    return;
  }

  const markdownText = getMarkdownText();
  const { initMarkdownViewer, logMissingMarkdownText } = require("./app") as MarkdownViewerApp;
  if (!markdownText) {
    logMissingMarkdownText();
    return;
  }

  await initMarkdownViewer(markdownText);
}

// 実行
init().catch((err) => {
  logError(`初期化に失敗しました`, "content", err);
  document.documentElement.style.opacity = "";
  document.documentElement.style.transition = "";
});
