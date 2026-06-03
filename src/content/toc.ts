/**
 * スクロール位置に応じて目次項目をアクティブ表示にするオブザーバーのセットアップ
 */
function setupTocObserver(headings: HTMLElement[], tocItems: HTMLElement[]): void {
  if (headings.length === 0 || tocItems.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -60% 0px", // 画面中央付近を通過した時にアクティブ判定
    threshold: 0,
  };

  let activeId = "";

  const observer = new IntersectionObserver((entries) => {
    // 交差している要素をフィルタ
    const visibleEntries = entries.filter((entry) => entry.isIntersecting);

    if (visibleEntries.length > 0) {
      // 画面上部に最も近い交差した見出しをアクティブにする
      activeId = visibleEntries[0].target.id;
    }

    // スクロール位置が上端に近いときは、最初の見出しをアクティブにする
    if (window.scrollY < 100 && headings.length > 0) {
      activeId = headings[0].id;
    }

    // TOCの対応するアイテムに active クラスを設定する
    for (const item of tocItems) {
      const link = item.querySelector("a");
      if (link) {
        const href = link.getAttribute("href");
        if (href === `#${activeId}`) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      }
    }
  }, observerOptions);

  for (const heading of headings) {
    observer.observe(heading);
  }
}

/**
 * プレビューコンテナの配置スペースから目次のデスクトップ/ミニインジケーター表示を動的判定する
 */
function updateTocResponsive(tocWrapper: HTMLElement): void {
  const container = document.querySelector(".mv-container") as HTMLElement;
  if (!container || !tocWrapper) return;

  const containerRect = container.getBoundingClientRect();
  const windowWidth = window.innerWidth;

  // プレビューの右端からウィンドウ右端までの空きスペース
  const rightSpace = windowWidth - (containerRect.left + containerRect.width);

  // 260px 以上のスペースが確保でき、かつウィンドウ幅が 1100px 以上の場合は通常表示
  if (rightSpace >= 260 && windowWidth >= 1100) {
    tocWrapper.classList.remove("mv-toc-minimized");
    tocWrapper.style.position = "fixed";
    tocWrapper.style.left = `${containerRect.left + containerRect.width + 30}px`;
    tocWrapper.style.top = "6rem";
    tocWrapper.style.right = "";
    tocWrapper.style.transform = "";
  } else {
    // スペースが足りない場合はミニインジケーター（短い横棒）モード
    tocWrapper.classList.add("mv-toc-minimized");
    tocWrapper.style.position = "fixed";
    tocWrapper.style.left = "";
    tocWrapper.style.right = "1.5rem";
    tocWrapper.style.top = "50%";
    tocWrapper.style.transform = "translateY(-50%)";
  }
}

/**
 * 目次 (TOC) を構築する
 */
export function buildTOC(previewArea: HTMLElement, appRoot: HTMLElement): void {
  // 既存のTOCがあればクリアする
  const oldToc = document.getElementById("mv-toc-wrapper");
  if (oldToc) {
    oldToc.remove();
  }

  // プレビュー領域内の見出しを抽出
  const headings = Array.from(
    previewArea.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  ) as HTMLElement[];
  if (headings.length === 0) return;

  // TOCコンテナの作成
  const tocWrapper = document.createElement("div");
  tocWrapper.id = "mv-toc-wrapper";
  tocWrapper.className = "mv-toc-wrapper";

  const nav = document.createElement("nav");
  nav.id = "mv-toc-nav";

  const ul = document.createElement("ul");
  const tocItems: HTMLElement[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    // 見出しにIDがなければ自動付与
    if (!heading.id) {
      heading.id = `toc-heading-${i}`;
    }

    const li = document.createElement("li");
    li.className = `mv-toc-item mv-toc-depth-${heading.tagName.toLowerCase()}`;
    li.setAttribute("data-title", heading.textContent || "");

    const a = document.createElement("a");
    a.className = "mv-toc-link";
    a.href = `#${heading.id}`;

    const span = document.createElement("span");
    span.textContent = heading.textContent;
    a.appendChild(span);

    // 見出しへのスムーズスクロール
    a.addEventListener("click", (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    li.appendChild(a);
    ul.appendChild(li);
    tocItems.push(li);
  }

  nav.appendChild(ul);
  tocWrapper.appendChild(nav);
  appRoot.appendChild(tocWrapper);

  // スクロール監視の開始
  setupTocObserver(headings, tocItems);

  // リサイズ・最大幅調整イベントに連動してレイアウト更新
  const updateLayout = () => updateTocResponsive(tocWrapper);
  window.addEventListener("resize", updateLayout);

  const maxWidthSlider = document.getElementById("mv-max-width-slider");
  maxWidthSlider?.addEventListener("input", updateLayout);
  maxWidthSlider?.addEventListener("change", updateLayout);

  // 初期レイアウト適用
  requestAnimationFrame(() => {
    updateLayout();
  });
}
