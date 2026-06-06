import { escapeHtml } from "../utils/html";

type FrontMatterValue = string | number | boolean;

export type MarkdownFileInfo = {
  fileName: string;
  locationType: "local" | "web";
  path: string;
  url: string;
  sizeBytes: number;
  lineCount: number;
  characterCount: number;
  wordCount: number;
  imageCount: number;
  linkCount: number;
  headingCount: number;
  codeBlockCount: number;
  tableCount: number;
  frontMatter: Record<string, FrontMatterValue>;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function getFileName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const name = normalized.split("/").filter(Boolean).pop();
  return name || document.title || "document.md";
}

function parseFrontMatter(markdownText: string): Record<string, FrontMatterValue> {
  const match = markdownText.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};

  const metadata: Record<string, FrontMatterValue> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key) continue;

    const unquoted = rawValue.replace(/^["']|["']$/g, "");
    if (unquoted === "true") {
      metadata[key] = true;
    } else if (unquoted === "false") {
      metadata[key] = false;
    } else if (/^-?\d+(?:\.\d+)?$/.test(unquoted)) {
      metadata[key] = Number(unquoted);
    } else {
      metadata[key] = unquoted;
    }
  }

  return metadata;
}

export function collectMarkdownFileInfo(
  markdownText: string,
  previewArea: HTMLElement,
  loc: Location = window.location,
): MarkdownFileInfo {
  const frontMatter = parseFrontMatter(markdownText);
  const url = loc.href;
  const isLocal = loc.protocol === "file:";
  const path = isLocal ? decodePath(loc.pathname.replace(/^\/([A-Za-z]:)/, "$1")) : url;
  const previewRender = previewArea.querySelector("#mv-preview-render") ?? previewArea;

  return {
    fileName: getFileName(isLocal ? path : loc.pathname),
    locationType: isLocal ? "local" : "web",
    path,
    url,
    sizeBytes: new Blob([markdownText]).size,
    lineCount: markdownText.length === 0 ? 0 : markdownText.split(/\r\n|\r|\n/).length,
    characterCount: markdownText.length,
    wordCount: markdownText.trim() ? markdownText.trim().split(/\s+/).length : 0,
    imageCount: previewRender.querySelectorAll("img").length,
    linkCount: previewRender.querySelectorAll("a[href]").length,
    headingCount: previewRender.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
    codeBlockCount: previewRender.querySelectorAll("pre code").length,
    tableCount: previewRender.querySelectorAll("table").length,
    frontMatter,
  };
}

function renderInfoRow(label: string, value: string | number | undefined): string {
  return `
    <div class="mv-file-info-row">
      <span class="mv-file-info-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value === undefined || value === "" ? "取得不可" : String(value))}</strong>
    </div>
  `;
}

export function renderFileInfoPopover(info: MarkdownFileInfo): string {
  const frontMatterEntries = Object.entries(info.frontMatter);
  const frontMatterHtml =
    frontMatterEntries.length > 0
      ? frontMatterEntries.map(([key, value]) => renderInfoRow(key, String(value))).join("")
      : '<div class="mv-file-info-empty">メタ情報はありません</div>';

  return `
    <div class="mv-file-info-popover" id="mv-file-info-popover" role="tooltip" tabindex="-1">
      <div class="mv-file-info-title">${escapeHtml(info.fileName)}</div>
      <div class="mv-file-info-section">
        ${renderInfoRow("種類", info.locationType === "local" ? "ローカルファイル" : "Webファイル")}
        ${renderInfoRow(info.locationType === "local" ? "ファイルパス" : "URL", info.locationType === "local" ? info.path : info.url)}
        ${renderInfoRow("サイズ", formatBytes(info.sizeBytes))}
        ${renderInfoRow("行数", info.lineCount)}
        ${renderInfoRow("文字数", info.characterCount)}
        ${renderInfoRow("単語数", info.wordCount)}
      </div>
      <div class="mv-file-info-section">
        ${renderInfoRow("画像数", info.imageCount)}
        ${renderInfoRow("リンク数", info.linkCount)}
        ${renderInfoRow("見出し数", info.headingCount)}
        ${renderInfoRow("コードブロック数", info.codeBlockCount)}
        ${renderInfoRow("テーブル数", info.tableCount)}
      </div>
      <div class="mv-file-info-section">
        <div class="mv-file-info-subtitle">先頭メタ情報</div>
        ${frontMatterHtml}
      </div>
    </div>
  `;
}
