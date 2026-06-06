import privacyDoc from "../../docs/privacy.md";
import shortcutsDoc from "../../docs/shortcuts.md";
import usageDoc from "../../docs/usage.md";
import {
  DEFAULT_SETTINGS,
  EXTENSION_SHORT_NAME,
  EXTENSION_VERSION,
  type Settings,
} from "../settings";
import { escapeHtml } from "../utils/html";
import { clearLogs, getLogs, logError } from "../utils/logger";
import { getSettings, setSettings } from "../utils/storage";
import { exportMarkdown, exportPdf, exportRawHtml, exportStyledHtml } from "./export";
import { type MarkdownFileInfo, renderFileInfoPopover } from "./file-info";
import {
  getVoices,
  isSpeaking,
  speak,
  pause as ttsPause,
  isPaused as ttsPaused,
  resume as ttsResume,
  stop as ttsStop,
} from "./tts";

const ICON_EYE_FILL = `<i class="bi bi-eye-fill"></i>`;

const ICON_CLIPBOARD = `<i class="bi bi-clipboard"></i>`;

const ICON_CLIPBOARD_CHECK = `<i class="bi bi-clipboard-check-fill text-success"></i>`;

const ICON_CODE_SLASH = `<i class="bi bi-code-slash"></i>`;

const ICON_PRINTER = `<i class="bi bi-printer"></i>`;

const ICON_EXPORT = `<i class="bi bi-box-arrow-up"></i>`;

const ICON_PLAY = `<i class="bi bi-play-fill"></i>`;

const ICON_PAUSE = `<i class="bi bi-pause-fill"></i>`;

const ICON_STOP = `<i class="bi bi-stop-fill"></i>`;

const ICON_SLIDERS = `<i class="bi bi-sliders"></i>`;

const ICON_FILETYPE_PDF = `<i class="bi bi-file-earmark-pdf"></i>`;

const ICON_STYLED_HTML = `<i class="bi bi-link-45deg"></i>`;

const ICON_RAW_HTML = `<i class="bi bi-filetype-html"></i>`;

const ICON_MARKDOWN = `<i class="bi bi-markdown"></i>`;

const ICON_INFO = `<i class="bi bi-info-circle"></i>`;

/**
 * カラーのYIQ明度計算による明暗判定 (背景色が暗い場合に文字色を白にするトグル用)
 */
function isColorDark(hex: string): boolean {
  const color = hex.replace("#", "");
  if (color.length !== 6) return false;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/**
 * 動的に Google Fonts をロードし、CSS変数にフォントを適用する
 */
function applyFontFamily(fontKey: string, appRoot: HTMLElement): void {
  const existingLink = document.getElementById("mv-dynamic-font");
  if (existingLink) {
    existingLink.remove();
  }

  let fontCss = "";
  let fontUrl = "";

  switch (fontKey) {
    case "inter":
      fontCss = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      fontUrl =
        "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
      break;
    case "outfit":
      fontCss = '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      fontUrl =
        "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap";
      break;
    case "notosansjp":
      fontCss = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      fontUrl =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap";
      break;
    case "serif":
      fontCss = 'Georgia, Cambria, "Times New Roman", "Noto Serif JP", serif';
      fontUrl = "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap";
      break;
    default:
      fontCss = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      break;
  }

  if (fontUrl) {
    const link = document.createElement("link");
    link.id = "mv-dynamic-font";
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }

  appRoot.style.setProperty("--mv-font-family", fontCss);
}

/**
 * コントロールパネル (Offcanvas) とドッキング型ツールバーを構築する
 */
export function buildControlPanel(
  appRoot: HTMLElement,
  previewArea: HTMLElement,
  markdownText: string,
  onViewModeChange: (mode: "preview" | "source") => void,
  fileInfo: MarkdownFileInfo,
): void {
  // ドキュメントマークダウンの読み込みと動的構築
  const docs = [usageDoc, shortcutsDoc, privacyDoc]
    .filter((doc) => doc.metadata.visible)
    .sort((a, b) => a.metadata.order - b.metadata.order);

  const docsHtml = docs
    .map((doc) => {
      const expandedAttr = doc.metadata.expanded ? "open" : "";
      return `
        <details class="mv-doc-details border rounded p-2 mb-2 bg-body-tertiary" ${expandedAttr}>
          <summary class="fw-semibold text-secondary small" style="cursor: pointer; user-select: none;">${escapeHtml(
            doc.metadata.title,
          )}</summary>
          <div class="mt-2 small text-muted">
            ${doc.content}
          </div>
        </details>
      `;
    })
    .join("");

  // 1. 統合ツールバーの作成
  const toolbar = document.createElement("div");
  toolbar.className = "mv-toolbar";
  toolbar.id = "mv-toolbar";

  toolbar.innerHTML = `
    <!-- 表示モード切替トグルボタン -->
    <button type="button" class="mv-toolbar-btn" id="mv-toggle-view" title="ソースコードを表示 (S)">
      ${ICON_CODE_SLASH}
    </button>
    
    <div class="mv-toolbar-divider"></div>
    
    <!-- マークダウンコピー -->
    <button type="button" class="mv-toolbar-btn" id="mv-copy-button" title="Markdownをコピー">
      ${ICON_CLIPBOARD}
    </button>
    
    <div class="mv-toolbar-divider"></div>
    
    <!-- 印刷 -->
    <button type="button" class="mv-toolbar-btn" id="mv-print-button" title="印刷する (P)">
      ${ICON_PRINTER}
    </button>
    
    <div class="mv-toolbar-divider"></div>

    <!-- 読み上げ -->
    <button type="button" class="mv-toolbar-btn" id="mv-tts-button" title="読み上げ (R)">
      ${ICON_PLAY}
    </button>
    <button type="button" class="mv-toolbar-btn" id="mv-tts-stop-button" title="停止" style="display: none;">
      ${ICON_STOP}
    </button>
    
    <div class="mv-toolbar-divider"></div>
    
    <!-- エクスポート -->
    <button type="button" class="mv-toolbar-btn" id="mv-export-button" title="エクスポート">
    ${ICON_EXPORT}
    </button>

    <div class="mv-toolbar-divider"></div>

    <!-- ファイル情報 -->
    <button type="button" class="mv-toolbar-btn" id="mv-file-info-button" title="ファイル情報" aria-describedby="mv-file-info-popover">
      ${ICON_INFO}
    </button>
    
    <div class="mv-toolbar-divider"></div>
    
    <!-- 設定を開く -->
    <button type="button" class="mv-toolbar-btn" id="mv-gear-button" title="設定を開く (T)">
      ${ICON_SLIDERS}
    </button>

    <!-- エクスポートポップアップメニュー -->
    <div class="mv-export-popover" id="mv-export-popover">
      <button type="button" class="mv-export-item" id="mv-export-pdf">
        ${ICON_FILETYPE_PDF}
        <span>PDF</span>
      </button>
      <button type="button" class="mv-export-item" id="mv-export-styled-html">
        ${ICON_STYLED_HTML}
        <span>Styled HTML</span>
      </button>
      <button type="button" class="mv-export-item" id="mv-export-raw-html">
        ${ICON_RAW_HTML}
        <span>Raw HTML</span>
      </button>
      <button type="button" class="mv-export-item" id="mv-export-md">
        ${ICON_MARKDOWN}
        <span>Markdown</span>
      </button>
    </div>

    ${renderFileInfoPopover(fileInfo)}
  `;
  appRoot.appendChild(toolbar);

  // 2. 背景（Backdrop）の作成
  const backdrop = document.createElement("div");
  backdrop.className = "mv-offcanvas-backdrop fade";
  backdrop.style.display = "none";
  appRoot.appendChild(backdrop);

  // 3. Offcanvas パネルの作成
  const offcanvas = document.createElement("div");
  offcanvas.className = "offcanvas offcanvas-end mv-offcanvas bg-body border-start";
  offcanvas.id = "mv-settings-offcanvas";
  offcanvas.setAttribute("tabindex", "-1");

  offcanvas.innerHTML = `
    <div class="offcanvas-header border-bottom py-3">
      <img src="${chrome.runtime.getURL("icons/icon.png")}" alt="Icon" width="24" height="24" class="me-2">
      <h5 class="offcanvas-title fw-bold">
        ${EXTENSION_SHORT_NAME} 設定
      </h5>
      <button type="button" class="btn-close" id="mv-close-button" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
      <!-- 1. 表示設定 -->
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="fw-bold mb-0 small text-uppercase tracking-wider text-muted">表示設定</h6>
          <button type="button" class="btn btn-xs fw-semibold py-1 px-2 border" id="mv-settings-reset-btn" 
                  style="font-size: 11px; height: auto; line-height: 1; border-radius: 4px; 
                         background-color: #f1f3f5 !important; color: #212529 !important; border-color: #dee2e6 !important;">
            リセット
          </button>
        </div>
        
        <!-- カラーテーマ -->
        <div class="mb-3">
          <label class="form-label d-block small fw-semibold text-secondary mb-2">カラーテーマ</label>
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" name="mv-theme" id="mv-theme-light" value="light">
            <label class="btn btn-outline-secondary btn-sm py-2" for="mv-theme-light">ライト</label>
            
            <input type="radio" class="btn-check" name="mv-theme" id="mv-theme-dark" value="dark">
            <label class="btn btn-outline-secondary btn-sm py-2" for="mv-theme-dark">ダーク</label>
            
            <input type="radio" class="btn-check" name="mv-theme" id="mv-theme-auto" value="auto">
            <label class="btn btn-outline-secondary btn-sm py-2" for="mv-theme-auto">自動</label>

            <input type="radio" class="btn-check" name="mv-theme" id="mv-theme-custom" value="custom">
            <label class="btn btn-outline-secondary btn-sm py-2" for="mv-theme-custom">カスタム</label>
          </div>
        </div>

        <!-- カスタムカラーパレット (テーマがカスタムの時のみ表示) -->
        <div id="mv-custom-colors-container" class="mb-3 border rounded p-3 bg-body-tertiary" style="display: none;">
          <div class="row g-2">
            <div class="col-6">
              <label for="mv-custom-fg" class="form-label small text-secondary mb-1">文字色</label>
              <div class="d-flex align-items-center gap-2">
                <input type="color" class="form-control form-control-color form-control-sm" id="mv-custom-fg" value="#191b1f">
                <span class="small font-monospace text-muted" id="mv-custom-fg-hex" style="font-size: 10px;">#191B1F</span>
              </div>
            </div>
            <div class="col-6">
              <label for="mv-custom-bg" class="form-label small text-secondary mb-1">背景色</label>
              <div class="d-flex align-items-center gap-2">
                <input type="color" class="form-control form-control-color form-control-sm" id="mv-custom-bg" value="#ffffff">
                <span class="small font-monospace text-muted" id="mv-custom-bg-hex" style="font-size: 10px;">#FFFFFF</span>
              </div>
            </div>
          </div>
        </div>

        <!-- フォント指定 -->
        <div class="mb-3">
          <label for="mv-font-family-select" class="form-label small fw-semibold text-secondary mb-2">フォントファミリー</label>
          <select class="form-select form-select-sm" id="mv-font-family-select">
            <option value="system">システム標準 (既定)</option>
            <option value="inter">Inter (Google Fonts)</option>
            <option value="outfit">Outfit (Google Fonts)</option>
            <option value="notosansjp">Noto Sans JP (日本語)</option>
            <option value="serif">Serif (明朝体)</option>
          </select>
        </div>

        <!-- コードブロックテーマ -->
        <div class="mb-3">
          <label for="mv-code-block-theme-select" class="form-label small fw-semibold text-secondary mb-2">コードブロックテーマ</label>
          <select class="form-select form-select-sm" id="mv-code-block-theme-select">
            <option value="default">標準</option>
            <option value="github">GitHub</option>
            <option value="soft">ソフト</option>
            <option value="contrast">高コントラスト</option>
            <option value="terminal">ターミナル</option>
          </select>
        </div>

        <!-- プレビュー最大横幅 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-max-width-slider" class="form-label small fw-semibold text-secondary mb-0">最大横幅</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-max-width-badge">860px</span>
          </div>
          <input type="range" class="form-range" min="500" max="1200" step="20" id="mv-max-width-slider" value="860">
        </div>

        <!-- 画像最大高さ -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-image-max-height-slider" class="form-label small fw-semibold text-secondary mb-0">画像最大高さ</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-image-max-height-badge">70%</span>
          </div>
          <input type="range" class="form-range" min="40" max="100" step="5" id="mv-image-max-height-slider" value="70">
        </div>

        <!-- フォントサイズ -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-font-size-slider" class="form-label small fw-semibold text-secondary mb-0">フォントサイズ</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-font-size-badge">16px</span>
          </div>
          <input type="range" class="form-range" min="12" max="24" step="1" id="mv-font-size-slider" value="16">
        </div>
      </div>

      <hr class="my-4 text-muted">

      <!-- 1.5. 読み上げ設定 -->
      <div class="mb-4">
        <h6 class="fw-bold mb-3 small text-uppercase tracking-wider text-muted">読み上げ設定</h6>

        <!-- ボイス選択 -->
        <div class="mb-3">
          <label for="mv-tts-voice-select" class="form-label small fw-semibold text-secondary mb-2">ボイス</label>
          <select class="form-select form-select-sm" id="mv-tts-voice-select">
            <option value="">システム標準</option>
          </select>
        </div>

        <!-- 速度 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-tts-rate-slider" class="form-label small fw-semibold text-secondary mb-0">速度</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-tts-rate-badge">1.0x</span>
          </div>
          <input type="range" class="form-range" min="0.5" max="2.0" step="0.1" id="mv-tts-rate-slider" value="1.0">
        </div>

        <!-- ピッチ -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-tts-pitch-slider" class="form-label small fw-semibold text-secondary mb-0">ピッチ</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-tts-pitch-badge">1.0</span>
          </div>
          <input type="range" class="form-range" min="0" max="2" step="0.1" id="mv-tts-pitch-slider" value="1.0">
        </div>

        <!-- 音量 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-tts-volume-slider" class="form-label small fw-semibold text-secondary mb-0">音量</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-tts-volume-badge">100%</span>
          </div>
          <input type="range" class="form-range" min="0" max="1" step="0.05" id="mv-tts-volume-slider" value="1.0">
        </div>
      </div>

      <hr class="my-4 text-muted">

      <!-- 2. アクション & シェア -->
      <div class="mb-4">
        <h6 class="fw-bold mb-3 small text-uppercase tracking-wider text-muted">シェア・操作</h6>
        <div class="d-flex flex-column gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm text-start py-2 px-3 d-flex align-items-center gap-2" id="mv-share-x">
            <i class="bi bi-twitter-x"></i>
            <span>X (Twitter) でシェア</span>
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm text-start py-2 px-3 d-flex align-items-center gap-2" id="mv-share-fb">
            <i class="bi bi-facebook"></i>
            <span>Facebook でシェア</span>
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm text-start py-2 px-3 d-flex align-items-center gap-2" id="mv-share-copy">
            <i class="bi bi-link-45deg"></i>
            <span>ファイルURLをコピー</span>
          </button>
        </div>
      </div>

      <hr class="my-4 text-muted">

      <!-- 3. ドキュメント -->
      <div class="mb-4">
        <h6 class="fw-bold mb-3 small text-uppercase tracking-wider text-muted">ドキュメント</h6>
        ${docsHtml}
      </div>

      <hr class="my-4 text-muted">

      <!-- 4. ログ -->
      <div class="mb-4">
        <details class="mv-doc-details border rounded p-2 mb-2 bg-body-tertiary" id="mv-logs-details">
          <summary class="fw-semibold text-secondary small" style="cursor: pointer; user-select: none;">システムログ</summary>
          <div class="mt-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small text-muted" style="font-size: 11px;">動作ログ</span>
              <button type="button" class="btn btn-link btn-xs text-decoration-none text-danger p-0 small fw-medium" id="mv-logs-clear-btn" style="font-size: 11px;">ログ消去</button>
            </div>
            <div class="border rounded p-2 bg-body overflow-auto" id="mv-logs-container" style="max-height: 180px; min-height: 60px;">
              <!-- ログ一覧が挿入される -->
            </div>
          </div>
        </details>
      </div>

      <hr class="my-4 text-muted">

      <!-- 5. 情報 -->
      <div class="mb-4">
        <h6 class="fw-bold mb-2 small text-uppercase tracking-wider text-muted">拡張機能情報</h6>
        <div class="border rounded p-3 bg-body-tertiary small text-secondary">
          <div class="d-flex justify-content-between mb-1">
            <span>拡張機能名:</span>
            <span class="fw-medium">${EXTENSION_SHORT_NAME}</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span>バージョン:</span>
            <span class="fw-medium">${EXTENSION_VERSION}</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span>パーサー:</span>
            <span class="fw-medium">marked</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span>スタイル:</span>
            <span class="fw-medium">Bootstrap 5</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>開発者:</span>
            <span class="fw-medium">yhotta240</span>
          </div>
        </div>
      </div>
    </div>
  `;
  appRoot.appendChild(offcanvas);

  // イベント設定
  setupPanelEvents(
    offcanvas,
    backdrop,
    toolbar,
    appRoot,
    previewArea,
    markdownText,
    onViewModeChange,
  );
}

// 安全なファイル名を作成するヘルパー
function getSafeFilename(title: string): string {
  let name = title;
  if (name.toLowerCase().endsWith(".md")) {
    name = name.slice(0, -3);
  } else if (name.toLowerCase().endsWith(".markdown")) {
    name = name.slice(0, -9);
  }
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "document";
}

function setupPanelEvents(
  offcanvas: HTMLElement,
  backdrop: HTMLElement,
  toolbar: HTMLElement,
  appRoot: HTMLElement,
  previewArea: HTMLElement,
  markdownText: string,
  onViewModeChange: (mode: "preview" | "source") => void,
): void {
  const gearBtn = toolbar.querySelector("#mv-gear-button") as HTMLElement;
  const copyBtn = toolbar.querySelector("#mv-copy-button") as HTMLElement;
  const toggleViewBtn = toolbar.querySelector("#mv-toggle-view") as HTMLButtonElement;
  const printBtn = toolbar.querySelector("#mv-print-button") as HTMLElement;
  const fileInfoBtn = toolbar.querySelector("#mv-file-info-button") as HTMLElement;
  const fileInfoPopover = toolbar.querySelector("#mv-file-info-popover") as HTMLElement;
  const exportBtn = toolbar.querySelector("#mv-export-button") as HTMLElement;
  const exportPopover = toolbar.querySelector("#mv-export-popover") as HTMLElement;

  const logsDetails = offcanvas.querySelector("#mv-logs-details") as HTMLDetailsElement;
  const logsContainer = offcanvas.querySelector("#mv-logs-container") as HTMLElement;

  // 開閉ロジック
  const openPanel = () => {
    offcanvas.classList.add("show");
    backdrop.style.display = "block";
    setTimeout(() => backdrop.classList.add("show"), 10);
    if (logsDetails?.open) {
      updateLogDisplay(logsContainer);
    }
  };

  const closePanel = () => {
    offcanvas.classList.remove("show");
    backdrop.classList.remove("show");
    setTimeout(() => {
      if (!offcanvas.classList.contains("show")) {
        backdrop.style.display = "none";
      }
    }, 150);
  };

  gearBtn.addEventListener("click", openPanel);
  offcanvas.querySelector("#mv-close-button")?.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);

  // ログ開閉
  logsDetails?.addEventListener("toggle", () => {
    if (logsDetails.open) {
      updateLogDisplay(logsContainer);
    }
  });

  // キーボードショートカット
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closePanel();
    } else if ((e.key === "t" || e.key === "T") && document.activeElement === document.body) {
      if (offcanvas.classList.contains("show")) {
        closePanel();
      } else {
        openPanel();
      }
    } else if ((e.key === "p" || e.key === "P") && document.activeElement === document.body) {
      e.preventDefault();
      window.print();
    }
  });

  // 印刷ボタン
  printBtn.addEventListener("click", () => {
    window.print();
  });

  // ファイル情報ポップアップ表示・非表示制御 (ホバー & クリック)
  let fileInfoPopoverTimeout: number | null = null;
  const showFileInfoPopover = () => {
    if (fileInfoPopoverTimeout) {
      clearTimeout(fileInfoPopoverTimeout);
      fileInfoPopoverTimeout = null;
    }
    fileInfoPopover.classList.add("show");
  };

  const hideFileInfoPopover = () => {
    fileInfoPopoverTimeout = window.setTimeout(() => {
      fileInfoPopover.classList.remove("show");
    }, 150);
  };

  fileInfoBtn.addEventListener("mouseenter", showFileInfoPopover);
  fileInfoBtn.addEventListener("mouseleave", hideFileInfoPopover);
  fileInfoPopover.addEventListener("mouseenter", showFileInfoPopover);
  fileInfoPopover.addEventListener("mouseleave", hideFileInfoPopover);

  fileInfoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInfoPopover.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    fileInfoPopover.classList.remove("show");
  });

  fileInfoPopover.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // エクスポートメニューのポップアップ表示・非表示制御 (ホバー & クリック)
  let popoverTimeout: number | null = null;
  const showPopover = () => {
    if (popoverTimeout) {
      clearTimeout(popoverTimeout);
      popoverTimeout = null;
    }
    exportPopover.classList.add("show");
  };

  const hidePopover = () => {
    popoverTimeout = window.setTimeout(() => {
      exportPopover.classList.remove("show");
    }, 150);
  };

  exportBtn.addEventListener("mouseenter", showPopover);
  exportBtn.addEventListener("mouseleave", hidePopover);
  exportPopover.addEventListener("mouseenter", showPopover);
  exportPopover.addEventListener("mouseleave", hidePopover);

  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportPopover.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    exportPopover.classList.remove("show");
  });

  exportPopover.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // 各エクスポートアクションのバインド
  exportPopover.querySelector("#mv-export-pdf")?.addEventListener("click", () => {
    exportPdf();
    exportPopover.classList.remove("show");
  });

  exportPopover.querySelector("#mv-export-styled-html")?.addEventListener("click", () => {
    const previewRender = document.getElementById("mv-preview-render");
    if (previewRender) {
      const title = document.title || "Exported Document";
      const filename = `${getSafeFilename(title)}.html`;
      exportStyledHtml(previewRender.innerHTML, title, filename);
    }
    exportPopover.classList.remove("show");
  });

  exportPopover.querySelector("#mv-export-raw-html")?.addEventListener("click", () => {
    const previewRender = document.getElementById("mv-preview-render");
    if (previewRender) {
      const title = document.title || "Exported Document";
      const filename = `${getSafeFilename(title)}_raw.html`;
      exportRawHtml(previewRender.innerHTML, filename);
    }
    exportPopover.classList.remove("show");
  });

  exportPopover.querySelector("#mv-export-md")?.addEventListener("click", () => {
    const title = document.title || "Exported Document";
    const filename = `${getSafeFilename(title)}.md`;
    exportMarkdown(markdownText, filename);
    exportPopover.classList.remove("show");
  });

  // コピーボタン
  copyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(markdownText)
      .then(() => {
        copyBtn.innerHTML = ICON_CLIPBOARD_CHECK;
        copyBtn.setAttribute("title", "コピーしました！");

        setTimeout(() => {
          copyBtn.innerHTML = ICON_CLIPBOARD;
          copyBtn.setAttribute("title", "Markdownをコピー");
        }, 2000);
      })
      .catch((err) => {
        logError(`コピーに失敗しました`, "content", err);
      });
  });

  // 設定項目DOM要素への参照
  const themeRadios = offcanvas.querySelectorAll<HTMLInputElement>('input[name="mv-theme"]');
  const fontSizeSlider = offcanvas.querySelector("#mv-font-size-slider") as HTMLInputElement;
  const fontSizeBadge = offcanvas.querySelector("#mv-font-size-badge") as HTMLElement;
  const fontSelect = offcanvas.querySelector("#mv-font-family-select") as HTMLSelectElement;
  const codeBlockThemeSelect = offcanvas.querySelector(
    "#mv-code-block-theme-select",
  ) as HTMLSelectElement;

  // カスタムカラーピッカー関連
  const customColorsContainer = offcanvas.querySelector(
    "#mv-custom-colors-container",
  ) as HTMLElement;
  const customFgInput = offcanvas.querySelector("#mv-custom-fg") as HTMLInputElement;
  const customBgInput = offcanvas.querySelector("#mv-custom-bg") as HTMLInputElement;
  const customFgHex = offcanvas.querySelector("#mv-custom-fg-hex") as HTMLElement;
  const customBgHex = offcanvas.querySelector("#mv-custom-bg-hex") as HTMLElement;

  // 最大幅関連
  const maxWidthSlider = offcanvas.querySelector("#mv-max-width-slider") as HTMLInputElement;
  const maxWidthBadge = offcanvas.querySelector("#mv-max-width-badge") as HTMLElement;

  // 画像最大高さ関連
  const imageMaxHeightSlider = offcanvas.querySelector(
    "#mv-image-max-height-slider",
  ) as HTMLInputElement;
  const imageMaxHeightBadge = offcanvas.querySelector("#mv-image-max-height-badge") as HTMLElement;

  // TTS 設定関連
  const ttsVoiceSelect = offcanvas.querySelector("#mv-tts-voice-select") as HTMLSelectElement;
  const ttsRateSlider = offcanvas.querySelector("#mv-tts-rate-slider") as HTMLInputElement;
  const ttsRateBadge = offcanvas.querySelector("#mv-tts-rate-badge") as HTMLElement;
  const ttsPitchSlider = offcanvas.querySelector("#mv-tts-pitch-slider") as HTMLInputElement;
  const ttsPitchBadge = offcanvas.querySelector("#mv-tts-pitch-badge") as HTMLElement;
  const ttsVolumeSlider = offcanvas.querySelector("#mv-tts-volume-slider") as HTMLInputElement;
  const ttsVolumeBadge = offcanvas.querySelector("#mv-tts-volume-badge") as HTMLElement;

  // ボイス一覧を非同期で取得してセレクタを埋める
  getVoices().then((voices) => {
    const currentVoice = ttsVoiceSelect.value;
    while (ttsVoiceSelect.options.length > 1) ttsVoiceSelect.remove(1);
    for (const v of voices) {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      ttsVoiceSelect.appendChild(opt);
    }
    ttsVoiceSelect.value = currentVoice;
  });

  let currentSettings: Required<Settings> = { ...DEFAULT_SETTINGS };

  // 設定を DOM とプレビュー画面に適用する
  const applySettingsToDOM = (settings: Required<Settings>) => {
    const htmlEl = document.documentElement;

    // 1. 表示モードの適用
    if (settings.viewMode) {
      if (settings.viewMode === "preview") {
        toggleViewBtn.innerHTML = ICON_CODE_SLASH;
        toggleViewBtn.setAttribute("title", "ソースコードを表示 (S)");
      } else {
        toggleViewBtn.innerHTML = ICON_EYE_FILL;
        toggleViewBtn.setAttribute("title", "プレビューを表示 (S)");
      }
      onViewModeChange(settings.viewMode);
    }

    // 2. テーマの適用（カスタムテーマを含む）
    if (settings.theme) {
      const radio = offcanvas.querySelector(`#mv-theme-${settings.theme}`) as HTMLInputElement;
      if (radio) radio.checked = true;

      if (settings.theme === "custom") {
        const fg = settings.customFg || DEFAULT_SETTINGS.customFg || "#191b1f";
        const bg = settings.customBg || DEFAULT_SETTINGS.customBg || "#ffffff";

        customFgInput.value = fg;
        customBgInput.value = bg;
        customFgHex.textContent = fg.toUpperCase();
        customBgHex.textContent = bg.toUpperCase();

        // CSSカスタム変数を設定して全体を着色
        htmlEl.style.setProperty("--bs-body-bg", bg);
        htmlEl.style.setProperty("--bs-body-color", fg);
        htmlEl.style.setProperty("--bs-border-color", `${fg}30`); // 透過ボーダー

        // 背景が暗い場合はダーク属性、明るい場合はライト属性を付与してテキスト視認性を守る
        const isDark = isColorDark(bg);
        htmlEl.setAttribute("data-bs-theme", isDark ? "dark" : "light");
        appRoot.setAttribute("data-bs-theme", isDark ? "dark" : "light");

        // コードブロックなどの補助背景を透過色ブレンドで綺麗に表現する
        htmlEl.style.setProperty(
          "--bs-tertiary-bg",
          isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
        );
        htmlEl.style.setProperty(
          "--bs-secondary-bg",
          isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        );

        customColorsContainer.style.display = "block";
      } else {
        // カスタム設定のクリア
        htmlEl.style.removeProperty("--bs-body-bg");
        htmlEl.style.removeProperty("--bs-body-color");
        htmlEl.style.removeProperty("--bs-border-color");
        htmlEl.style.removeProperty("--bs-tertiary-bg");
        htmlEl.style.removeProperty("--bs-secondary-bg");

        if (settings.theme === "auto") {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          htmlEl.setAttribute("data-bs-theme", isDark ? "dark" : "light");
          appRoot.setAttribute("data-bs-theme", isDark ? "dark" : "light");
        } else {
          htmlEl.setAttribute("data-bs-theme", settings.theme);
          appRoot.setAttribute("data-bs-theme", settings.theme);
        }

        customColorsContainer.style.display = "none";
      }
    }

    // 3. フォントファミリーの適用
    if (settings.fontFamily) {
      fontSelect.value = settings.fontFamily;
      applyFontFamily(settings.fontFamily, appRoot);
    }

    // 4. 最大横幅の適用
    if (settings.maxWidth) {
      maxWidthSlider.value = String(settings.maxWidth);
      maxWidthBadge.textContent = `${settings.maxWidth}px`;
      const container = document.querySelector(".mv-container") as HTMLElement;
      if (container) {
        container.style.maxWidth = `${settings.maxWidth}px`;
      }
    }

    // 5. フォントサイズの適用
    if (settings.fontSize) {
      fontSizeSlider.value = String(settings.fontSize);
      fontSizeBadge.textContent = `${settings.fontSize}px`;
      previewArea.style.fontSize = `${settings.fontSize}px`;
    }

    // 6. 画像最大高さの適用
    if (settings.imageMaxHeight) {
      imageMaxHeightSlider.value = String(settings.imageMaxHeight);
      imageMaxHeightBadge.textContent = `${settings.imageMaxHeight}%`;
      previewArea.style.setProperty("--mv-image-max-height", `${settings.imageMaxHeight}vh`);
    }

    // 7. コードブロックテーマの適用
    if (settings.codeBlockTheme) {
      codeBlockThemeSelect.value = settings.codeBlockTheme;
      previewArea.dataset.codeTheme = settings.codeBlockTheme;
    }

    // 8. TTS 設定の適用
    ttsRateSlider.value = String(settings.ttsRate);
    ttsRateBadge.textContent = `${settings.ttsRate.toFixed(1)}x`;
    ttsPitchSlider.value = String(settings.ttsPitch);
    ttsPitchBadge.textContent = settings.ttsPitch.toFixed(1);
    ttsVolumeSlider.value = String(settings.ttsVolume);
    ttsVolumeBadge.textContent = `${Math.round(settings.ttsVolume * 100)}%`;
    if (
      settings.ttsVoice &&
      ttsVoiceSelect.querySelector(`option[value="${CSS.escape(settings.ttsVoice)}"]`)
    ) {
      ttsVoiceSelect.value = settings.ttsVoice;
    }
  };

  // OSテーマ設定変更時の追従
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const mediaQueryListener = () => {
    if (currentSettings.theme === "auto") {
      const isDark = mediaQuery.matches;
      document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
      appRoot.setAttribute("data-bs-theme", isDark ? "dark" : "light");
    }
  };
  mediaQuery.addEventListener("change", mediaQueryListener);

  // 初期設定のロード
  getSettings().then((settings) => {
    currentSettings = { ...settings };
    applySettingsToDOM(currentSettings);
  });

  // 設定変更時の保存・適用
  const saveAndApply = async (newSettings: Partial<Settings>) => {
    currentSettings = { ...currentSettings, ...newSettings };
    applySettingsToDOM(currentSettings);
    await setSettings(currentSettings);
  };

  // TTS ボタン参照とイベント
  const ttsBtn = toolbar.querySelector("#mv-tts-button") as HTMLElement | null;
  const ttsStopBtn = toolbar.querySelector("#mv-tts-stop-button") as HTMLElement | null;

  const updateTtsButtonUI = () => {
    if (!ttsBtn || !ttsStopBtn) return;
    const speaking = isSpeaking();
    const paused = ttsPaused();
    if (speaking) {
      ttsBtn.innerHTML = ICON_PAUSE;
      ttsBtn.setAttribute("title", "一時停止 (R)");
      ttsStopBtn.style.display = "inline-flex";
    } else if (paused) {
      ttsBtn.innerHTML = ICON_PLAY;
      ttsBtn.setAttribute("title", "再開 (R)");
      ttsStopBtn.style.display = "inline-flex";
    } else {
      ttsBtn.innerHTML = ICON_PLAY;
      ttsBtn.setAttribute("title", "読み上げ (R)");
      ttsStopBtn.style.display = "none";
    }
  };

  // DOM テキストノードと開始位置のマッピングを構築する
  const buildTtsMap = (
    root: HTMLElement,
  ): { text: string; segments: Array<{ node: Text; start: number }> } => {
    const segments: Array<{ node: Text; start: number }> = [];
    let text = "";
    const BLOCK_TAGS = new Set([
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "LI",
      "BLOCKQUOTE",
      "PRE",
      "TD",
      "TH",
      "DT",
      "DD",
    ]);
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent ?? "";
        if (content.length > 0) {
          segments.push({ node: node as Text, start: text.length });
          text += content;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as Element).tagName;
        if (BLOCK_TAGS.has(tag) && text.length > 0 && !text.endsWith(" ")) text += " ";
        for (const child of Array.from(node.childNodes)) walk(child);
      }
    };
    walk(root);
    return { text, segments };
  };

  // CSS Custom Highlight API で読み上げ中の単語ハイライトを除去する
  const clearTtsHighlight = () => {
    CSS.highlights?.delete("mv-tts-word");
  };

  // charIndex/charLength の位置に CSS Custom Highlight API でハイライトを適用する
  // DOM を変更しないため segments の参照が壊れず、スクロールしても追従する
  const highlightTtsWord = (
    segments: Array<{ node: Text; start: number }>,
    charIndex: number,
    charLength: number,
  ) => {
    clearTtsHighlight();
    let seg: { node: Text; start: number } | undefined;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].start <= charIndex) {
        seg = segments[i];
        break;
      }
    }
    if (!seg) return;
    const nodeText = seg.node.textContent ?? "";
    const nodeStart = charIndex - seg.start;
    if (nodeStart >= nodeText.length) return;
    const nodeEnd = Math.min(nodeStart + (charLength || 1), nodeText.length);
    try {
      const range = document.createRange();
      range.setStart(seg.node, nodeStart);
      range.setEnd(seg.node, nodeEnd);
      CSS.highlights?.set("mv-tts-word", new Highlight(range));
      // ビューポート外のときだけスクロール
      const rect = range.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        seg.node.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch {
      // Range 生成に失敗した場合はスキップ
    }
  };

  const startTtsPlayback = async () => {
    const previewRender = document.getElementById("mv-preview-render");
    // DOM テキストマップを構築し、ハイライトに使用する
    const { text: ttsText, segments: ttsSegments } = previewRender
      ? buildTtsMap(previewRender)
      : { text: markdownText, segments: [] };

    let voice: SpeechSynthesisVoice | undefined;
    if (currentSettings.ttsVoice) {
      const voices = await getVoices();
      voice = voices.find((v) => v.name === currentSettings.ttsVoice);
    }

    speak(
      ttsText,
      {
        voice: voice ?? null,
        rate: currentSettings.ttsRate,
        pitch: currentSettings.ttsPitch,
        volume: currentSettings.ttsVolume,
      },
      () => {
        clearTtsHighlight();
        updateTtsButtonUI();
      },
      (charIndex, charLength) => {
        highlightTtsWord(ttsSegments, charIndex, charLength);
      },
    );

    updateTtsButtonUI();
  };

  if (ttsBtn) {
    ttsBtn.addEventListener("click", async () => {
      try {
        if (isSpeaking()) {
          ttsPause();
          updateTtsButtonUI();
          return;
        }
        if (ttsPaused()) {
          ttsResume();
          updateTtsButtonUI();
          return;
        }
        await startTtsPlayback();
      } catch (err) {
        logError("TTS play failed", "content", err);
      }
    });
  }

  if (ttsStopBtn) {
    ttsStopBtn.addEventListener("click", () => {
      try {
        ttsStop();
        clearTtsHighlight();
        updateTtsButtonUI();
      } catch (err) {
        logError("TTS stop failed", "content", err);
      }
    });
  }

  // 表示モード変更イベント
  toggleViewBtn.addEventListener("click", () => {
    const nextMode = currentSettings.viewMode === "preview" ? "source" : "preview";
    saveAndApply({ viewMode: nextMode });
  });

  // ショートカットキーでの表示モード切り替え
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (document.activeElement === document.body) {
      if (e.key === "s" || e.key === "S") {
        const nextMode = currentSettings.viewMode === "preview" ? "source" : "preview";
        saveAndApply({ viewMode: nextMode });
      } else if (e.key === "r" || e.key === "R") {
        (async () => {
          try {
            if (isSpeaking()) {
              ttsPause();
              updateTtsButtonUI();
              return;
            }
            if (ttsPaused()) {
              ttsResume();
              updateTtsButtonUI();
              return;
            }
            await startTtsPlayback();
          } catch (err) {
            logError("TTS shortcut failed", "content", err);
          }
        })();
      }
    }
  });

  // テーマ変更ラジオボタン
  themeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const value = (e.target as HTMLInputElement).value as "light" | "dark" | "auto" | "custom";
      saveAndApply({ theme: value });
    });
  });

  // カスタムカラーピッカー (文字色リアルタイム)
  customFgInput.addEventListener("input", (e) => {
    const val = (e.target as HTMLInputElement).value;
    customFgHex.textContent = val.toUpperCase();
    document.documentElement.style.setProperty("--bs-body-color", val);
    document.documentElement.style.setProperty("--bs-border-color", `${val}30`);
  });

  customFgInput.addEventListener("change", (e) => {
    const val = (e.target as HTMLInputElement).value;
    saveAndApply({ customFg: val });
  });

  // カスタムカラーピッカー (背景色リアルタイム)
  customBgInput.addEventListener("input", (e) => {
    const val = (e.target as HTMLInputElement).value;
    customBgHex.textContent = val.toUpperCase();
    document.documentElement.style.setProperty("--bs-body-bg", val);

    // 背景色に合わせてダーク/ライトモード属性もリアルタイム更新
    const isDark = isColorDark(val);
    document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
    appRoot.setAttribute("data-bs-theme", isDark ? "dark" : "light");

    document.documentElement.style.setProperty(
      "--bs-tertiary-bg",
      isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    );
    document.documentElement.style.setProperty(
      "--bs-secondary-bg",
      isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    );
  });

  customBgInput.addEventListener("change", (e) => {
    const val = (e.target as HTMLInputElement).value;
    saveAndApply({ customBg: val });
  });

  // 最大幅変更中
  maxWidthSlider.addEventListener("input", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    maxWidthBadge.textContent = `${val}px`;
    const container = document.querySelector(".mv-container") as HTMLElement;
    if (container) {
      container.style.maxWidth = `${val}px`;
    }
  });

  // 最大幅変更確定
  maxWidthSlider.addEventListener("change", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    saveAndApply({ maxWidth: val });
  });

  // フォントファミリー変更
  fontSelect.addEventListener("change", (e) => {
    const value = (e.target as HTMLSelectElement).value;
    saveAndApply({ fontFamily: value });
  });

  // コードブロックテーマ変更
  codeBlockThemeSelect.addEventListener("change", (e) => {
    const value = (e.target as HTMLSelectElement).value as Settings["codeBlockTheme"];
    saveAndApply({ codeBlockTheme: value });
  });

  // フォントサイズ変更中
  fontSizeSlider.addEventListener("input", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    fontSizeBadge.textContent = `${value}px`;
    previewArea.style.fontSize = `${value}px`;
  });

  // フォントサイズ変更確定
  fontSizeSlider.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    saveAndApply({ fontSize: value });
  });

  // 画像最大高さ変更中
  imageMaxHeightSlider.addEventListener("input", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    imageMaxHeightBadge.textContent = `${value}%`;
    previewArea.style.setProperty("--mv-image-max-height", `${value}vh`);
  });

  // 画像最大高さ変更確定
  imageMaxHeightSlider.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    saveAndApply({ imageMaxHeight: value });
  });

  // TTS ボイス変更
  ttsVoiceSelect.addEventListener("change", async (e) => {
    if (isSpeaking() || ttsPaused()) ttsStop();
    await saveAndApply({ ttsVoice: (e.target as HTMLSelectElement).value });
    updateTtsButtonUI();
  });

  // TTS 速度変更中
  ttsRateSlider.addEventListener("input", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    ttsRateBadge.textContent = `${val.toFixed(1)}x`;
  });
  ttsRateSlider.addEventListener("change", async (e) => {
    if (isSpeaking() || ttsPaused()) ttsStop();
    await saveAndApply({ ttsRate: Number((e.target as HTMLInputElement).value) });
    updateTtsButtonUI();
  });

  // TTS ピッチ変更中
  ttsPitchSlider.addEventListener("input", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    ttsPitchBadge.textContent = val.toFixed(1);
  });
  ttsPitchSlider.addEventListener("change", async (e) => {
    if (isSpeaking() || ttsPaused()) ttsStop();
    await saveAndApply({ ttsPitch: Number((e.target as HTMLInputElement).value) });
    updateTtsButtonUI();
  });

  // TTS 音量変更中
  ttsVolumeSlider.addEventListener("input", (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    ttsVolumeBadge.textContent = `${Math.round(val * 100)}%`;
  });
  ttsVolumeSlider.addEventListener("change", async (e) => {
    if (isSpeaking() || ttsPaused()) ttsStop();
    await saveAndApply({ ttsVolume: Number((e.target as HTMLInputElement).value) });
    updateTtsButtonUI();
  });

  // 設定リセットボタン (カラーテーマ等の影響を受けない)
  offcanvas.querySelector("#mv-settings-reset-btn")?.addEventListener("click", async () => {
    if (confirm("表示設定を初期状態（デフォルト）に戻しますか？")) {
      await saveAndApply(DEFAULT_SETTINGS);
    }
  });

  // ログクリア
  offcanvas.querySelector("#mv-logs-clear-btn")?.addEventListener("click", async () => {
    if (confirm("本当にシステムログを消去しますか？")) {
      await clearLogs();
      updateLogDisplay(logsContainer);
    }
  });

  // シェア
  offcanvas.querySelector("#mv-share-x")?.addEventListener("click", () => {
    const text = encodeURIComponent(`${EXTENSION_SHORT_NAME}: でプレビュー中: ${document.title}`);
    const url = encodeURIComponent(location.href);
    window.open(`https://x.com/intent/post?text=${text}&url=${url}`, "_blank");
  });

  offcanvas.querySelector("#mv-share-fb")?.addEventListener("click", () => {
    const url = encodeURIComponent(location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  });

  offcanvas.querySelector("#mv-share-copy")?.addEventListener("click", () => {
    navigator.clipboard
      .writeText(location.href)
      .then(() => {
        alert(`${EXTENSION_SHORT_NAME}: ファイルURLをクリップボードにコピーしました！`);
      })
      .catch((err) => {
        logError("URLコピーに失敗しました", "content", err);
      });
  });
}

/**
 * ログ表示の最新化
 */
function updateLogDisplay(container: HTMLElement): void {
  getLogs().then((logs) => {
    container.innerHTML = "";
    if (logs.length === 0) {
      container.innerHTML = '<div class="text-muted small text-center py-3">ログはありません</div>';
      return;
    }

    const logList = document.createElement("div");
    logList.className = "d-flex flex-column gap-1";

    logs
      .slice()
      .reverse()
      .forEach((log) => {
        const item = document.createElement("div");
        item.className = "p-1 rounded font-monospace small border-bottom border-light-subtle";
        item.style.fontSize = "11px";
        item.style.lineHeight = "1.4";

        let badgeColor = "bg-secondary-subtle text-secondary-emphasis";
        if (log.level === "warn") badgeColor = "bg-warning-subtle text-warning-emphasis";
        if (log.level === "error") badgeColor = "bg-danger-subtle text-danger-emphasis";

        item.innerHTML = `
        <div class="d-flex justify-content-between text-muted" style="font-size: 10px;">
          <span>[${log.timestamp}]</span>
          <span class="badge ${badgeColor}">${log.level.toUpperCase()} / ${log.source}</span>
        </div>
        <div class="text-break mt-1">${escapeHtml(log.message)}</div>
      `;
        logList.appendChild(item);
      });
    container.appendChild(logList);
  });
}
