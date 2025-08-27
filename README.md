# PairsList

夫婦や家族で使う共有買い物リスト PWA

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
cd functions && npm install
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env` を作成し、Firebase の設定を追加：

```bash
cp .env.example .env
```

Firebase Console で以下の値を取得して `.env` に設定：
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_PUBLIC_APP_URL` (本番環境のURL、例: `https://your-project.web.app`)

### 3. Firebase プロジェクトの設定
```bash
# Firebase CLI をインストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクト ID を設定
firebase use --add
```

### 4. Firebase Functions の環境変数設定
```bash
# 本番環境のURLを設定
firebase functions:config:set app.url="https://your-project.web.app"
```

### 5. Firebase のデプロイ
```bash
# ビルド
npm run build

# Functions、Firestore ルール、Hosting をデプロイ
firebase deploy --only functions,firestore:rules,hosting
```

## 開発

### フロントエンド開発サーバー
```bash
npm run dev
```

### Firebase Functions エミュレーター
```bash
cd functions
npm run serve
```

### リンターとフォーマッター
```bash
# ESLint チェック
npm run lint

# Prettier フォーマット
npm run format

# TypeScript チェック
npm run typecheck
```

## ビルド

```bash
# プロダクションビルド
npm run build

# プレビュー
npm run preview
```

## 主な機能

- Firebase Authentication (メール/パスワード + Google)
- リアルタイム同期 (Firestore)
- 招待リンクによる共有
  - オーナーが招待リンクを生成
  - 7日間有効な1回限りのトークン
  - リンク経由またはコード入力でメンバーが参加
- メンバー管理
  - 権限管理（オーナー/編集者）
  - メンバーの追加・削除
  - オーナー権限の譲渡
- Web Push 通知
  - アイテム追加・更新・チェック変更時の通知
  - リアルタイム通知機能
- PWA対応
- オフライン対応 (基本機能)
- Capacitor によるネイティブアプリ対応（iOS/Android）

## 共有招待リンク機能の使い方

### 招待リンクの作成
1. リストの詳細画面を開く
2. 「共有」ボタンをクリック
3. 招待リンクが生成され、自動的にクリップボードにコピーされる
4. 招待コードも表示される（手入力用）

### 招待の受け入れ
**方法1: 招待リンクから**
1. 招待リンクをクリックまたは `/accept-invite?token=XXX` にアクセス
2. 未ログインの場合はログインページにリダイレクト
3. ログイン後、自動的に招待が処理される
4. 成功するとリストページにリダイレクト

**方法2: コード入力から**
1. `/accept-invite` にアクセス
2. 招待コードを入力
3. 「リストに参加」ボタンをクリック
4. 成功するとリストページにリダイレクト

## 動作確認手順

1. **ローカル環境での確認**
   ```bash
   # フロントエンド開発サーバー起動
   npm run dev
   
   # 別ターミナルで Functions エミュレーター起動
   cd functions
   npm run serve
   ```

2. **招待リンク機能のテスト**
   - アカウントAでログインし、リストを作成
   - 「共有」ボタンから招待リンクを生成
   - 別ブラウザでアカウントBとしてログイン
   - 招待リンクまたはコード入力でリストに参加
   - 両アカウントでリストの編集が可能なことを確認

3. **メンバー管理機能のテスト**
   - 「メンバー」ボタンからメンバー管理画面を開く
   - オーナーとして以下の操作をテスト：
     - メンバーの権限変更（editor ⇄ owner）
     - メンバーの削除
     - 招待リンクの無効化
   - 一般メンバーとして「リストを退出」をテスト

4. **プッシュ通知のテスト**
   - 通知アイコンから通知を有効化
   - 別ブラウザ/デバイスでアイテムを追加・更新
   - プッシュ通知が届くことを確認
   - フォアグラウンド/バックグラウンド両方でテスト

## 技術スタック

- React + TypeScript + Vite
- Firebase (Auth, Firestore, Functions v2, Cloud Messaging)
- Tailwind CSS v4
- React Router
- Vite PWA Plugin
- Firebase Cloud Messaging (FCM) for Web Push

## メンバー管理ガイド

### 権限の種類
- **オーナー**: すべての操作が可能（メンバー管理、招待リンク作成、リスト削除など）
- **編集者**: リストアイテムの追加・編集・削除のみ可能

### オーナーの操作
1. **権限変更**: メンバーをオーナー/編集者に変更
2. **オーナー譲渡**: 他のメンバーをオーナーにして自分は編集者になる
3. **メンバー削除**: メンバーをリストから削除
4. **招待無効化**: 発行済みの招待リンクを無効にする

### 注意事項
- 最低1名のオーナーが必要（最後のオーナーは変更・削除・退出不可）
- オーナー権限の譲渡は慎重に行ってください
- 招待リンクを無効化すると、そのリンクでの新規参加ができなくなります

## ネイティブアプリ開発

### Capacitor セットアップ
```bash
# プラットフォーム追加済み
# Android/iOS の開発環境セットアップが必要

# ビルド & 同期
npm run cap:sync

# Android Studio を開く
npm run cap:android

# Xcode を開く (macOS のみ)
npm run cap:ios
```

### Google SSO設定（ネイティブ）
`.env` に以下を追加：
```
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Firebase Console で OAuth 2.0 クライアント ID を設定：
- Android: SHA-1 フィンガープリントを登録
- iOS: Bundle ID を登録

## Web Push 通知設定

### Firebase Console での設定
1. Firebase Console → プロジェクト設定 → Cloud Messaging
2. 「ウェブプッシュ証明書」で証明書を生成
3. VAPIDキーをコピーして `.env` に設定：
```
VITE_FIREBASE_VAPID_KEY=your-vapid-key-here
```

### 通知の有効化
1. リスト一覧画面の通知アイコンをクリック
2. 「通知を有効にする」ボタンで許可
3. デバイストークンがFirestoreに保存される

### 通知内容
- アイテムの追加・更新
- アイテムのチェック状態変更
- 変更者以外のメンバーに自動送信

## オフライン・同時編集対応

### オフライン機能
- **IndexedDB 永続化**: ネットワーク接続がない場合でもアプリが動作
- **楽観的UI**: 操作の即座反映とエラー時のロールバック
- **自動同期**: ネットワーク復旧時の自動データ同期

### 同時編集対応
- **リアルタイム同期**: 複数ユーザーによる同時編集をリアルタイムで反映
- **競合解決**: Last Write Wins 戦略による競合の自動解決
- **更新者情報**: 各アイテムの最終更新者と時刻を表示（例：「田中さんが 13:04 に更新」）
- **トランザクション**: データ整合性を保つ原子的操作

### 技術実装
- Firestore IndexedDB 永続化
- サーバータイムスタンプによる競合解決
- 楽観的UI + ロールバック機能
- 複合インデックスによるクエリ最適化

## テスト・監視・計測

### E2Eテスト（Playwright）
```bash
# E2Eテストの実行
npm run test:e2e

# UIモードでE2Eテスト
npm run test:e2e:ui
```

#### テストシナリオ
- **完全ユーザーフロー**: サインアップ→リスト作成→アイテム追加→招待→受け入れ→リアルタイム同期
- **招待リンク機能**: リンク生成、受け入れ、期限切れ、権限確認
- **メンバー権限管理**: 権限変更、メンバー削除、リスト退出
- **エラーハンドリング**: 無効リンク、存在しないリスト、権限エラー
- **オフライン耐性**: 楽観的UI、ネットワーク復旧時の同期

#### CI/CD
- GitHub Actions でのE2E自動実行
- Firebase Emulator環境での統合テスト
- プルリクエスト時の自動テスト実行

### エラー監視（Sentry）
```bash
# 環境変数設定
VITE_SENTRY_DSN=your-sentry-dsn
VITE_APP_VERSION=git-sha-or-version
```

#### 監視対象
- **フロントエンド**: ブラウザエラー、パフォーマンス問題
- **ユーザーコンテキスト**: Firebase Auth UID の紐づけ
- **リリース追跡**: Git SHA による版数管理
- **エラー分類**: ChunkLoadError などのノイズフィルタリング

#### Cloud Functions ログ
- 構造化ログ出力（JSON形式）
- エラー発生時のコンテキスト情報
- スタックトレースの記録
- Google Cloud Logging での監視

### アナリティクス（GA4）
```bash
# 環境変数設定
VITE_GA_MEASUREMENT_ID=your-measurement-id
```

#### 計測イベント
**リスト操作**
- `list_create`: リスト作成
- `list_delete`: リスト削除

**アイテム操作**
- `item_add`: アイテム追加
- `item_check`: チェック状態変更
- `item_update`: アイテム更新
- `item_delete`: アイテム削除

**招待・メンバー管理**
- `invite_create`: 招待リンク作成
- `invite_accept`: 招待受け入れ
- `invite_revoke`: 招待無効化
- `member_role_change`: メンバー権限変更
- `member_remove`: メンバー削除
- `member_leave`: リスト退出

**認証**
- `sign_up`: サインアップ（方法別）
- `login`: ログイン（方法別）
- `logout`: ログアウト

**プッシュ通知**
- `notification_enable`: 通知有効化
- `notification_disable`: 通知無効化

#### プライバシー配慮
- ユーザーIDはFirebase Auth UIDを使用
- 個人情報（メール等）は送信しない
- IPアドレス匿名化
- 広告用シグナル無効化

## テスト

```bash
# E2Eテストの実行
npm run test:e2e

# UIモードでE2Eテスト
npm run test:e2e:ui
```
