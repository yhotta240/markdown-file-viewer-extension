export function getSafeFilename(title: string): string {
  let name = title;
  if (name.toLowerCase().endsWith(".md")) {
    name = name.slice(0, -3);
  } else if (name.toLowerCase().endsWith(".markdown")) {
    name = name.slice(0, -9);
  }

  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "document";
}
