import { getStorage, setStorage } from "./storage";

const HISTORY_STORAGE_KEY = "historyItems";
const HISTORY_LIMIT = 20;

export type HistoryItem = {
  url: string;
  title: string;
  fileName: string;
  lastOpenedAt: number;
  locationType: "local" | "web";
};

export type NewHistoryItem = Omit<HistoryItem, "lastOpenedAt">;

type HistoryStorage = {
  historyItems?: HistoryItem[];
};

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HistoryItem>;
  return (
    typeof item.url === "string" &&
    typeof item.title === "string" &&
    typeof item.fileName === "string" &&
    typeof item.lastOpenedAt === "number" &&
    (item.locationType === "local" || item.locationType === "web")
  );
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  const data = await getStorage<HistoryStorage>(HISTORY_STORAGE_KEY);
  return (data.historyItems ?? [])
    .filter(isHistoryItem)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

function createHistoryItem(item: NewHistoryItem): HistoryItem {
  return {
    ...item,
    title: item.title || item.fileName,
    lastOpenedAt: Date.now(),
  };
}

export async function recordHistoryItem(item: NewHistoryItem): Promise<void> {
  if (!item.url) return;

  const currentItems = await getHistoryItems();
  const nextItem = createHistoryItem(item);
  const deduplicatedItems = currentItems.filter((currentItem) => currentItem.url !== item.url);

  await setStorage({
    [HISTORY_STORAGE_KEY]: [nextItem, ...deduplicatedItems].slice(0, HISTORY_LIMIT),
  });
}

export async function clearHistoryItems(): Promise<void> {
  await setStorage({ [HISTORY_STORAGE_KEY]: [] });
}
