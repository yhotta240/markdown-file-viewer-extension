import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import "./code-theme.css";

import { recordHistoryItem } from "../utils/history";
import { logError, logInfo } from "../utils/logger";
import { isEnabled } from "../utils/storage";
import { collectMarkdownFileInfo } from "./file-info";
import { buildControlPanel } from "./panel";
import { hideRawContent, renderPreview, setFavicon } from "./preview";
import { buildTOC } from "./toc";

function revealDocument(): void {
  document.documentElement.style.opacity = "";
  setTimeout(() => {
    document.documentElement.style.transition = "";
  }, 50);
}

// チラつき防止（FOUC対策）の即時実行処理
function preventFlash(): void {
  try {
    // 画面全体を一時的に隠す
    document.documentElement.style.opacity = "0";
    document.documentElement.style.transition = "none";

    // ストレージロード前にOS設定に合わせたテーマを仮当てして、背景色のチラつきを防ぐ
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
  } catch (err) {
    logError(`preventFlash failed`, "content", err);
  }
}

export async function initMarkdownViewer(markdownText: string): Promise<void> {
  preventFlash();

  const enabled = await isEnabled();
  if (!enabled) {
    // 無効な場合は画面の非表示を解除して、ブラウザデフォルト表示に戻す
    revealDocument();
    return;
  }

  // タブのファビコンを拡張機能のアイコンに差し替える
  setFavicon();

  // プレビュー用のルートコンテナを作成
  const appRoot = document.createElement("div");
  appRoot.id = "mv-app-root";
  document.body.appendChild(appRoot);

  // プレビュー表示用のメイン領域 (Bootstrapコンテナ)
  const containerWrapper = document.createElement("div");
  containerWrapper.className = "mv-container";
  appRoot.appendChild(containerWrapper);

  // プレビューのレンダリング (内部にプレビューとソースの両方の領域が生成されます)
  const previewArea = await renderPreview(markdownText);
  containerWrapper.appendChild(previewArea);

  // 目次 (TOC) の自動生成と構築
  buildTOC(previewArea, appRoot);
  const fileInfo = collectMarkdownFileInfo(markdownText, previewArea);
  recordHistoryItem({
    url: fileInfo.url,
    title: document.title || fileInfo.fileName,
    fileName: fileInfo.fileName,
    locationType: fileInfo.locationType,
  }).catch((err) => {
    logError("履歴の保存に失敗しました", "content", err);
  });

  // 表示モード (プレビュー / ソースコード) の切り替え処理
  const onViewModeChange = (mode: "preview" | "source") => {
    const previewRender = document.getElementById("mv-preview-render");
    const sourceRender = document.getElementById("mv-source-render");
    const tocWrapper = document.getElementById("mv-toc-wrapper");

    if (previewRender && sourceRender) {
      if (mode === "source") {
        previewRender.style.display = "none";
        sourceRender.style.display = "block";
        if (tocWrapper) {
          tocWrapper.style.display = "none";
        }
      } else {
        sourceRender.style.display = "none";
        previewRender.style.display = "block";
        if (tocWrapper) {
          tocWrapper.style.display = "";
          // 表示を戻したあとに配置スペースの再計算をトリガーする
          window.dispatchEvent(new Event("resize"));
        }
      }
    }
  };

  // コントロールパネル (Offcanvas設定画面、および統合ツールバー) の構築
  buildControlPanel(appRoot, previewArea, markdownText, onViewModeChange, fileInfo);

  // 初期状態ではブラウザデフォルトの生ソースを非表示にする
  hideRawContent();

  // 設定の適用完了後に非表示を解除し、フェードインさせる
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      revealDocument();
    });
  });
}

export function logMissingMarkdownText(): void {
  logInfo("Markdown テキストが見つかりません", "content");
}
