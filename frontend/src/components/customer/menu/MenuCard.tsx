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
			className={`relative bg-gradient-to-br from-[rgba(255,255,255,0.045)] to-[rgba(255,255,255,0.015)] border rounded-[16px] p-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:p-6 md:flex md:flex-col md:items-stretch md:gap-0 md:justify-between transition-colors duration-200 group
														${
															menu.is_available
																? isFeatured
																	? "border-[rgba(236,72,153,0.55)] shadow-[0_0_24px_rgba(236,72,153,0.12)]"
																	: "border-[rgba(255,255,255,0.08)] hover:border-[rgba(236,72,153,0.4)]"
																: "border-white/5 opacity-50"
														}`}
		>
			<div className="min-w-0">
				<div className="flex items-center gap-2 md:block">
					<div
						className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center text-[18px] md:w-10 md:h-10 md:mb-4 ${iconBg}`}
					>
						{emoji}
					</div>

					{/* Name */}
					<h3 className="min-w-0 text-sm leading-5 font-semibold text-white md:text-[17px] md:mb-1">
						{menu.name.split(" (")[0]}
					</h3>
				</div>
				{englishName && (
					<p className="hidden md:block text-xs text-[#71717a] mb-[14px]">
						{englishName}
					</p>
				)}

				{/* Price */}
				<p className="mt-1 text-base font-bold text-[#f472b6] md:mt-0 md:text-[20px] md:mb-[18px]">
					¥{menu.price.toLocaleString()}
				</p>
			</div>

			{/* Add / Quantity */}
			{!menu.is_available ? (
				<span className="text-[13px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/60 px-3 py-3 rounded-[10px] text-center w-full block">
					SOLD OUT
				</span>
			) : inCart ? (
				<div className="flex items-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-[10px] md:p-1.5 md:w-full justify-between">
					<button
						type="button"
						onClick={() => updateCartQty(menu.id, -1)}
						aria-label={`${menu.name}を1点減らす`}
						className="flex h-11 w-11 items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
					>
						<Minus size={14} />
					</button>
					<span className="px-1 text-[13px] font-bold text-white min-w-[20px] text-center">
						{inCart.quantity}
					</span>
					<button
						type="button"
						onClick={() => updateCartQty(menu.id, 1)}
						aria-label={`${menu.name}を1点増やす`}
						className="flex h-11 w-11 items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
					>
						<Plus size={14} />
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => addToCart(menu)}
					aria-label="＋ カートに追加"
					className="min-h-11 px-3 md:w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-[#e4e4e7] text-[13px] font-semibold py-3 rounded-[10px] transition hover:bg-gradient-to-br hover:from-[#ec4899] hover:to-[#db2777] hover:text-white hover:border-transparent hover:shadow-[0_4px_16px_rgba(236,72,153,0.35)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
				>
					<span aria-hidden="true">＋</span>
					<span className="sr-only md:not-sr-only">カートに</span>追加
				</button>
			)}
		</div>
	);
}
