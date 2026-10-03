import { BellRing, Clock, RotateCw } from "lucide-react";
import { getOrderItemsCount, getOrderTotal } from "./presentation";
import type { useCustomerOrder } from "./useCustomerOrder";

type CustomerOrder = ReturnType<typeof useCustomerOrder>;

export function OrderTracking({
	orders,
	fetchData,
}: Pick<CustomerOrder, "orders" | "fetchData">) {
	return (
		<>
			{/* Customer Order Tracking */}
			<section className="mt-8 bg-[rgba(20,20,30,0.6)] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 backdrop-blur-sm">
				<div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 mb-6">
					<div>
						<h2 className="text-[16px] font-bold text-white flex items-center gap-2">
							<Clock size={16} className="text-[#f472b6]" />
							Live 注文ステータス
						</h2>
						<p className="text-[11px] text-zinc-500 mt-1">
							モニターで番号が「お呼び出し中
							(Ready)」になりましたらお受け取りください。
						</p>
					</div>
					<button
						type="button"
						onClick={fetchData}
						className="text-[13px] text-zinc-400 hover:text-white flex items-center gap-1.5 transition border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] px-3 py-2 rounded-[10px] cursor-pointer"
					>
						<RotateCw size={13} />
						更新
					</button>
				</div>
				{orders.length === 0 ? (
					<div className="py-8 text-center text-zinc-500 text-xs">
						注文した履歴はありません。
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
						{orders
							.filter((o) => o.status !== "completed")
							.slice()
							.reverse()
							.map((order) => {
								const total = getOrderTotal(order);
								const count = getOrderItemsCount(order);
								return (
									<div
										key={order.id}
										className={`bg-[rgba(255,255,255,0.045)] border rounded-[16px] p-5 flex flex-col justify-between transition-all
															${
																order.status === "ready"
																	? "border-[rgba(236,72,153,0.55)] shadow-[0_0_24px_rgba(236,72,153,0.12)]"
																	: "border-[rgba(255,255,255,0.08)]"
															}`}
									>
										<div className="flex justify-between items-center border-b border-white/8 pb-3 mb-3">
											<span
												className={`text-lg font-black tracking-wider px-3.5 py-1 rounded-[10px]
																${
																	order.status === "ready"
																		? "text-white bg-pink-500/20 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
																		: "text-pink-400 bg-pink-950/20 border border-pink-500/20"
																}`}
											>
												#{order.id}
											</span>
											<div className="flex items-center gap-1 text-[11px] text-zinc-500">
												<Clock size={12} />
												<span>
													{new Date(
														order.created_at || Date.now(),
													).toLocaleTimeString()}
												</span>
											</div>
										</div>
										<div className="space-y-2 max-h-36 overflow-y-auto pr-1 mb-3 custom-scrollbar">
											{order.order_items?.map((item) => (
												<div
													key={item.id}
													className="flex justify-between items-center text-xs"
												>
													<span className="text-white font-semibold truncate max-w-[160px]">
														{item.menu.name}
													</span>
													<span className="text-zinc-400 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded text-[11px]">
														x {item.quantity}
													</span>
												</div>
											))}
										</div>
										<div className="flex justify-between text-[13px] font-bold text-zinc-400 mb-3 border-t border-white/8 pt-3">
											<span>{count}点</span>
											<span className="text-white">
												¥{total.toLocaleString()}
											</span>
										</div>
										<div className="flex justify-between items-center">
											<p className="text-[11px] text-zinc-500">
												{order.status === "ready"
													? "カウンターでお受け取りください！"
													: "準備中です..."}
											</p>
											{order.status === "pending" ? (
												<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-950/50 border border-amber-600/30 text-amber-400 animate-pulse">
													準備中
												</span>
											) : (
												<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-[rgba(236,72,153,0.2)] border border-[rgba(236,72,153,0.5)] text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-bounce">
													<BellRing size={12} className="animate-spin" />
													お呼び出し中
												</span>
											)}
										</div>
									</div>
								);
							})}
					</div>
				)}
			</section>
		</>
	);
}
