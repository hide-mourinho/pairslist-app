import { test, expect, Page } from '@playwright/test';

// テスト用のユーザー情報
const USER_A = {
  email: 'test-owner@example.com',
  password: 'TestPassword123!',
};

const USER_B = {
  email: 'test-member@example.com', 
  password: 'TestPassword123!',
};

// ヘルパー関数
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
}

test.describe('招待リンク機能', () => {
  test.beforeEach(async ({ page }) => {
    // テスト環境のURLを設定
    await page.goto('http://localhost:5173');
  });

  test('オーナーが招待リンクを生成し、別ユーザーが参加できる', async ({ browser }) => {
    // ユーザーAのブラウザコンテキスト
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    // ユーザーBのブラウザコンテキスト
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    
    // Step 1: ユーザーAでログインしてリストを作成
    await login(pageA, USER_A.email, USER_A.password);
    const listName = `Test List ${Date.now()}`;
    await createList(pageA, listName);
    
    // リスト詳細ページに移動
    await pageA.click(`text="${listName}"`);
    await pageA.waitForSelector('text=買い物リスト');
    
    // Step 2: 共有ボタンをクリックして招待リンクを生成
    await pageA.click('button:has-text("共有")');
    await pageA.waitForSelector('text=リストを共有');
    await pageA.click('button:has-text("招待リンクを作成")');
    
    // 招待リンクが表示されるまで待つ
    await pageA.waitForSelector('text=招待リンク:');
    
    // 招待URLを取得
    const inviteUrlElement = await pageA.locator('.font-mono').first();
    const inviteUrl = await inviteUrlElement.textContent();
    expect(inviteUrl).toContain('/accept-invite?token=');
    
    // Step 3: ユーザーBでログイン
    await login(pageB, USER_B.email, USER_B.password);
    
    // Step 4: ユーザーBが招待リンクにアクセス
    await pageB.goto(inviteUrl!);
    
    // 招待が受け入れられるまで待つ
    await pageB.waitForSelector('text=リストに参加しました！', { timeout: 10000 });
    
    // リストページにリダイレクトされることを確認
    await pageB.waitForURL(/\/lists\/.*/, { timeout: 5000 });
    
    // Step 5: ユーザーBがリストにアイテムを追加できることを確認
    const itemTitle = `Test Item ${Date.now()}`;
    await pageB.fill('input[placeholder="アイテムを追加..."]', itemTitle);
    await pageB.click('button:has-text("追加")');
    
    // アイテムが追加されたことを確認
    await pageB.waitForSelector(`text="${itemTitle}"`);
    
    // Step 6: ユーザーAの画面でもアイテムが見えることを確認
    await pageA.reload();
    await pageA.waitForSelector(`text="${itemTitle}"`);
    
    // クリーンアップ
    await contextA.close();
    await contextB.close();
  });

  test('期限切れの招待リンクはエラーになる', async ({ page }) => {
    // 存在しない/期限切れのトークンでアクセス
    await page.goto('/accept-invite?token=expired-token-12345');
    
    // エラーメッセージが表示されることを確認
    await page.waitForSelector('text=招待リンクの有効期限が切れています', { timeout: 10000 });
  });

  test('未ログインユーザーはログインページにリダイレクトされる', async ({ page }) => {
    // 未ログイン状態で招待リンクにアクセス
    const token = 'test-token-12345';
    await page.goto(`/accept-invite?token=${token}`);
    
    // ログインページにリダイレクトされることを確認
    await page.waitForURL(/\/login\?returnUrl=.*accept-invite.*token=${token}/);
    
    // returnUrlパラメータが含まれていることを確認
    const url = new URL(page.url());
    expect(url.searchParams.get('returnUrl')).toContain(`/accept-invite?token=${token}`);
  });

  test('非オーナーは共有ボタンが表示されない', async ({ page }) => {
    // エディター権限のユーザーでログイン
    await login(page, USER_B.email, USER_B.password);
    
    // 既存のリストにアクセス（事前に作成されている前提）
    await page.click('text=Test List');
    await page.waitForSelector('text=買い物リスト');
    
    // 共有ボタンが表示されないことを確認
    await expect(page.locator('button:has-text("共有")')).not.toBeVisible();
  });
});

test.describe('メンバーシップガード', () => {
  test('メンバーでないユーザーはリストにアクセスできない', async ({ page }) => {
    // ログイン
    await login(page, USER_B.email, USER_B.password);
    
    // 存在するが参加していないリストのIDでアクセス
    await page.goto('/lists/unauthorized-list-id');
    
    // アクセス権限がないメッセージが表示されることを確認
    await page.waitForSelector('text=アクセス権限がありません');
    await page.waitForSelector('text=このリストを表示する権限がありません');
    
    // リスト一覧に戻るリンクが表示されることを確認
    await expect(page.locator('a:has-text("リスト一覧に戻る")')).toBeVisible();
  });
});