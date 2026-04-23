# PairsList

夫婦・カップル・家族で使う、シンプルな共有買い物リストアプリです。

> **Personal project** — 個人開発プロジェクトです。

---

## スクリーンショット

<!-- TODO: スクリーンショットを docs/screenshots/ に追加 -->

---

## 概要

PairsList は、パートナーとリアルタイムでショッピングリストを共有できる PWA/ネイティブアプリです。

**こんな人向け:**
- 買い物リストをパートナーとスムーズに共有したい
- 「あれ買ってきて」のやり取りをなくしたい
- iOS / Android / ブラウザ、どこからでも使いたい

---

## 主な機能

- **リアルタイム同期** — Firestore によりパートナーの操作が即座に反映
- **招待リンク共有** — ワンタイムトークンで簡単にメンバーを招待
- **Web Push 通知** — アイテム追加・更新時にプッシュ通知
- **オフライン対応** — ネットワーク断でもアプリが動作、復旧時に自動同期
- **PWA + ネイティブアプリ** — Capacitor で iOS / Android にも対応
- **Proプラン** — RevenueCat でサブスクリプション管理（リスト数・メンバー数の上限解放）
- **アカウント削除** — GDPR/CCPA 準拠の完全データ削除（7日間猶予期間あり）

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | React 19, TypeScript, Vite, Tailwind CSS v4 |
| モバイル | Capacitor 7 (iOS / Android) |
| バックエンド | Firebase (Auth / Firestore / Cloud Functions / FCM) |
| 課金 | RevenueCat |
| 状態管理 | Zustand |
| ルーティング | React Router v7 |
| 監視 | Sentry, Google Analytics 4 |
| テスト | Playwright (E2E) |

---

## セットアップ

### 前提条件

- Node.js 18 以上
- Firebase プロジェクト（Auth / Firestore / Functions / Hosting 有効化済み）
- Firebase CLI: `npm install -g firebase-tools`

### 1. リポジトリのクローンと依存関係インストール

```bash
git clone <repository-url>
cd pairslist
npm install
cd functions && npm install && cd ..
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開き、Firebase Console から取得した値を設定します（「プロジェクト設定 > 全般 > アプリ」から確認できます）：

| 変数名 | 説明 |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API キー |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth ドメイン |
| `VITE_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage バケット |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM 送信者 ID |
| `VITE_FIREBASE_APP_ID` | Firebase アプリ ID |
| `VITE_FIREBASE_VAPID_KEY` | Web Push 証明書キー（Cloud Messaging から取得） |
| `VITE_PUBLIC_APP_URL` | アプリの公開 URL（ローカルは `http://localhost:5173`） |
| `VITE_SENTRY_DSN` | Sentry DSN（省略可） |
| `VITE_GA_MEASUREMENT_ID` | GA4 計測 ID（省略可） |

### 3. Firebase プロジェクトの紐づけ

```bash
firebase login
firebase use --add   # プロジェクト ID を選択
```

### 4. 開発サーバーの起動

```bash
# フロントエンド
npm run dev

# 別ターミナルで Functions エミュレーター
cd functions && npm run serve
```

> DEV 環境では Functions エミュレーター（localhost:5001）に自動接続します。

---

## 利用規約・プライバシーポリシー

`public/privacy.html` / `public/terms.html` に静的ページが含まれています。
公開前に `{{OPERATOR_NAME}}` と `{{CONTACT_EMAIL}}` を実際の情報に置換してください。

---

## ビルドとデプロイ

```bash
# プロダクションビルド
npm run build

# Firebase へデプロイ（Functions + Firestore ルール + Hosting）
firebase deploy --only functions,firestore:rules,hosting
```

### ネイティブアプリ（Capacitor）

```bash
npm run cap:sync     # ビルド後にネイティブプロジェクトへ同期
npm run cap:android  # Android Studio を開く
npm run cap:ios      # Xcode を開く（macOS のみ）
```

---

## ディレクトリ構成

```
src/
  app/
    components/   # 共通UIコンポーネント
    hooks/        # カスタムフック (useAuth, useLists, ...)
    pages/        # 画面 (ListsPage, ListDetailPage, SettingsPage, ...)
    routes/       # ルーティング定義
    types/        # 共通型定義
  lib/            # 外部サービス初期化 (Firebase, Sentry, ...)
functions/
  src/            # Cloud Functions ソースコード
public/           # 静的ファイル (PWA assets, privacy.html, terms.html)
```

---

## ロードマップ

- [ ] iOS / Android アプリストア公開
- [ ] LP（ランディングページ）作成
- [ ] 多言語対応（英語）
- [ ] ウィジェット対応（iOS / Android）
- [ ] カテゴリ・タグ機能
- [ ] リスト間アイテム移動

---

## ライセンス

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。
