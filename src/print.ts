import { escapeHtml } from "./utils/html";

const PRINT_JOB_KEY_PREFIX = "printJob:";

type PrintJob = {
  title: string;
  htmlContent: string;
  createdAt: number;
};

function getPrintJob(key: string): Promise<PrintJob | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result[key] as PrintJob | undefined);
    });
  });
}

function removePrintJob(key: string): void {
  chrome.storage.local.remove(key);
}

function renderError(message: string): void {
  const root = document.getElementById("print-root");
  if (!root) return;
  root.innerHTML = `<p class="print-error">${escapeHtml(message)}</p>`;
}

function printAfterRender(): void {
  requestAnimationFrame(() => {
    setTimeout(() => window.print(), 100);
  });
}

async function initPrintPage(): Promise<void> {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    renderError("印刷データが見つかりません");
    return;
  }

  const key = `${PRINT_JOB_KEY_PREFIX}${id}`;
  const job = await getPrintJob(key);
  if (!job) {
    renderError("印刷データを読み込めませんでした");
    return;
  }

  document.title = job.title;
  const root = document.getElementById("print-root");
  if (!root) return;

  root.innerHTML = `
    <main class="markdown-body">
      ${job.htmlContent}
    </main>
  `;
  removePrintJob(key);
  printAfterRender();
}

initPrintPage().catch(() => {
  renderError("印刷ページの初期化に失敗しました");
});
