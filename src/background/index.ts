import { logInfo } from "../utils/logger";
import { reloadTargetTabs } from "../utils/reload-tabs";
import { isEnabled, setEnabled } from "../utils/storage";

const targetMdUrls = ["file:///*/*.md", "file:///*/*.markdown"];

async function updateBadgeState() {
  const enabled = await isEnabled();
  const text = enabled ? "ON" : "OFF";
  const color = enabled ? "#198754" : "#dc3545";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    logInfo("拡張機能がインストールされました", "background");
    await setEnabled(true);
  } else if (details.reason === "update") {
    logInfo(
      `拡張機能がアップデートされました (v${details.previousVersion ?? "?"} → v${chrome.runtime.getManifest().version})`,
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
