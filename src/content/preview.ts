import { marked } from "marked";

/**
 * ページ内の pre 要素からマークダウンテキストを抽出する
 */
export function getMarkdownText(): string | null {
  // Chromeなどでローカルのmdファイルを開くと、通常は pre タグの中にテキストが入っている
  const pre = document.querySelector("pre");
  if (pre) {
    return pre.textContent || "";
  }
  return document.body.innerText || null;
}

/**
 * 元のプレーンテキスト表示（preタグ）を非表示にする
 */
export function hideRawContent(): void {
  const pre = document.querySelector("pre");
  if (pre) {
    pre.style.display = "none";
  }
  // body のデフォルトマージンや背景をプレビュー用にクリアする
  document.body.style.margin = "0";
  document.body.style.padding = "0";
}

/**
 * 元のプレーンテキスト表示（preタグ）を再表示する
 * (※現在はセンター内でソース表示するため、基本的には使用されませんが、互換性のために残します)
 */
export function showRawContent(): void {
  const pre = document.querySelector("pre");
  if (pre) {
    pre.style.display = "";
  }
  document.body.style.margin = "";
  document.body.style.padding = "";
}

/**
 * パースされたHTML要素にBootstrapクラスを付与する
 */
function applyBootstrapClasses(container: HTMLElement): void {
  // テーブル
  container.querySelectorAll("table").forEach((table) => {
    table.classList.add("table", "table-striped", "table-bordered", "table-hover", "align-middle");
    // テーブルラッパーを作ってスクロール可能にする
    const wrapper = document.createElement("div");
    wrapper.className = "table-responsive";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  // 引用
  container.querySelectorAll("blockquote").forEach((bq) => {
    bq.classList.add(
      "blockquote",
      "border-start",
      "border-4",
      "border-secondary-subtle",
      "ps-3",
      "py-2",
      "bg-body-secondary",
      "text-muted",
      "rounded-end",
    );
  });

  // 画像
  container.querySelectorAll("img").forEach((img) => {
    img.classList.add("img-fluid", "rounded", "shadow-sm", "my-3", "d-block", "mx-auto");
  });
}

/**
 * プレビュー用DOMを生成し、HTMLプレビュー領域と生ソースコード領域を両方流し込む
 */
export async function renderPreview(markdownText: string): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.id = "mv-preview-area";

  // 1. プレビュー表示用
  const previewRender = document.createElement("div");
  previewRender.id = "mv-preview-render";

  const parsedHtml = await marked.parse(markdownText);
  previewRender.innerHTML = parsedHtml;

  // Bootstrap クラスの適用
  applyBootstrapClasses(previewRender);
  container.appendChild(previewRender);

  // 2. ソースコード表示用 (プレビューと同じセンター位置で表示するため)
  const sourceRender = document.createElement("div");
  sourceRender.id = "mv-source-render";
  sourceRender.style.display = "none"; // 初期状態は非表示

  const pre = document.createElement("pre");
  pre.className = "p-3 bg-body-tertiary border rounded";

  const code = document.createElement("code");
  code.className = "font-monospace";
  code.style.whiteSpace = "pre-wrap";
  code.style.wordBreak = "break-all";
  code.textContent = markdownText;

  pre.appendChild(code);
  sourceRender.appendChild(pre);
  container.appendChild(sourceRender);

  return container;
}

/**
 * タブのアイコン（favicon）を拡張機能のアイコンに設定する
 */
export function setFavicon(): void {
  try {
    // 既存のファビコンリンクタグをすべて削除
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    for (const icon of Array.from(existingIcons)) {
      icon.remove();
    }

    // 新しいファビコン用リンクタグを作成
    const link = document.createElement("link");
    link.type = "image/png";
    link.rel = "icon";
    link.href = chrome.runtime.getURL("icons/icon.png");
    document.head.appendChild(link);
  } catch (error) {
    console.warn("Markdown View: ファビコンの設定に失敗しました", error);
  }
}
