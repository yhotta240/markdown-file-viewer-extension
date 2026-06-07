# Markdown File Viewer

Markdown File Viewer は，ローカルまたは Web 上の Markdown ファイルをブラウザで読みやすく表示する拡張機能です．ファイルを開くだけでプレビューに切り替わり，目次，表示設定，エクスポートをすぐに使えます．

## 主な機能

- `.md`，`.markdown` ファイルの自動プレビュー
- 見出しから目次を生成し，スクロール位置に追従
- プレビュー表示とソース表示の切り替え
- テーマ，フォント，最大横幅，コードテーマの調整
- Markdown，HTML，PDF へのエクスポート
- 印刷，コピー，URL共有，最近開いたファイルの表示
- ブラウザの音声合成を使った読み上げ

## 使い方

1. ブラウザで Markdown ファイルを開きます．
2. 自動でプレビューが表示されます．
3. 右下のツールバーから表示切り替え，コピー，印刷，読み上げ，エクスポート，設定を操作します．
4. 設定パネルで表示幅，テーマ，フォントなどを調整します．

詳しくは [使い方](docs/usage.md) と [キーボードショートカット](docs/shortcuts.md) を参照してください．

## インストール

### Chrome Web Store

準備中です．

### 手動インストール

必要なものは Node.js 18 以上と npm です．

```bash
git clone https://github.com/yhotta240/markdown-file-viewer-extension
cd markdown-file-viewer-extension
npm install
npm run build
```

ブラウザの拡張機能ページ（`chrome://extensions/`）を開き，デベロッパーモードを有効にして，`dist/` を読み込んでください．

## プライバシー

Markdown の解析と表示はブラウザ内で行います．拡張機能がファイル本文，設定，閲覧履歴を外部サーバーへ送信することはありません．詳しくは [プライバシーポリシー](docs/privacy.md) を参照してください．

## ライセンス

MIT License

## 作者

yhotta240
