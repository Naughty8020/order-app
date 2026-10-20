import { Martini, Star, Wine } from "lucide-react";
import { useState } from "react";
import type { Cart, Menu } from "../../../cart";
import { isCocktailDrink, isMocktailDrink } from "../../../utils/drinkVisuals";
import { MenuCard } from "./MenuCard";
import { MocktailOptionsModal } from "./MocktailOptionsModal";

interface Props {
	loading: boolean;
	menus: Menu[];
	cart: Cart;
	addToCart: (menu: Menu, option?: string) => void;
	updateCartQty: (itemKey: string | number, delta: number) => void;
}
const categories = [
	{ id: "soft", label: "ソフトドリンク", icon: Martini },
	{ id: "cocktail", label: "ノンアルカクテル", icon: Wine },
	{ id: "recommended", label: "おすすめ", icon: Star },
] as const;
export function MenuGrid({
	loading,
	menus,
	cart,
	addToCart,
	updateCartQty,
}: Props) {
	const [category, setCategory] = useState<string>("soft");
	const [optionMenu, setOptionMenu] = useState<Menu | null>(null);
	const visibleMenus = menus.filter(
		(menu) =>
			(category === "soft" && !isCocktailDrink(menu.name)) ||
			(category === "cocktail" && isCocktailDrink(menu.name)) ||
			(category === "recommended" && menu.is_recommended),
	);
	return (
		<>
			{optionMenu && (
				<MocktailOptionsModal
					menu={optionMenu}
					onClose={() => setOptionMenu(null)}
					onAdd={addToCart}
				/>
			)}
			<nav className="club-categories" aria-label="ドリンクのカテゴリ">
				{categories.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						type="button"
						aria-pressed={category === id}
						onClick={() => setCategory(id)}
					>
						<Icon size={22} aria-hidden="true" />
						<span>{label}</span>
					</button>
				))}
			</nav>
			{loading && menus.length === 0 ? (
				<section className="club-menu-grid" aria-label="メニューを読み込み中">
					{[1, 2, 3, 4].map((n) => (
						<div key={n} className="club-card club-skeleton" />
					))}
				</section>
			) : visibleMenus.length === 0 ? (
				<p className="club-empty">このカテゴリのドリンクはまだありません。</p>
			) : (
				<div className="club-menu-grid">
					{visibleMenus.map((menu) => (
						<MenuCard
							key={menu.id}
							menu={menu}
							inCart={
								isMocktailDrink(menu.name) ? undefined : cart[String(menu.id)]
							}
							addToCart={(selectedMenu) =>
								isMocktailDrink(selectedMenu.name)
									? setOptionMenu(selectedMenu)
									: addToCart(selectedMenu)
							}
							updateCartQty={updateCartQty}
						/>
					))}
				</div>
			)}
		</>
	);
}
