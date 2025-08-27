import { test, expect, Page } from '@playwright/test';

// テスト用のユーザー情報
const generateUserEmail = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`;

// ヘルパー関数
async function signUp(page: Page, email: string, password: string, displayName: string) {
  await page.goto('/signup');
  await page.fill('input[name="displayName"]', displayName);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/lists');
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/lists');
}

async function createList(page: Page, name: string) {
  await page.click('text=新しいリストを作成');
  await page.fill('input[placeholder="リスト名"]', name);
  await page.click('button:has-text("作成")');
  await page.waitForSelector(`text="${name}"`);
  return name;
}

async function addItem(page: Page, title: string, qty: string = '1', note?: string) {
  await page.fill('input[placeholder="アイテムを追加..."]', title);
  await page.fill('input[placeholder="数量"]', qty);
  if (note) {
    await page.fill('input[placeholder="メモ（任意）"]', note);
  }
  await page.click('button:has-text("追加")');
  await page.waitForSelector(`text="${title}"`);
}

test.describe('完全なユーザーフロー', () => {
  test.beforeEach(async ({ page }) => {
    // テスト環境のURLを設定
    await page.goto('http://localhost:5173');
  });

  test('サインアップ→リスト作成→アイテム追加→招待→受け入れ→リアルタイム同期', async ({ browser }) => {
    const userAEmail = generateUserEmail();
    const userBEmail = generateUserEmail();
    const password = 'TestPassword123!';
    
    // ユーザーAのブラウザコンテキスト
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    // ユーザーBのブラウザコンテキスト
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    
    // Step 1: ユーザーAでサインアップ
    await signUp(pageA, userAEmail, password, 'User A');
    
    // Step 2: リスト作成
    const listName = `Family Shopping ${Date.now()}`;
    await createList(pageA, listName);
    
    // リスト詳細ページに移動
    await pageA.click(`text="${listName}"`);
    await pageA.waitForSelector('text=買い物リスト');
    
    // Step 3: アイテム追加
    const item1 = `牛乳 ${Date.now()}`;
    await addItem(pageA, item1, '2', 'オーガニック');
    
    // Step 4: 招待リンク生成
    await pageA.click('button:has-text("共有")');
    await pageA.waitForSelector('text=リストを共有');
    await pageA.click('button:has-text("招待リンクを作成")');
    
    // 招待URLを取得
    await pageA.waitForSelector('text=招待リンク:');
    const inviteUrlElement = await pageA.locator('.font-mono').first();
    const inviteUrl = await inviteUrlElement.textContent();
    expect(inviteUrl).toContain('/accept-invite?token=');
    
    // ダイアログを閉じる
    await pageA.click('button:has-text("閉じる")');
    
    // Step 5: ユーザーBでサインアップ
    await signUp(pageB, userBEmail, password, 'User B');
    
    // Step 6: ユーザーBが招待を受け入れ
    await pageB.goto(inviteUrl!);
    await pageB.waitForSelector('text=リストに参加しました！', { timeout: 10000 });
    await pageB.waitForURL(/\/lists\/.*/, { timeout: 5000 });
    
    // Step 7: ユーザーBがアイテムを追加（リアルタイム同期のテスト）
    const item2 = `パン ${Date.now()}`;
    await addItem(pageB, item2, '1', 'フランスパン');
    
    // Step 8: ユーザーAの画面でリアルタイム同期を確認
    // リロードなしで新しいアイテムが表示されるはず
    await pageA.waitForSelector(`text="${item2}"`, { timeout: 10000 });
    
    // Step 9: ユーザーAがアイテムをチェック
    const item1Checkbox = pageA.locator(`text="${item1}"`).locator('..').locator('button').first();
    await item1Checkbox.click();
    
    // チェック済みセクションに移動することを確認
    await pageA.waitForSelector('text=購入済み');
    await expect(pageA.locator('text=購入済み').locator('..').locator(`text="${item1}"`)).toBeVisible();
    
    // Step 10: ユーザーBの画面でもチェック状態が同期されることを確認
    await pageB.waitForSelector('text=購入済み', { timeout: 10000 });
    await expect(pageB.locator('text=購入済み').locator('..').locator(`text="${item1}"`)).toBeVisible();
    
    // Step 11: 更新者情報の表示を確認
    // ユーザーAがチェックしたので、ユーザーBの画面に「User Aが...に更新」が表示されるはず
    await expect(pageB.locator('text=User Aが').locator('text=更新')).toBeVisible();
    
    // Step 12: メンバー管理機能のテスト
    await pageA.click('button:has-text("メンバー")');
    await pageA.waitForSelector('text=メンバー管理');
    
    // メンバーリストにユーザーBが表示されることを確認
    await expect(pageA.locator('text=User B')).toBeVisible();
    await expect(pageA.locator('text=editor')).toBeVisible();
    
    // メンバー管理画面を閉じる
    await pageA.click('button:has-text("閉じる")');
    
    // Step 13: オフライン耐性テスト（楽観的UI）
    // ネットワークを無効にして操作し、すぐに反映されることを確認
    await pageA.context().setOffline(true);
    
    const offlineItem = `オフラインアイテム ${Date.now()}`;
    await addItem(pageA, offlineItem, '1');
    
    // 楽観的UIでアイテムが表示されることを確認
    await expect(pageA.locator(`text="${offlineItem}"`)).toBeVisible();
    
    // ネットワークを復旧
    await pageA.context().setOffline(false);
    
    // 少し待ってからユーザーBの画面で同期されることを確認
    await pageB.waitForSelector(`text="${offlineItem}"`, { timeout: 15000 });
    
    // クリーンアップ
    await contextA.close();
    await contextB.close();
  });

  test('メンバー権限管理フロー', async ({ browser }) => {
    const userAEmail = generateUserEmail();
    const userBEmail = generateUserEmail();
    const password = 'TestPassword123!';
    
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    
    // セットアップ：ユーザーAでリスト作成、ユーザーBを招待
    await signUp(pageA, userAEmail, password, 'Owner User');
    const listName = `Permission Test ${Date.now()}`;
    await createList(pageA, listName);
    
    await pageA.click(`text="${listName}"`);
    await pageA.click('button:has-text("共有")');
    await pageA.click('button:has-text("招待リンクを作成")');
    
    const inviteUrlElement = await pageA.locator('.font-mono').first();
    const inviteUrl = await inviteUrlElement.textContent();
    await pageA.click('button:has-text("閉じる")');
    
    await signUp(pageB, userBEmail, password, 'Member User');
    await pageB.goto(inviteUrl!);
    await pageB.waitForURL(/\/lists\/.*/);
    
    // Step 1: エディター権限では共有ボタンが表示されない
    await expect(pageB.locator('button:has-text("共有")')).not.toBeVisible();
    
    // Step 2: オーナーがメンバーをオーナーに昇格
    await pageA.click('button:has-text("メンバー")');
    await pageA.waitForSelector('text=Member User');
    
    // 権限変更ボタンをクリック
    const memberRow = pageA.locator('text=Member User').locator('..');
    await memberRow.locator('text=editor').click();
    await pageA.click('text=owner');
    
    // 確認ダイアログが表示される
    await pageA.waitForSelector('text=権限を変更しますか？');
    await pageA.click('button:has-text("変更する")');
    
    await pageA.waitForSelector('text=権限を更新しました');
    await pageA.click('button:has-text("閉じる")');
    
    // Step 3: 昇格されたユーザーBで共有ボタンが表示される
    await pageB.reload();
    await expect(pageB.locator('button:has-text("共有")')).toBeVisible();
    
    await contextA.close();
    await contextB.close();
  });

  test('エラーハンドリングと回復性', async ({ page }) => {
    const email = generateUserEmail();
    const password = 'TestPassword123!';
    
    // サインアップ
    await signUp(page, email, password, 'Test User');
    
    // リスト作成
    const listName = `Error Test ${Date.now()}`;
    await createList(page, listName);
    await page.click(`text="${listName}"`);
    
    // 無効な招待リンクのテスト
    await page.goto('/accept-invite?token=invalid-token-12345');
    await page.waitForSelector('text=招待リンクが見つからないか、有効期限が切れています');
    
    // バック操作
    await page.goBack();
    
    // 存在しないリストのテスト
    await page.goto('/lists/nonexistent-list-id');
    await page.waitForSelector('text=アクセス権限がありません');
    
    // リスト一覧に戻る
    await page.click('a:has-text("リスト一覧に戻る")');
    await page.waitForURL('/lists');
  });
});