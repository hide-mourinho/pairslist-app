# MCP (Model Context Protocol) サーバー設定ガイド

MCPサーバーを使用することで、Claude DesktopからGitHub、Firebase、Playwrightなどの外部サービスと連携できます。

## 前提条件

- Node.js 18以上がインストールされていること
- Claude Desktop アプリケーションがインストールされていること

## 1. GitHub MCP サーバー

GitHub APIと連携してリポジトリの操作、Issue/PRの管理などができます。

### セットアップ手順

1. **GitHub Personal Access Token の作成**
   - [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) にアクセス
   - "Generate new token (classic)" をクリック
   - 必要な権限を選択:
     - `repo` (フルアクセス)
     - `workflow` (GitHub Actions)
     - `read:org` (組織情報の読み取り)
   - トークンを生成してコピー

2. **環境変数の設定**
   ```bash
   export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxxxxx"
   ```

3. **テスト実行**
   ```bash
   npx @modelcontextprotocol/server-github
   ```

## 2. Firebase MCP サーバー

Firebase/Firestoreのデータ操作、認証管理、Cloud Functionsのデプロイなどができます。

### セットアップ手順

1. **サービスアカウントキーの作成**
   - [Firebase Console](https://console.firebase.google.com) にアクセス
   - プロジェクト設定 > サービスアカウント
   - 「新しい秘密鍵の生成」をクリック
   - JSONファイルをダウンロード

2. **環境変数の設定**
   ```bash
   export FIREBASE_PROJECT_ID="your-project-id"
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. **Firebase Admin SDK のインストール**
   ```bash
   npm install -g firebase-admin
   ```

4. **テスト実行**
   ```bash
   npx @modelcontextprotocol/server-firebase
   ```

## 3. Playwright MCP サーバー

ブラウザの自動化、E2Eテストの実行、Webスクレイピングなどができます。

### セットアップ手順

1. **Playwright のインストール**
   ```bash
   # Playwrightとブラウザをインストール
   npx playwright install
   ```

2. **テスト実行**
   ```bash
   npx @modelcontextprotocol/server-playwright
   ```

## 4. Claude Desktop での設定

### Windows/Mac の場合

1. Claude Desktop の設定ファイルを開く
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. 以下の設定を追加:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxx"
      }
    },
    "firebase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-firebase"],
      "env": {
        "FIREBASE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

3. Claude Desktop を再起動

### WSL/Linux の場合

WSL環境では、Windows側のClaude DesktopからWSL内のMCPサーバーに接続する必要があります。

1. **WSL側でMCPサーバーを起動**
   ```bash
   # 各サーバーを個別のターミナルで起動
   npx @modelcontextprotocol/server-github
   npx @modelcontextprotocol/server-firebase
   npx @modelcontextprotocol/server-playwright
   ```

2. **Windows側のClaude Desktop設定**
   - `%APPDATA%\Claude\claude_desktop_config.json` を編集
   - WSLのIPアドレスを使用して接続設定

## 5. 利用可能なコマンド例

### GitHub
- リポジトリの作成: `Create a new repository named "my-project"`
- Issue の作成: `Create an issue titled "Bug: Login fails"`
- PR のレビュー: `Review pull request #123`

### Firebase
- Firestore データの読み取り: `Get all documents from users collection`
- 認証ユーザーのリスト: `List all authenticated users`
- Functions のデプロイ: `Deploy cloud functions`

### Playwright
- ページのスクリーンショット: `Take screenshot of https://example.com`
- E2Eテストの実行: `Run E2E tests for login flow`
- フォームの自動入力: `Fill and submit the contact form`

## トラブルシューティング

### 共通の問題

1. **MCPサーバーが起動しない**
   - Node.js のバージョンを確認 (18以上が必要)
   - `npm cache clean --force` でキャッシュをクリア
   - `npx` の代わりに直接インストール: `npm install -g @modelcontextprotocol/server-xxx`

2. **認証エラー**
   - トークンやキーの権限を確認
   - 環境変数が正しく設定されているか確認
   - サービスアカウントの権限を確認

3. **接続エラー**
   - ファイアウォール設定を確認
   - プロキシ設定を確認
   - ネットワーク接続を確認

## セキュリティの注意事項

- トークンやキーは絶対にコミットしない
- `.env` ファイルを使用して環境変数を管理
- 最小権限の原則に従い、必要な権限のみを付与
- 定期的にトークンをローテーション

## 参考リンク

- [MCP公式ドキュメント](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [Firebase MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/firebase)
- [Playwright MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/playwright)