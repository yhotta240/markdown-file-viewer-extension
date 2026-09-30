type PopoverOptions = {
  trigger: HTMLElement;
  popover: HTMLElement;
  hoverRegion?: HTMLElement;
};

export function bindHoverPopover({ trigger, popover, hoverRegion }: PopoverOptions): void {
  const show = () => {
    popover.classList.add("show");
  };

  const hide = () => {
    popover.classList.remove("show");
  };

  const isOwnedTarget = (target: EventTarget | null): target is Node =>
    target instanceof Node && (trigger.contains(target) || popover.contains(target));

  const closeOnOtherToolHover = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const toolbarButton = target.closest(".mv-toolbar-btn");
    if (toolbarButton && toolbarButton !== trigger) {
      hide();
    }
  };

  const closeOnOtherToolFocus = (event: FocusEvent) => {
    if (!isOwnedTarget(event.target)) {
      hide();
    }
  };

  trigger.addEventListener("mouseenter", show);
  popover.addEventListener("mouseenter", show);
  hoverRegion?.addEventListener("mouseleave", hide);
  hoverRegion?.addEventListener("mouseover", closeOnOtherToolHover);
  hoverRegion?.addEventListener("focusin", closeOnOtherToolFocus);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    popover.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    popover.classList.remove("show");
  });

  popover.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
