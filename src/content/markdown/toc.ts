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
    { rootMargin: "0px 0px -10% 0px", threshold: 0 },
  );

  for (const heading of headings) observer.observe(heading);
}

/**
 * リーダーレイアウトの配置スペースから目次の通常/ミニ表示を動的判定する
 */
function updateTocResponsive(
  tocWrapper: HTMLElement,
  popup: HTMLElement,
  readerLayout: HTMLElement,
): void {
  if (tocWrapper.style.display === "none") {
    popup.classList.remove("visible");
    return;
  }

  const desktopTocWidth = 240;
  const layoutMargin = 32;
  const configuredPreviewWidth = Number.parseFloat(
    getComputedStyle(readerLayout).getPropertyValue("--mv-preview-width"),
  );
  const previewWidth = Number.isFinite(configuredPreviewWidth) ? configuredPreviewWidth : 860;
  const windowWidth = window.innerWidth;
  const fullLayoutWidth = previewWidth + desktopTocWidth;
  const isMinimized = !(windowWidth >= 1100 && windowWidth >= fullLayoutWidth + layoutMargin * 2);

  tocWrapper.classList.toggle("mv-toc-minimized", isMinimized);
  readerLayout.classList.toggle("mv-toc-minimized-layout", isMinimized);

  if (!isMinimized) {
    popup.classList.remove("visible");
  }
}

/**
 * 目次 (TOC) を構築する
 */
export function buildTOC(previewArea: HTMLElement, readerLayout: HTMLElement): void {
  // 既存のTOCとポップアップをクリア
  document.getElementById("mv-toc-wrapper")?.remove();
  document.getElementById("mv-toc-mini-popup")?.remove();

  const headings = Array.from(
    previewArea.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  ) as HTMLElement[];
  readerLayout.classList.toggle("mv-no-toc-layout", headings.length === 0);
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
  readerLayout.appendChild(tocWrapper);

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
    const popupW = popup.offsetWidth;
    const clampedTop = Math.min(
      Math.max(margin + popupH / 2, rect.top + rect.height / 2),
      window.innerHeight - margin - popupH / 2,
    );
    const clampedLeft = Math.min(
      Math.max(margin, rect.left - popupW - margin),
      window.innerWidth - popupW - margin,
    );
    popup.style.top = `${clampedTop}px`;
    popup.style.left = `${clampedLeft}px`;
    popup.style.right = "";

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
  tocWrapper.addEventListener(
    "click",
    (e) => {
      if (!tocWrapper.classList.contains("mv-toc-minimized")) return;

      const target = e.target as Element | null;
      if (target?.closest(".mv-toc-link")) {
        hidePopup();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (popup.classList.contains("visible")) {
        hidePopup();
      } else {
        showPopup();
      }
    },
    true,
  );
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
    updateTocResponsive(tocWrapper, popup, readerLayout);
    // ミニモード時: バーの高さと gap を動的計算してはみ出しを防ぐ
    const n = tocItems.length;
    if (tocWrapper.classList.contains("mv-toc-minimized") && n > 0) {
      const margin = 8;
      // 70% を上限としつつ、itemH を floor で切り捨てるので totalH は必ず上限内に収まる
      const availH = window.innerHeight * 0.7;
      const itemH = Math.max(2, Math.min(20, Math.floor(availH / n)));
      const gapPx =
        n > 1 ? Math.max(0, Math.min(6, Math.floor((availH - n * itemH) / (n - 1)))) : 0;
      ul.style.gap = `${gapPx}px`;
      for (const li of tocItems) {
        li.style.height = `${itemH}px`;
        const a = li.querySelector("a") as HTMLElement | null;
        if (a) a.style.height = `${itemH}px`;
      }
      const totalH = n * itemH + (n > 1 ? (n - 1) * gapPx : 0);
      const idealTop = (window.innerHeight - totalH) / 2;
      tocWrapper.style.setProperty(
        "--mv-toc-mini-top",
        `${Math.min(Math.max(margin, idealTop), window.innerHeight - totalH - margin)}px`,
      );
    } else {
      tocWrapper.style.removeProperty("--mv-toc-mini-top");
      ul.style.gap = "";
      for (const li of tocItems) {
        li.style.height = "";
        const a = li.querySelector("a") as HTMLElement | null;
        if (a) a.style.height = "";
      }
    }
  };
  window.addEventListener("resize", updateLayout);

  requestAnimationFrame(updateLayout);
}
