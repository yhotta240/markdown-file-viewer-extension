import onboardingDoc from "../docs/onboarding.md";
import { EXTENSION_SHORT_NAME } from "./settings";
import { openLinkNewTab } from "./utils/dom";

function isAllowedFileSchemeAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.extension.isAllowedFileSchemeAccess(resolve);
  });
}

function renderOptionsPage(root: HTMLElement): void {
  const extensionSettingsUrl = `chrome://extensions/?id=${chrome.runtime.id}`;

  root.innerHTML = `
    <style>
      :root {
        color-scheme: light;
        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        color: #1f2328;
        background: #f6f8fa;
      }

      body {
        margin: 0;
      }

      .mv-options-shell {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px 24px;
      }

      .mv-options-card {
        background: #fff;
        border: 1px solid #d8dee4;
        border-radius: 8px;
        padding: 28px;
        box-shadow: 0 8px 24px rgba(31, 35, 40, 0.08);
      }

      .mv-options-title {
        margin: 0 0 16px;
        font-size: 24px;
        line-height: 1.35;
      }

      .mv-options-content {
        font-size: 15px;
        line-height: 1.8;
      }

      .mv-options-content h1,
      .mv-options-content h2,
      .mv-options-content h3 {
        margin: 20px 0 12px;
        font-size: 18px;
      }

      .mv-options-content p {
        margin: 0 0 14px;
      }

      .mv-options-content ol {
        padding-left: 1.35rem;
        margin: 0 0 16px;
      }

      .mv-options-content img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 18px 0 0;
        border: 1px solid #d8dee4;
        border-radius: 6px;
      }

      .mv-options-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
      }

      .mv-options-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid #1f2328;
        border-radius: 6px;
        background: #1f2328;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }

      .mv-options-button.secondary {
        background: #fff;
        color: #1f2328;
      }

      .mv-options-status {
        min-height: 24px;
        margin-top: 16px;
        color: #57606a;
        font-size: 14px;
      }

      .mv-options-status.error {
        color: #b42318;
      }

      .mv-options-status.success {
        color: #1a7f37;
      }
    </style>

    <section class="mv-options-shell">
      <div class="mv-options-card">
        <h1 class="mv-options-title">${EXTENSION_SHORT_NAME} の準備</h1>
        <div class="mv-options-content">
          ${onboardingDoc.content}
        </div>
        <div class="mv-options-actions">
          <a class="mv-options-button" id="mv-open-extension-settings" href="${extensionSettingsUrl}" target="_blank" rel="noopener noreferrer">
            拡張機能の詳細ページを開く
          </a>
          <button type="button" class="mv-options-button secondary" id="mv-check-file-access">
            許可できたか確認する
          </button>
        </div>
        <p class="mv-options-status" id="mv-file-access-status"></p>
      </div>
    </section>
  `;

  const checkButton = root.querySelector("#mv-check-file-access") as HTMLButtonElement | null;
  const settingsLink = root.querySelector(
    "#mv-open-extension-settings",
  ) as HTMLAnchorElement | null;
  const status = root.querySelector("#mv-file-access-status") as HTMLElement | null;

  if (settingsLink) {
    openLinkNewTab(settingsLink);
  }

  checkButton?.addEventListener("click", async () => {
    const allowed = await isAllowedFileSchemeAccess();
    if (!status) return;

    status.classList.toggle("success", allowed);
    status.classList.toggle("error", !allowed);
    status.textContent = allowed
      ? "許可されています．このページを閉じます．"
      : "まだ許可されていません．詳細ページでチェックを入れてから，もう一度確認してください．";

    if (allowed) {
      setTimeout(() => {
        window.close();
      }, 500);
    }
  });
}

const root = document.getElementById("mv-options-root");
if (root) {
  renderOptionsPage(root);
}
