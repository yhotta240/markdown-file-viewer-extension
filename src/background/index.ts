import { EXTENSION_SHORT_NAME, EXTENSION_VERSION } from "../settings";
import { logInfo } from "../utils/logger";
import { reloadTargetTabs } from "../utils/reload-tabs";
import { isEnabled, setEnabled } from "../utils/storage";

const targetMdUrls = ["file:///*/*.md", "file:///*/*.markdown"];

async function updateBadgeState() {
  const enabled = await isEnabled();
  chrome.action.setIcon({
    path: enabled ? "icons/icon.png" : "icons/icon-disabled.png",
  });
  chrome.action.setTitle({
    title: enabled ? `${EXTENSION_SHORT_NAME}: 有効` : `${EXTENSION_SHORT_NAME}: 無効`,
  });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    logInfo("拡張機能がインストールされました", "background");
    await setEnabled(true);
  } else if (details.reason === "update") {
    logInfo(
      `拡張機能がアップデートされました (v${details.previousVersion ?? "?"} → v${EXTENSION_VERSION})`,
      "background",
    );
  }
  await updateBadgeState();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadgeState();
});

chrome.action.onClicked.addListener(async () => {
  const enabled = await isEnabled();
  const nextEnabled = !enabled;
  await setEnabled(nextEnabled);
  await updateBadgeState();
  await reloadTargetTabs(targetMdUrls);
});
