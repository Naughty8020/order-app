import { Crown, Flame, GlassWater, Minus, Plus } from "lucide-react";
import type { CartItem, Menu } from "../../../cart";
import { getDrinkVisual } from "../../../utils/drinkVisuals";
export function MenuCard({
	menu,
	inCart,
	addToCart,
	updateCartQty,
}: {
	menu: Menu;
	inCart: CartItem | undefined;
	addToCart: (menu: Menu) => void;
	updateCartQty: (id: number, delta: number) => void;
}) {
	const visual = getDrinkVisual(menu.name);
	const isFeatured = !!menu.is_featured;
	const recommended = !!menu.is_recommended;
	return (
		<article
			className={`club-card ${isFeatured ? "club-card-featured" : ""} ${!menu.is_available ? "club-card-unavailable" : ""}`}
		>
			{visual.image ? (
				<img
					className="club-drink-photo"
					src={`/images/drinks/${visual.image}.png`}
					alt=""
					loading="lazy"
				/>
			) : (
				<div className="club-drink-placeholder">
					<GlassWater size={64} />
				</div>
			)}
			<div className="club-card-badges">
				{isFeatured && (
					<span className="club-card-badge">
						<Flame size={16} /> イチオシ
					</span>
				)}
				{recommended && (
					<span className="club-card-badge club-card-recommended">
						<Crown size={16} /> おすすめ
					</span>
				)}
			</div>
			<div className="club-card-content">
				<h3>{menu.name.split(" (")[0]}</h3>
				<p className="club-drink-description">{visual.description}</p>
				<div className="club-card-bottom">
					<p className="club-price">¥{menu.price.toLocaleString()}</p>
					{!menu.is_available ? (
						<span className="club-sold-out">SOLD OUT</span>
					) : inCart ? (
						<div className="club-quantity">
							<button
								type="button"
								onClick={() => updateCartQty(menu.id, -1)}
								aria-label={`${menu.name}を1点減らす`}
							>
								<Minus size={16} />
							</button>
							<span>{inCart.quantity}</span>
							<button
								type="button"
								onClick={() => updateCartQty(menu.id, 1)}
								aria-label={`${menu.name}を1点増やす`}
							>
								<Plus size={16} />
							</button>
						</div>
					) : (
						<button
							className="club-add"
							type="button"
							onClick={() => addToCart(menu)}
							aria-label="＋ カートに追加"
						>
							<Plus size={18} aria-hidden="true" />
							追加
						</button>
					)}
				</div>
			</div>
		</article>
	);
}
