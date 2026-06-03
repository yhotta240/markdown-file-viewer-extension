# Markdown File Viewer Extension

ブラウザで Markdown ファイルを快適に閲覧するための Chrome 拡張機能です。シンプルな UI と豊富な機能で、Markdown ファイルの内容を見やすく整理し、必要な情報に素早くアクセスできます。

## 主な機能

- Markdown の自動検出とリッチプレビュー
- 目次（TOC）の自動生成とスクロール同期
- プレビュー／ソース表示の切り替え
- テーマ・フォント・表示幅のカスタマイズ
- Markdown・HTML・PDF へのエクスポート
- 印刷，URL共有，クリップボードコピー

## インストール

### Chrome Web Store からインストール

準備中...

### 手動インストール

必要条件

- [Node.js](https://nodejs.org/) (v18.x 以上を推奨)
- [npm](https://www.npmjs.com/) または [yarn](https://yarnpkg.com/)

手順

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/yhotta240/markdown-file-viewer-extension
   cd markdown-file-viewer-extension
   ```

2. 依存関係をインストール

   ```bash
   npm install
   ```

3. ビルド

   ```bash
   npm run build
   ```

4. Chrome に読み込む
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」をオンにする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` ディレクトリを選択

## 使い方

[使い方](docs/usage.md) を参照してください

## ライセンス

MIT License

## 作者

- yhotta240 (https://github.com/yhotta240)
