import privacyDoc from "../../docs/privacy.md";
import shortcutsDoc from "../../docs/shortcuts.md";
import usageDoc from "../../docs/usage.md";
import { DEFAULT_SETTINGS, type Settings } from "../settings";
import { escapeHtml } from "../utils/html";
import { clearLogs, getLogs } from "../utils/logger";
import { getSettings, setSettings } from "../utils/storage";

// SVGアイコン定数
const ICON_EYE_FILL = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
  </svg>
`;

const ICON_CODE_SLASH = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0m6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0"/>
  </svg>
`;

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
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2zm1-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H5v-1z"/>
        <path d="M4 1.5v1h8v-1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
      </svg>
    </button>
    
    <div class="mv-toolbar-divider"></div>
    
    <!-- 設定を開く -->
    <button type="button" class="mv-toolbar-btn" id="mv-gear-button" title="設定を開く (T)">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z"/>
      </svg>
    </button>
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
      <h5 class="offcanvas-title fw-bold">Markdown View 設定</h5>
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

        <!-- プレビュー最大横幅 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-max-width-slider" class="form-label small fw-semibold text-secondary mb-0">最大横幅</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-max-width-badge">860px</span>
          </div>
          <input type="range" class="form-range" min="500" max="1200" step="20" id="mv-max-width-slider" value="860">
        </div>

        <!-- フォントサイズ -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-2">
            <label for="mv-font-size-slider" class="form-label small fw-semibold text-secondary mb-0">フォントサイズ</label>
            <span class="badge bg-secondary-subtle text-secondary-emphasis" id="mv-font-size-badge">16px</span>
          </div>
          <input type="range" class="form-range" min="12" max="24" step="1" id="mv-font-size-slider" value="16">
        </div>

        <!-- 通知のオンオフ -->
        <div class="form-check form-switch mt-3">
          <input class="form-check-input" type="checkbox" role="switch" id="mv-settings-notifications" checked>
          <label class="form-check-label small fw-medium text-secondary" for="mv-settings-notifications">通知を有効にする</label>
        </div>
      </div>

      <hr class="my-4 text-muted">

      <!-- 2. アクション & シェア -->
      <div class="mb-4">
        <h6 class="fw-bold mb-3 small text-uppercase tracking-wider text-muted">シェア・操作</h6>
        <div class="d-flex flex-column gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm text-start py-2 px-3 d-flex align-items-center gap-2" id="mv-share-x">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.01zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633z"/>
            </svg>
            <span>X (Twitter) でシェア</span>
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm text-start py-2 px-3 d-flex align-items-center gap-2" id="mv-share-fb">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.02 3.604-.02 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.73V6.275c0-2.017 1.194-3.112 3.022-3.112.872 0 1.785.164 1.785.164v1.987h-1.02c-.992 0-1.302.621-1.302 1.258v1.79h2.24l-.357 2.442h-1.883v5.625C12.983 15.397 16 12.067 16 8.049"/>
            </svg>
            <span>Facebook でシェア</span>
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm text-start py-2 px-3 d-flex align-items-center gap-2" id="mv-share-copy">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
            </svg>
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
            <span class="fw-medium">Markdown View</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span>バージョン:</span>
            <span class="fw-medium">0.3.0</span>
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
    }
  });

  // コピーボタン
  copyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(markdownText)
      .then(() => {
        copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard-check-fill text-success" viewBox="0 0 16 16">
          <path d="M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0zm3 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5z"/>
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1A2.5 2.5 0 0 1 9.5 5h-3A2.5 2.5 0 0 1 4 2.5zm6.854 7.354-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708.708"/>
        </svg>
      `;
        copyBtn.setAttribute("title", "コピーしました！");

        setTimeout(() => {
          copyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2zm1-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H5v-1z"/>
            <path d="M4 1.5v1h8v-1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
          </svg>
        `;
          copyBtn.setAttribute("title", "Markdownをコピー");
        }, 2000);
      })
      .catch((err) => {
        console.error("Markdown View: コピーに失敗しました", err);
      });
  });

  // 設定項目DOM要素への参照
  const themeRadios = offcanvas.querySelectorAll<HTMLInputElement>('input[name="mv-theme"]');
  const fontSizeSlider = offcanvas.querySelector("#mv-font-size-slider") as HTMLInputElement;
  const fontSizeBadge = offcanvas.querySelector("#mv-font-size-badge") as HTMLElement;
  const notifyCheckbox = offcanvas.querySelector("#mv-settings-notifications") as HTMLInputElement;
  const fontSelect = offcanvas.querySelector("#mv-font-family-select") as HTMLSelectElement;

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
        toggleViewBtn.setAttribute("title", "プレビューを表示 (P)");
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

    // 6. 通知設定の適用
    if (settings.notifications !== undefined) {
      notifyCheckbox.checked = settings.notifications;
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

  // 通知設定
  notifyCheckbox.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    saveAndApply({ notifications: checked });
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
    const text = encodeURIComponent(`Markdown View でプレビュー中: ${document.title}`);
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
        alert("ファイルURLをクリップボードにコピーしました！");
      })
      .catch((err) => {
        console.error("Markdown View: URLコピーに失敗しました", err);
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
