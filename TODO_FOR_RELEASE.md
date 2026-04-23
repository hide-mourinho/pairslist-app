# リリースに向けた TODO

このファイルは GitHub 公開・アプリストア公開に向けた未対応項目の一覧です。

## 🔴 GitHub 公開前に必須

- [ ] **GitHub PAT を今すぐ無効化・再発行**
  - 旧トークンは git 履歴に含まれているため無効化が必須
  - https://github.com/settings/tokens で削除すること

- [ ] **git 履歴のクリーニング（公開前に強く推奨）**
  - `.env` と `mcp-config.json` が過去のコミットに含まれているため
  - 推奨手順:
    ```bash
    # git-filter-repo をインストール（未インストールの場合）
    pip install git-filter-repo

    # 対象ファイルを履歴から除去
    git filter-repo --path .env --invert-paths
    git filter-repo --path mcp-config.json --invert-paths
    git filter-repo --path GITHUB_MCP_SETUP.md --invert-paths
    git filter-repo --path MCP_SETUP.md --invert-paths

    # リモートを再設定して force push
    git remote add origin https://github.com/hide-mourinho/pairslist-app.git
    git push --force-with-lease origin master
    ```
  - または既存リポジトリを削除して clean な状態で push し直す方法でも可

- [ ] **Firebase API キーの確認**
  - Firebase Web API キーは公開前提の設計だが、Firestore Security Rules が適切に設定されているか確認
  - `firestore.rules` を見直す

- [ ] **`public/privacy.html` の `{{OPERATOR_NAME}}` `{{CONTACT_EMAIL}}` を置換**
  - ストア公開前には必須（GitHub 公開時点では placeholder のままでも可）

---

## 🟡 アプリストア公開前（iOS / Android）

### 必須対応

- [ ] **アプリアイコン**
  - iOS: 1024×1024 の AppIcon
  - Android: アダプティブアイコン（foreground / background）
  - 現在 `public/logo.png` `public/icon-512.png` はあるが要確認

- [ ] **スクリーンショット**
  - iOS: 6.7インチ, 6.5インチ, iPad用
  - Android: スマートフォン用（最低1枚）
  - `docs/screenshots/` に格納推奨

- [ ] **RevenueCat 本番設定**
  - App Store Connect / Google Play Console でサブスクリプション商品を作成
  - RevenueCat ダッシュボードで product ID を設定
  - Webhook URL を Firebase Functions に向ける

- [ ] **Firebase Security Rules の本番レビュー**
  - `firestore.rules` を再確認（開発用ルールが残っていないか）
  - `firebase deploy --only firestore:rules` でデプロイ

- [ ] **Firebase App Check の有効化**
  - 不正アクセス・API 濫用防止

- [ ] **Google SSO（OAuth）の本番設定**
  - iOS: Bundle ID を Firebase Console に登録 + App Store Connect に `GoogleService-Info.plist` 設定
  - Android: SHA-1 フィンガープリントを Firebase Console に登録

- [ ] **FCM (Push Notification) の本番確認**
  - iOS: APNs 証明書または APNs 認証キーを Firebase Console に登録
  - Android: FCM は Firebase 自動設定で通常は追加作業不要

### 強く推奨

- [ ] **LP（ランディングページ）の作成**
  - アプリの紹介ページ（最低限、Firebase Hosting 上の静的ページでも可）

- [ ] **問い合わせ先の確認**
  - App Store / Google Play に表示するサポートメール・URL

- [ ] **クラッシュ・エラー監視の確認**
  - Sentry DSN を本番環境変数に設定
  - `VITE_SENTRY_DSN` に本番 DSN を設定してデプロイ

- [ ] **Analytics の確認**
  - `VITE_GA_MEASUREMENT_ID` に本番の GA4 計測 ID を設定

- [ ] **利用規約・プライバシーポリシーの最終確認**
  - `{{OPERATOR_NAME}}` / `{{CONTACT_EMAIL}}` を置換
  - 弁護士レビューが望ましい（個人開発なら省略可）

---

## 🟢 ストア審査提出前チェックリスト

- [ ] アプリ内に「テスト」「デバッグ」「開発用」文言が残っていないか
- [ ] ローカルホスト・エミュレーター URL がハードコードされていないか
- [ ] 本番 Firebase プロジェクトに接続していることを確認
- [ ] `npm run build` がエラーなく完了するか
- [ ] E2E テスト（`npm run test:e2e`）がパスするか
- [ ] iOS Simulator / Android Emulator で動作確認
- [ ] 実機（iPhone / Android 端末）で動作確認
- [ ] ダークモード対応の確認
- [ ] アクセシビリティの基本確認（フォントサイズ変更時の崩れ等）

---

## 📝 ドキュメント整備

- [ ] `docs/screenshots/` ディレクトリに実機スクリーンショットを追加
- [ ] README の「スクリーンショット」セクションに画像を追加
- [ ] CHANGELOG.md の作成（バージョン管理）
