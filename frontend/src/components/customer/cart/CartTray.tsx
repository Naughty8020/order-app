import type { Cart } from "../../../cart";
import type { OrderAccessStatus } from "../../../hooks/customer/useOrderSession";

interface Props {
	cart: Cart;
	isCartOpen: boolean;
	setIsCartOpen: (open: boolean) => void;
	updateCartQty: (menuId: number, delta: number) => void;
	removeFromCart: (menuId: number) => void;
	submitOrder: () => Promise<void>;
	loading: boolean;
	orderAccessStatus: OrderAccessStatus;
}

import {
	ArrowRight,
	Minus,
	Plus,
	RotateCw,
	ShoppingCart,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { getCartSummary } from "../../../cart";

export function CartTray({
	cart,
	isCartOpen,
	setIsCartOpen,
	updateCartQty,
	removeFromCart,
	submitOrder,
	loading,
	orderAccessStatus,
}: Props) {
	const { total: cartTotal, count: cartCount } = getCartSummary(cart);
	return (
		<>
			{/* Cart Tray Section */}
			<div className="contents lg:block lg:relative lg:p-0 lg:z-auto">
				{/* Mobile cart bar */}
				<button
					type="button"
					onClick={() => setIsCartOpen(true)}
					aria-label={`カートを見る（${cartCount}点、合計¥${cartTotal.toLocaleString()}）`}
					aria-expanded={isCartOpen}
					className="lg:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-4 right-4 z-40 flex min-h-[64px] items-center gap-3 rounded-full border-2 border-[#ff76d7] bg-[linear-gradient(105deg,#7616aa_0%,#a918a5_35%,#ff288b_65%,#ff9369_100%)] py-1.5 pl-2 pr-4 text-white shadow-[0_0_24px_rgba(236,72,153,0.4),inset_0_1px_2px_rgba(255,255,255,0.35)] transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff76d7] cursor-pointer sm:left-6 sm:right-6 sm:gap-4 sm:pr-6"
				>
					<span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#420c70]/60">
						<ShoppingCart size={27} strokeWidth={1.8} aria-hidden="true" />
						{cartCount > 0 && (
							<span className="absolute -right-1 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff1686] px-1 text-[11px] font-bold shadow-[0_0_10px_rgba(255,22,134,0.6)]">
								{cartCount}
							</span>
						)}
					</span>
					<span className="flex-1 whitespace-nowrap text-left text-[15px] font-extrabold tracking-wide sm:text-lg">
						カートを見る
					</span>
					<span className="flex min-h-8 shrink-0 items-center gap-2 border-l border-white/30 pl-3 sm:gap-4 sm:pl-6">
						<span className="whitespace-nowrap text-lg font-extrabold tabular-nums sm:text-xl">
							¥{cartTotal.toLocaleString()}
						</span>
						<ArrowRight size={22} strokeWidth={1.8} aria-hidden="true" />
					</span>
				</button>

				{/* Mobile Overlay */}
				{isCartOpen && (
					<button
						type="button"
						aria-label="カートを閉じる"
						className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity w-full h-full border-none cursor-pointer"
						onClick={() => setIsCartOpen(false)}
					/>
				)}

				{/* Tray Panel */}
				<div
					className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-300 ease-out 
								lg:static lg:p-0 lg:z-auto lg:transform-none lg:transition-none lg:translate-y-0 lg:visible
								${isCartOpen ? "translate-y-0" : "translate-y-full"} 
								${cartCount === 0 && !isCartOpen ? "invisible lg:visible" : "visible lg:visible"}`}
				>
					<div className="bg-[rgba(20,20,30,0.95)] lg:bg-[rgba(20,20,30,0.6)] border border-[rgba(255,255,255,0.08)] rounded-[24px] lg:rounded-[18px] p-6 pb-8 lg:pb-6 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.4)] lg:shadow-none lg:sticky lg:top-6 flex flex-col h-fit max-h-[85vh] lg:max-h-none pointer-events-auto">
						{/* Mobile Close Handle */}
						<button
							type="button"
							aria-label="カートを閉じる"
							className="lg:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 cursor-pointer block border-none"
							onClick={() => setIsCartOpen(false)}
						/>

						{/* Tray Header */}
						<div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)] mb-5 flex-shrink-0">
							<h2 className="text-[16px] font-bold text-white flex items-center gap-2">
								🛍 注文トレイ
							</h2>
							<div className="flex items-center gap-3">
								<span className="text-[#f472b6] font-semibold text-[16px]">
									({cartCount})
								</span>
								<button
									type="button"
									onClick={() => setIsCartOpen(false)}
									className="lg:hidden p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-full cursor-pointer transition-colors"
								>
									<X size={18} />
								</button>
							</div>
						</div>

						{cartCount === 0 ? (
							<div className="flex flex-col items-center text-center py-10 px-3">
								<div className="w-16 h-16 rounded-full border border-dashed border-[rgba(236,72,153,0.4)] flex items-center justify-center mb-5 text-[#f472b6] text-2xl animate-[pulse_2.4s_ease-in-out_infinite]">
									◎
								</div>
								<p className="text-[15px] font-semibold text-white mb-2">
									トレイは空です
								</p>
								<p className="text-[13px] text-[#a1a1aa] leading-[1.6]">
									レコードメニューからドリンクを選んでカートに入れてください。
								</p>
							</div>
						) : (
							<div className="flex flex-col flex-grow overflow-hidden">
								<div className="space-y-3 overflow-y-auto pr-1 flex-grow mb-5 custom-scrollbar">
									{Object.values(cart).map((item) => (
										<div
											key={item.menu.id}
											className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-3 flex justify-between items-center"
										>
											<div className="max-w-[130px]">
												<p className="text-[13px] font-semibold text-white truncate mb-0.5">
													{item.menu.name}
												</p>
												<p className="text-[12px] text-[#a1a1aa]">
													¥{item.menu.price.toLocaleString()}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<div className="flex items-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] p-0.5">
													<button
														type="button"
														onClick={() => updateCartQty(item.menu.id, -1)}
														className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white cursor-pointer"
													>
														<Minus size={12} />
													</button>
													<span className="px-2 text-[13px] font-bold text-white min-w-[20px] text-center">
														{item.quantity}
													</span>
													<button
														type="button"
														onClick={() => updateCartQty(item.menu.id, 1)}
														className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white cursor-pointer"
													>
														<Plus size={12} />
													</button>
												</div>
												<button
													type="button"
													onClick={() => removeFromCart(item.menu.id)}
													className="p-2 hover:bg-[rgba(255,255,255,0.05)] text-zinc-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
												>
													<Trash2 size={14} />
												</button>
											</div>
										</div>
									))}
								</div>
								<div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0 text-[14px] text-[#a1a1aa]">
									<span>合計</span>
									<span className="text-[20px] font-bold text-white">
										¥{cartTotal.toLocaleString()}
									</span>
								</div>
								<button
									type="button"
									onClick={() => {
										setIsCartOpen(false);
										void submitOrder();
									}}
									disabled={loading || orderAccessStatus !== "valid"}
									className="w-full mt-5 bg-gradient-to-br from-[#ec4899] to-[#db2777] hover:opacity-90 text-white font-extrabold py-3.5 rounded-[12px] shadow-[0_4px_20px_rgba(236,72,153,0.35)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[14px] cursor-pointer"
								>
									{loading ? (
										<>
											<RotateCw size={16} className="animate-spin" />{" "}
											注文送信中...
										</>
									) : (
										<>
											<Sparkles size={16} /> 注文を確定する
										</>
									)}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
