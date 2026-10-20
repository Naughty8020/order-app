import { useState } from "react";
import {
	deleteMenu,
	updateMenuAvailability,
	updateMenuPromotion,
} from "../../api/menu";
import type { Menu } from "../../cart";
import type { ShowToast } from "../useToast";
export function useMenuManagement(
	refreshMenus: () => Promise<void>,
	showToast: ShowToast,
) {
	// Staff: Toggle Availability
	const handleToggleAvailable = async (menu: Menu) => {
		try {
			await updateMenuAvailability(menu.id, !menu.is_available);
			showToast(
				`${menu.name} を ${!menu.is_available ? "販売中" : "売り切れ"} に変更しました`,
			);

			// Refresh menus
			await refreshMenus();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	const [updatingPromotion, setUpdatingPromotion] = useState<number | null>(
		null,
	);
	const handleTogglePromotion = async (
		menu: Menu,
		field: "is_recommended" | "is_featured",
	) => {
		if (updatingPromotion !== null) return;
		setUpdatingPromotion(menu.id);
		try {
			await updateMenuPromotion(menu.id, field, !menu[field]);
			await refreshMenus();
			showToast(
				`${menu.name} の${field === "is_recommended" ? "おすすめ" : "イチオシ"}を${menu[field] ? "解除" : "設定"}しました`,
			);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		} finally {
			setUpdatingPromotion(null);
		}
	};
	// Staff: Delete Menu
	const handleDeleteMenu = async (menuId: number) => {
		if (!window.confirm("このメニューを削除してよろしいですか？")) return;
		try {
			await deleteMenu(menuId);
			showToast("メニューを削除しました", "info");

			// Refresh menus
			await refreshMenus();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	return {
		handleToggleAvailable,
		handleDeleteMenu,
		handleTogglePromotion,
		updatingPromotion,
	};
}
