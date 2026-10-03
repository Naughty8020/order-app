import type { Menu } from "../cart";
import { getApiBase } from "./base";

export async function getMenus(): Promise<Menu[]> {
	const response = await fetch(`${getApiBase()}/menus`);
	if (!response.ok) throw new Error("メニューの取得に失敗しました");
	const data: { data?: Menu[] } = await response.json();
	return data.data || [];
}
