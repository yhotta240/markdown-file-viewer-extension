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

  // コードブロックにコピー機能を追加
  addCopyButtonsToCodeBlocks(previewRender);

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
 * プレビュー内の <pre><code> にホバーで表示されるコピーUIを追加する
 */
function addCopyButtonsToCodeBlocks(root: HTMLElement): void {
  // スタイルを一度だけ挿入
  if (!document.getElementById("mv-code-copy-style")) {
    const style = document.createElement("style");
    style.id = "mv-code-copy-style";
    style.textContent = `
      .mv-code-wrapper { position: relative; overflow: visible; }
      /* シンプルで控えめなコピーボタン */
      .mv-code-copy-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 6px;
        background: rgba(255,255,255,0.95);
        color: #222;
        border: 1px solid rgba(16,24,32,0.08);
        cursor: pointer;
        opacity: 0;
        transition: opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease;
        transform: translateY(0) scale(0.98);
        z-index: 6;
        box-shadow: 0 1px 2px rgba(16,24,32,0.06);
        backdrop-filter: blur(4px);
      }
      /* ダークモード向けの色調整 */
      @media (prefers-color-scheme: dark) {
        .mv-code-copy-btn {
          background: rgba(28,31,36,0.6);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 2px rgba(0,0,0,0.6);
        }
      }
      .mv-code-wrapper:hover .mv-code-copy-btn {
        opacity: 1;
        transform: scale(1);
      }
      .mv-code-copy-btn:active {
        transform: scale(0.97);
      }
      .mv-code-copy-btn { padding: 0; box-sizing: border-box; }
      .mv-code-copy-btn svg { pointer-events: none; width: 12px; height: 12px; display: block; }
    `;
    document.head.appendChild(style);
  }

  const pres = Array.from(root.querySelectorAll("pre")) as HTMLPreElement[];
  pres.forEach((pre) => {
    // 既にラップ済みならスキップ
    if (pre.parentElement?.classList.contains("mv-code-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "mv-code-wrapper";
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // コピー用ボタン
    const btn = document.createElement("button");
    btn.className = "mv-code-copy-btn";
    btn.type = "button";
    btn.title = "コピー";
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5 1a2 2 0 0 0-2 2v1H2a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5zM4 2h8a1 1 0 0 1 1 1v1H3V3a1 1 0 0 1 1-1z"/>
        <path d="M9 6a1 1 0 0 1 1 1v6H3a1 1 0 0 1-1-1V6h7z"/>
      </svg>
    `;

    // クリックでコードテキストをコピー
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const code = pre.querySelector("code");
      const text = code ? code.textContent || "" : pre.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        const prev = btn.innerHTML;
        const prevColor = btn.style.color || "";
        // 大きめのチェックアイコンを一時表示して色を緑にする
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" style="width:14px;height:14px;display:block;" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.25 11.286l-3-3a1 1 0 1 1 1.414-1.414l1.586 1.586 6.915-6.915a1.5 1.5 0 0 1 2.12 0z"/>
          </svg>
        `;
        btn.title = "コピーしました";
        btn.style.color = "#16a34a";
        setTimeout(() => {
          btn.innerHTML = prev;
          btn.title = "コピー";
          btn.style.color = prevColor;
        }, 1600);
      } catch (err) {
        console.error("コピーに失敗しました", err);
      }
    });

    wrapper.appendChild(btn);
  });
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
