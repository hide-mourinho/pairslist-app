# GitHub MCP セットアップガイド

GitHubのMCPサーバーをClaude Desktopで使用するためのセットアップ手順です。

## 1. GitHubトークンの作成

1. [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) にアクセス
2. "Generate new token (classic)" をクリック
3. 必要な権限を選択:
   - `repo` (フルアクセス)
   - `workflow` (GitHub Actions)
   - `read:org` (組織情報の読み取り)
   - `gist` (Gistの作成・読み取り)
4. トークンを生成してコピー

## 2. 環境設定

### WSL/Linux環境の場合

1. `.env.mcp` ファイルを編集:
   ```bash
   # GitHub MCP Server
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. 設定ファイルを確認:
   ```bash
   cat mcp-config.json
   ```

## 3. Claude Desktop設定

### Windows環境の場合

1. Claude Desktopの設定ファイルを開く:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. 以下の設定を追加:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
         }
       },
       "filesystem": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-filesystem",
           "/home/mohri/work"
         ]
       }
     }
   }
   ```

3. Claude Desktopを再起動

## 4. 利用可能な機能

GitHub MCPサーバーで以下の操作が可能になります:

### リポジトリ操作
- リポジトリの作成・削除
- ファイルの読み取り・作成・更新
- ブランチの作成・切り替え
- コミット履歴の確認

### Issue・PR管理
- Issueの作成・読み取り・更新
- Pull Requestの作成・レビュー
- コメントの追加

### 検索機能
- コード検索
- Issue・PR検索
- ユーザー検索

### 自動化機能
- 自動ブランチ作成
- バッチ操作対応
- エラーハンドリング

## 5. 使用例

Claude Desktopで以下のようなコマンドが使用できます:

```
# リポジトリの作成
Create a new repository named "my-project"

# Issue の作成
Create an issue titled "Bug: Login fails"

# ファイルの読み取り
Show me the contents of README.md in the main branch

# PR のレビュー
Review pull request #123 and provide feedback

# コード検索
Search for function implementations containing "authentication"
```

## 6. トラブルシューティング

### 認証エラー
- トークンの権限を確認
- トークンの有効期限を確認
- 組織のSSO設定を確認

### 接続エラー
- インターネット接続を確認
- ファイアウォール設定を確認
- プロキシ設定を確認

## 7. セキュリティ注意事項

- トークンは絶対にコミットしない
- 最小権限の原則に従う
- 定期的にトークンを更新
- 不要になったトークンは削除

## 8. 参考リンク

- [MCP公式ドキュメント](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://www.npmjs.com/package/@modelcontextprotocol/server-github)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)