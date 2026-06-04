/**
 * スクロール位置に応じて目次項目をアクティブ表示にするオブザーバーのセットアップ
 */
function setupTocObserver(headings: HTMLElement[], tocItems: HTMLElement[]): void {
  if (headings.length === 0 || tocItems.length === 0) return;

  let activeId = "";

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length > 0) activeId = visible[0].target.id;

      // スクロール位置が上端に近いときは最初の見出しをアクティブにする
      if (window.scrollY < 100) activeId = headings[0].id;

      for (const item of tocItems) {
        const href = item.querySelector("a")?.getAttribute("href");
        item.classList.toggle("active", href === `#${activeId}`);
      }
    },
    { rootMargin: "0px 0px -60% 0px", threshold: 0 },
  );

  for (const heading of headings) observer.observe(heading);
}

/**
 * プレビューコンテナの配置スペースから目次のデスクトップ/ミニインジケーター表示を動的判定する
 */
function updateTocResponsive(tocWrapper: HTMLElement, popup: HTMLElement): void {
  const container = document.querySelector(".mv-container") as HTMLElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const rightSpace = windowWidth - (containerRect.left + containerRect.width);
  const isMinimized = !(rightSpace >= 260 && windowWidth >= 1100);

  tocWrapper.classList.toggle("mv-toc-minimized", isMinimized);
  tocWrapper.style.position = "fixed";
  tocWrapper.style.right = "";

  if (!isMinimized) {
    tocWrapper.style.left = `${containerRect.left + containerRect.width + 30}px`;
    tocWrapper.style.top = "6rem";
    tocWrapper.style.transform = "";
    popup.classList.remove("visible");
  } else {
    const indicatorLeft = Math.min(containerRect.left + containerRect.width + 8, windowWidth - 38);
    tocWrapper.style.left = `${Math.max(0, indicatorLeft)}px`;
    tocWrapper.style.top = "50%";
    tocWrapper.style.transform = "translateY(-50%)";
  }
}

/**
 * 目次 (TOC) を構築する
 */
export function buildTOC(previewArea: HTMLElement, appRoot: HTMLElement): void {
  // 既存のTOCとポップアップをクリア
  document.getElementById("mv-toc-wrapper")?.remove();
  document.getElementById("mv-toc-mini-popup")?.remove();

  const headings = Array.from(
    previewArea.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  ) as HTMLElement[];
  if (headings.length === 0) return;

  // TOCコンテナの作成
  const tocWrapper = document.createElement("div");
  tocWrapper.id = "mv-toc-wrapper";
  tocWrapper.className = "mv-toc-wrapper";

  const nav = document.createElement("nav");
  const ul = document.createElement("ul");
  const tocItems: HTMLElement[] = [];

  for (const [i, heading] of headings.entries()) {
    if (!heading.id) heading.id = `toc-heading-${i}`;

    const a = document.createElement("a");
    a.className = "mv-toc-link";
    a.href = `#${heading.id}`;
    a.appendChild(document.createElement("span")).textContent = heading.textContent;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const li = document.createElement("li");
    li.className = `mv-toc-item mv-toc-depth-${heading.tagName.toLowerCase()}`;
    li.appendChild(a);
    ul.appendChild(li);
    tocItems.push(li);
  }

  nav.appendChild(ul);
  tocWrapper.appendChild(nav);
  appRoot.appendChild(tocWrapper);

  // ---- ミニモード用ポップアップ ----
  const popup = document.createElement("div");
  popup.id = "mv-toc-mini-popup";
  popup.className = "mv-toc-mini-popup";
  popup.setAttribute("role", "menu");
  document.body.appendChild(popup);

  // ディレイ管理: インジケーターとポップアップ間を移動する際に閉じないようにする
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const cancelHide = () => {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };
  const hidePopup = () => {
    cancelHide();
    popup.classList.remove("visible");
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer = setTimeout(hidePopup, 150);
  };

  const popupItems: HTMLElement[] = [];
  for (const heading of headings) {
    const btn = document.createElement("button");
    btn.className = "mv-toc-mini-popup-item";
    btn.setAttribute("data-depth", heading.tagName.toLowerCase());
    btn.setAttribute("role", "menuitem");
    btn.textContent = heading.textContent ?? "";
    btn.addEventListener("click", () => {
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      hidePopup();
    });
    popup.appendChild(btn);
    popupItems.push(btn);
  }

  const showPopup = () => {
    cancelHide();
    if (!tocWrapper.classList.contains("mv-toc-minimized")) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;

    for (const [i, item] of tocItems.entries()) {
      popupItems[i].classList.toggle("active", item.classList.contains("active"));
    }

    // transform: -50% 分をクランプして上下端でも画面内に収める
    const rect = tocWrapper.getBoundingClientRect();
    const popupH = popup.offsetHeight;
    const margin = 8;
    const clampedTop = Math.min(
      Math.max(margin + popupH / 2, rect.top + rect.height / 2),
      window.innerHeight - margin - popupH / 2,
    );
    popup.style.top = `${clampedTop}px`;
    popup.style.right = `${window.innerWidth - rect.left + 8}px`;

    popup.classList.add("visible");

    // レイアウト確定後にアクティブ項目をポップアップ内の中央へスクロール
    requestAnimationFrame(() => {
      const activeBtn = popup.querySelector(".mv-toc-mini-popup-item.active") as HTMLElement | null;
      if (activeBtn) {
        popup.scrollTop = Math.max(
          0,
          activeBtn.offsetTop - popup.clientHeight / 2 + activeBtn.offsetHeight / 2,
        );
      } else {
        popup.scrollTop = 0;
      }
    });
  };

  // ホバーで表示、150ms の遅延付きで非表示（インジケーター↔ポップアップ間の隙間を吸収）
  tocWrapper.addEventListener("mouseenter", showPopup);
  tocWrapper.addEventListener("mouseleave", scheduleHide);
  popup.addEventListener("mouseenter", cancelHide);
  popup.addEventListener("mouseleave", scheduleHide);

  // ポップアップ外クリックで閉じる（isConnected で再構築後の古いリスナーを無効化）
  document.addEventListener("click", (e) => {
    if (!popup.isConnected) return;
    if (!tocWrapper.contains(e.target as Node) && !popup.contains(e.target as Node)) hidePopup();
  });
  // ---- ここまでポップアップ ----

  setupTocObserver(headings, tocItems);

  const updateLayout = () => {
    updateTocResponsive(tocWrapper, popup);
    // ミニモード時: バーの高さと gap を動的計算してはみ出しを防ぐ
    const n = tocItems.length;
    if (tocWrapper.classList.contains("mv-toc-minimized") && n > 0) {
      const availH = window.innerHeight * 0.72;
      const itemH = Math.max(8, Math.min(20, Math.floor(availH / n)));
      const gapPx = Math.max(0, Math.min(6, Math.floor((availH - n * itemH) / Math.max(1, n - 1))));
      ul.style.gap = `${gapPx}px`;
      for (const li of tocItems) {
        li.style.height = `${itemH}px`;
        const a = li.querySelector("a") as HTMLElement | null;
        if (a) a.style.height = `${itemH}px`;
      }
    } else {
      ul.style.gap = "";
      for (const li of tocItems) {
        li.style.height = "";
        const a = li.querySelector("a") as HTMLElement | null;
        if (a) a.style.height = "";
      }
    }
  };
  window.addEventListener("resize", updateLayout);
  const maxWidthSlider = document.getElementById("mv-max-width-slider");
  maxWidthSlider?.addEventListener("input", updateLayout);
  maxWidthSlider?.addEventListener("change", updateLayout);

  requestAnimationFrame(updateLayout);
}
