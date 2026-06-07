import { clearHistoryItems, getHistoryItems, type HistoryItem } from "../../utils/history";
import { escapeHtml } from "../../utils/html";
import { logError } from "../../utils/logger";

const historyDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function renderHistoryMessage(className: string, message: string): string {
  return `<div class="${className} small text-center py-3">${escapeHtml(message)}</div>`;
}

function formatHistoryDate(timestamp: number): string {
  return historyDateFormatter.format(new Date(timestamp));
}

function renderHistoryItem(item: HistoryItem): string {
  const typeLabel = item.locationType === "local" ? "ローカル" : "Web";
  const title = item.title || item.fileName;
  const escapedUrl = escapeHtml(item.url);
  const escapedTitle = escapeHtml(title);

  return `
    <a class="mv-history-item" href="${escapedUrl}" title="${escapedUrl}">
      <div class="mv-history-main">
        <i class="bi ${item.locationType === "local" ? "bi-file-earmark-text" : "bi-globe2"}"></i>
        <div class="mv-history-text">
          <div class="mv-history-title" title="${escapedTitle}">${escapedTitle}</div>
          <div class="mv-history-url">${escapedUrl}</div>
        </div>
      </div>
      <div class="mv-history-meta">
        <span>${typeLabel}</span>
        <span>${escapeHtml(formatHistoryDate(item.lastOpenedAt))}</span>
      </div>
    </a>
  `;
}

export function renderHistorySection(): string {
  return `
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0 small text-uppercase tracking-wider text-muted">最近開いたファイル</h6>
        <button type="button" class="btn btn-link btn-xs text-decoration-none text-danger p-0 small fw-medium" id="mv-history-clear-btn" style="font-size: 11px;">
          履歴を消去
        </button>
      </div>
      <div class="mv-history-list" id="mv-history-list">
        ${renderHistoryMessage("text-muted", "読み込み中...")}
      </div>
    </div>
  `;
}

export function setupHistorySection(offcanvas: HTMLElement): () => void {
  const historyList = offcanvas.querySelector("#mv-history-list") as HTMLElement | null;
  const clearButton = offcanvas.querySelector("#mv-history-clear-btn") as HTMLButtonElement | null;

  const updateHistoryDisplay = () => {
    if (!historyList) return;

    getHistoryItems()
      .then((items) => {
        clearButton?.toggleAttribute("disabled", items.length === 0);

        if (items.length === 0) {
          historyList.innerHTML = renderHistoryMessage("text-muted", "履歴はありません");
          return;
        }

        historyList.innerHTML = items.map(renderHistoryItem).join("");
      })
      .catch((err) => {
        logError("履歴の読み込みに失敗しました", "content", err);
        historyList.innerHTML = renderHistoryMessage("text-danger", "履歴を読み込めませんでした");
      });
  };

  clearButton?.addEventListener("click", async () => {
    if (!confirm("本当に履歴を消去しますか？")) return;

    try {
      await clearHistoryItems();
      updateHistoryDisplay();
    } catch (err) {
      logError("履歴の消去に失敗しました", "content", err);
    }
  });

  return updateHistoryDisplay;
}
