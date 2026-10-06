import { GlassWater, Martini, Star, Wine } from "lucide-react";
import { useState } from "react";
import type { Cart, Menu } from "../../../cart";
import { isCocktailDrink } from "../../../utils/drinkVisuals";
import { MenuCard } from "./MenuCard";

interface Props {
	loading: boolean;
	menus: Menu[];
	cart: Cart;
	addToCart: (menu: Menu) => void;
	updateCartQty: (menuId: number, delta: number) => void;
}
const categories = [
	{ id: "all", label: "すべて", icon: GlassWater },
	{ id: "soft", label: "ソフトドリンク", icon: Martini },
	{ id: "cocktail", label: "カクテル", icon: Wine },
	{ id: "recommended", label: "おすすめ", icon: Star },
] as const;
export function MenuGrid({
	loading,
	menus,
	cart,
	addToCart,
	updateCartQty,
}: Props) {
	const [category, setCategory] = useState<string>("all");
	const visibleMenus = menus.filter(
		(menu) =>
			category === "all" ||
			(category === "soft" && !isCocktailDrink(menu.name)) ||
			(category === "cocktail" && isCocktailDrink(menu.name)) ||
			(category === "recommended" && menu.is_recommended),
	);
	return (
		<>
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
							inCart={cart[menu.id]}
							addToCart={addToCart}
							updateCartQty={updateCartQty}
						/>
					))}
				</div>
			)}
		</>
	);
}
