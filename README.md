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

### 3. Firebase プロジェクトの設定
```bash
# Firebase CLI をインストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクト ID を設定
firebase use --add
```

### 4. Firebase のデプロイ
```bash
# Functions、Firestore、Hosting をデプロイ
firebase deploy
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
- PWA対応
- オフライン対応 (基本機能)

## 技術スタック

- React + TypeScript + Vite
- Firebase (Auth, Firestore, Functions)
- Tailwind CSS
- React Router
- Vite PWA Plugin
