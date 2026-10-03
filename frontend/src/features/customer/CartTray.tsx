import {
	Minus,
	Plus,
	RotateCw,
	ShoppingCart,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { getCartSummary } from "../../cart";
import type { useCustomerOrder } from "./useCustomerOrder";

type CustomerOrder = ReturnType<typeof useCustomerOrder>;

export function CartTray({
	cart,
	isCartOpen,
	setIsCartOpen,
	updateCartQty,
	removeFromCart,
	submitOrder,
	loading,
	orderAccessStatus,
}: Pick<
	CustomerOrder,
	| "cart"
	| "isCartOpen"
	| "setIsCartOpen"
	| "updateCartQty"
	| "removeFromCart"
	| "submitOrder"
	| "loading"
	| "orderAccessStatus"
>) {
	const { total: cartTotal, count: cartCount } = getCartSummary(cart);
	return (
		<>
			{/* Cart Tray Section */}
			<div className="lg:relative lg:p-0 lg:z-auto">
				{/* Mobile FAB */}
				<button
					type="button"
					onClick={() => setIsCartOpen(true)}
					className={`lg:hidden fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-br from-[#ec4899] to-[#db2777] rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(236,72,153,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer`}
				>
					<ShoppingCart size={26} />
					{cartCount > 0 && (
						<span className="absolute -top-1 -right-1 bg-white text-[#db2777] text-[13px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-bounce">
							{cartCount}
						</span>
					)}
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
