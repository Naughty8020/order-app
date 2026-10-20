import { expect, test } from "@playwright/test";

// No API mocking: browser -> frontend -> Go API -> disposable MySQL.
test("スタッフと顧客が注文から提供完了まで進められる", async ({
	page: staff,
	browser,
}) => {
	await staff.goto("/login");
	await staff.getByLabel("ユーザーネーム", { exact: true }).fill("e2e-admin");
	await staff.getByLabel("パスワード", { exact: true }).fill("e2e-password");
	await staff.getByRole("button", { name: "ログイン", exact: true }).click();
	await expect(staff).toHaveURL(/\/staff$/);
	await expect(staff.getByAltText("注文ページを開くQRコード")).toBeVisible();
	const qrLink = staff.locator('a[href*="order_token="]');
	await expect(qrLink).toBeVisible();
	const url = await qrLink.getAttribute("href");
	if (!url) throw new Error("QR link is missing");

	const context = await browser.newContext({
		viewport: { width: 1440, height: 1000 },
	});
	try {
		const customer = await context.newPage();
		await customer.goto(url);
		await expect(customer).not.toHaveURL(/order_token=/);
		await customer
			.getByRole("button", { name: "E2Eお茶をカートに追加", exact: true })
			.click();
		// トレイ側の増加ボタンで数量を2にする。
		await customer
			.locator(".club-tray-item")
			.getByRole("button", { name: "E2Eお茶を1点増やす", exact: true })
			.click();
		const orderResponse = customer.waitForResponse(
			(response) =>
				response.url().endsWith("/api/orders") &&
				response.request().method() === "POST",
		);
		await customer.getByRole("button", { name: "注文を確定する" }).click();
		const response = await orderResponse;
		expect(response.status()).toBe(201);
		const order = await response.json();
		expect(order.order_items).toEqual([
			expect.objectContaining({ quantity: 2, price: 200 }),
		]);
		await expect(
			customer.getByRole("heading", { name: "ご注文ありがとうございます！" }),
		).toBeVisible();
		await expect(
			customer.getByText(`#${order.id}`, { exact: true }).first(),
		).toBeVisible();
		await customer.getByRole("button", { name: "確認して閉じる" }).click();
		await expect(
			customer.getByText("トレイは空です", { exact: true }),
		).toBeVisible();

		const tracking = customer.locator("section").filter({
			has: customer.getByRole("heading", { name: "Live 注文ステータス" }),
		});
		const trackedOrder = tracking.getByText(new RegExp(`#${order.id}$`));
		await expect(trackedOrder).toBeVisible();

		// スタッフ側のポーリングで実際に保存された注文が届く。
		await expect(
			staff.getByText(`#${order.id}`, { exact: true }),
		).toBeVisible();
		await staff.getByRole("button", { name: /準備完了.*呼び出し/ }).click();
		await expect(
			staff.getByRole("button", { name: /お渡し完了/ }),
		).toBeVisible();
		await expect(
			customer.getByText("お呼び出し中", { exact: true }).first(),
		).toBeVisible();
		await staff.getByRole("button", { name: /お渡し完了/ }).click();
		await expect(
			staff.getByText("処理待ちの注文はありません", { exact: true }),
		).toBeVisible();
		await expect(trackedOrder).toHaveCount(0);
		// 再読み込み後も提供完了履歴が残る（ブラウザ内の状態だけではない）。
		await staff.reload();
		await expect(
			staff.getByText(`#${order.id}`, { exact: true }),
		).toBeVisible();
		await expect(
			staff.getByText("処理待ちの注文はありません", { exact: true }),
		).toBeVisible();
	} finally {
		await context.close();
	}
});

for (const scenario of [
	{ name: "QRなし", path: "/" },
	{ name: "無効なQR", path: "/?order_token=invalid" },
]) {
	test(`${scenario.name}では注文できない`, async ({ page }) => {
		await page.goto(scenario.path);
		await expect(
			page.getByText("店頭の注文用QRコードを読み取ってください"),
		).toBeVisible();
		await page
			.getByRole("button", { name: "E2Eお茶をカートに追加", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "注文を確定する" }),
		).toBeDisabled();
	});
}

test("未ログインのスタッフ画面はログインへ戻り、不正なパスワードを拒否する", async ({
	page,
}) => {
	await page.goto("/staff");
	await expect(page).toHaveURL(/\/login$/);
	await page.getByLabel("ユーザーネーム", { exact: true }).fill("e2e-admin");
	await page.getByLabel("パスワード", { exact: true }).fill("wrong-password");
	await page.getByRole("button", { name: "ログイン", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText(
		"ユーザーネームまたはパスワードが違います",
	);
	await expect(page).toHaveURL(/\/login$/);
});
