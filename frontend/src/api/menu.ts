import type { Menu } from "../cart";
import { authenticatedFetch } from "./auth";
import { getApiBase } from "./base";

export async function getMenus(): Promise<Menu[]> {
	const response = await authenticatedFetch(`${getApiBase()}/menus`);
	if (!response.ok) throw new Error("メニューの取得に失敗しました");
	const data: { data?: Menu[] } = await response.json();
	return data.data || [];
}

export async function createMenu(menu: Omit<Menu, "id">): Promise<void> {
	const response = await authenticatedFetch(
		`${getApiBase()}/menus`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(menu),
		},
		true,
	);
	if (!response.ok) throw new Error("メニューの作成に失敗しました");
}

export async function updateMenuAvailability(
	id: number,
	isAvailable: boolean,
): Promise<void> {
	const response = await authenticatedFetch(
		`${getApiBase()}/menus/${id}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ is_available: isAvailable }),
		},
		true,
	);
	if (!response.ok) throw new Error("更新に失敗しました");
}

export async function deleteMenu(id: number): Promise<void> {
	const response = await authenticatedFetch(
		`${getApiBase()}/menus/${id}`,
		{
			method: "DELETE",
		},
		true,
	);
	if (!response.ok) throw new Error("削除に失敗しました");
}

export async function updateMenuPromotion(
	id: number,
	field: "is_recommended" | "is_featured",
	enabled: boolean,
): Promise<void> {
	const response = await authenticatedFetch(
		`${getApiBase()}/menus/${id}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ [field]: enabled }),
		},
		true,
	);
	if (!response.ok) throw new Error("おすすめ表示の更新に失敗しました");
}
