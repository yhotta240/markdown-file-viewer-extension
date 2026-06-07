/**
 * HTML特殊文字をエスケープする
 * @param str - エスケープ対象の文字列
 * @returns エスケープされた文字列
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTML のタグにクラスを付与する
 * @param MARKDOWN_CLASS_MAP - タグとクラス名のマッピング
 * @param html - クラスを付与したい HTML 文字列
 * @returns クラスが付与された HTML 文字列
 */
export function applyMarkdownClassMap(
  MARKDOWN_CLASS_MAP: Record<string, string>,
  html: string,
): string {
  return Object.entries(MARKDOWN_CLASS_MAP).reduce((result, [tag, className]) => {
    const openTag = `<${tag}>`;
    const openTagWithClass = `<${tag} class="${className}">`;
    return result.replace(new RegExp(openTag, "g"), openTagWithClass);
  }, html);
}
