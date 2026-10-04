import { Minus, Plus } from "lucide-react";
import type { CartItem, Menu } from "../../../cart";
import {
	getDrinkEmoji,
	getDrinkEnglish,
	getDrinkIconBg,
} from "../../../utils/customerPresentation";
export function MenuCard({
	menu,
	inCart,
	isFeatured,
	addToCart,
	updateCartQty,
}: {
	menu: Menu;
	inCart: CartItem | undefined;
	isFeatured: boolean;
	addToCart: (menu: Menu) => void;
	updateCartQty: (id: number, delta: number) => void;
}) {
	const emoji = getDrinkEmoji(menu.name);
	const englishName = getDrinkEnglish(menu.name);
	const iconBg = getDrinkIconBg(menu.name);

	return (
		<div
			key={menu.id}
			className={`relative bg-gradient-to-br from-[rgba(255,255,255,0.045)] to-[rgba(255,255,255,0.015)] border rounded-[16px] p-6 flex flex-col justify-between transition-colors duration-200 group
														${
															menu.is_available
																? isFeatured
																	? "border-[rgba(236,72,153,0.55)] shadow-[0_0_24px_rgba(236,72,153,0.12)]"
																	: "border-[rgba(255,255,255,0.08)] hover:border-[rgba(236,72,153,0.4)]"
																: "border-white/5 opacity-50"
														}`}
		>
			{/* Emoji Icon */}
			<div
				className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] mb-4 ${iconBg}`}
			>
				{emoji}
			</div>

			{/* Name */}
			<h3 className="text-[17px] font-semibold text-white mb-1">
				{menu.name.split(" (")[0]}
			</h3>
			{englishName && (
				<p className="text-xs text-[#71717a] mb-[14px]">{englishName}</p>
			)}

			{/* Price */}
			<p className="text-[20px] font-bold text-[#f472b6] mb-[18px]">
				¥{menu.price.toLocaleString()}
			</p>

			{/* Add / Quantity */}
			{!menu.is_available ? (
				<span className="text-[13px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/60 px-3 py-3 rounded-[10px] text-center w-full block">
					SOLD OUT
				</span>
			) : inCart ? (
				<div className="flex items-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-[10px] p-1.5 w-full justify-between">
					<button
						type="button"
						onClick={() => updateCartQty(menu.id, -1)}
						className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
					>
						<Minus size={14} />
					</button>
					<span className="px-3 text-[13px] font-bold text-white min-w-[20px] text-center">
						{inCart.quantity}
					</span>
					<button
						type="button"
						onClick={() => updateCartQty(menu.id, 1)}
						className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
					>
						<Plus size={14} />
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => addToCart(menu)}
					className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-[#e4e4e7] text-[13px] font-semibold py-3 rounded-[10px] transition hover:bg-gradient-to-br hover:from-[#ec4899] hover:to-[#db2777] hover:text-white hover:border-transparent hover:shadow-[0_4px_16px_rgba(236,72,153,0.35)] flex items-center justify-center gap-2 cursor-pointer"
				>
					＋ カートに追加
				</button>
			)}
		</div>
	);
}
