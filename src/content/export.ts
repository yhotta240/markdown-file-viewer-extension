function downloadFile(content: string, contentType: string, filename: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPdf(): void {
  window.print();
}

export function exportMarkdown(markdownText: string, filename: string): void {
  downloadFile(markdownText, "text/markdown;charset=utf-8", filename);
}

export function exportRawHtml(htmlContent: string, filename: string): void {
  downloadFile(htmlContent, "text/html;charset=utf-8", filename);
}

export function exportStyledHtml(htmlContent: string, title: string, filename: string): void {
  const cssStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #24292e;
      background-color: #ffffff;
      margin: 0;
      padding: 2rem;
    }
    .markdown-body {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2rem;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h3 { font-size: 1.25em; }
    p, ul, ol, blockquote, table, pre {
      margin-top: 0;
      margin-bottom: 16px;
    }
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 16px 0;
    }
    pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: #f6f8fa;
      border-radius: 6px;
      border: 1px solid #eaecef;
    }
    code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
      margin: 0;
      padding: 0.2em 0.4em;
      background-color: rgba(27,31,35,0.05);
      border-radius: 3px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
      width: 100%;
    }
    table th, table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    table tr {
      background-color: #ffffff;
      border-top: 1px solid #c6cbd1;
    }
    table tr:nth-child(even) {
      background-color: #f6f8fa;
    }
    img {
      max-width: 100%;
      box-sizing: content-box;
      background-color: #ffffff;
    }
  `;

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    ${cssStyles}
  </style>
</head>
<body>
  <div class="markdown-body">
    ${htmlContent}
  </div>
</body>
</html>`;

  downloadFile(fullHtml, "text/html;charset=utf-8", filename);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
