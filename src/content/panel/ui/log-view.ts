import { escapeHtml } from "../../../utils/html";
import { getLogs } from "../../../utils/logger";

function getLogBadgeClass(level: string): string {
  if (level === "warn") return "bg-warning-subtle text-warning-emphasis";
  if (level === "error") return "bg-danger-subtle text-danger-emphasis";

  return "bg-secondary-subtle text-secondary-emphasis";
}

export function updateLogDisplay(container: HTMLElement): void {
  getLogs().then((logs) => {
    container.innerHTML = "";
    if (logs.length === 0) {
      container.innerHTML = '<div class="text-muted small text-center py-3">ログはありません</div>';
      return;
    }

    const logList = document.createElement("div");
    logList.className = "d-flex flex-column gap-1";

    for (const log of logs.slice().reverse()) {
      const item = document.createElement("div");
      item.className = "p-1 rounded font-monospace small border-bottom border-light-subtle";
      item.style.fontSize = "11px";
      item.style.lineHeight = "1.4";
      item.innerHTML = `
        <div class="d-flex justify-content-between text-muted" style="font-size: 10px;">
          <span>[${log.timestamp}]</span>
          <span class="badge ${getLogBadgeClass(log.level)}">${log.level.toUpperCase()} / ${log.source}</span>
        </div>
        <div class="text-break mt-1">${escapeHtml(log.message)}</div>
      `;
      logList.appendChild(item);
    }

    container.appendChild(logList);
  });
}
