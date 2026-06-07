type PopoverOptions = {
  trigger: HTMLElement;
  popover: HTMLElement;
  closeDelayMs?: number;
};

export function bindHoverPopover({ trigger, popover, closeDelayMs = 150 }: PopoverOptions): void {
  let timeoutId: number | null = null;

  const show = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    popover.classList.add("show");
  };

  const hide = () => {
    timeoutId = window.setTimeout(() => {
      popover.classList.remove("show");
    }, closeDelayMs);
  };

  trigger.addEventListener("mouseenter", show);
  trigger.addEventListener("mouseleave", hide);
  popover.addEventListener("mouseenter", show);
  popover.addEventListener("mouseleave", hide);

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
