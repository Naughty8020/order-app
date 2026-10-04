import { BellRing, Check, CheckCircle2, Volume2 } from "lucide-react";
import type { Order, StaffOrderStatus } from "../../api/order";
import {
	getOrderItemsCount,
	getOrderTotal,
} from "../../utils/customerPresentation";
export function StaffOrders({
	orders,
	handleUpdateStatus,
}: {
	orders: Order[];
	handleUpdateStatus: (id: number, status: StaffOrderStatus) => Promise<void>;
}) {
	return (
		<div className="lg:col-span-2 space-y-6">
			<div className="bg-[#14141e]/40 border border-white/8 rounded-[16px] p-6 backdrop-blur-sm">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
					<div>
						<h2 className="text-lg font-bold text-white flex items-center gap-2">
							<Volume2 size={18} className="text-emerald-400" />
							受注・進行モニター
						</h2>
						<p className="text-xs text-zinc-400 mt-0.5">
							「準備完了(呼び出し)」 ➡️ 「お渡し完了」の2ステップで処理
						</p>
					</div>
					<div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
						<span className="inline-flex items-center justify-center whitespace-nowrap text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 px-3 py-1 rounded-full shrink-0">
							準備中: {orders.filter((o) => o.status === "pending").length}件
						</span>
						<span className="inline-flex items-center justify-center whitespace-nowrap text-xs font-bold bg-pink-950 text-pink-400 border border-pink-800 px-3 py-1 rounded-full shrink-0">
							呼び出し: {orders.filter((o) => o.status === "ready").length}件
						</span>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{orders.filter((o) => o.status === "pending" || o.status === "ready")
						.length === 0 ? (
						<div className="md:col-span-2 py-16 text-center text-zinc-500 text-sm flex flex-col items-center justify-center bg-[rgba(255,255,255,0.03)] rounded-[16px] border border-[rgba(255,255,255,0.05)]">
							<Check size={32} className="text-emerald-500/40 mb-3" />
							<p className="font-bold text-zinc-400">
								処理待ちの注文はありません
							</p>
						</div>
					) : (
						orders
							.filter((o) => o.status === "pending" || o.status === "ready")
							.map((order) => {
								const total = getOrderTotal(order);
								const isReady = order.status === "ready";
								return (
									<div
										key={order.id}
										className={`bg-[rgba(255,255,255,0.04)] border rounded-[16px] p-5 flex flex-col justify-between transition relative overflow-hidden ${isReady ? "border-[rgba(236,72,153,0.4)] shadow-[0_0_20px_rgba(236,72,153,0.1)]" : "border-[rgba(255,255,255,0.08)]"}`}
									>
										<div className="flex justify-between items-start mb-3 border-b border-[rgba(255,255,255,0.08)] pb-3">
											<div className="flex items-center gap-2">
												<span
													className={`text-3xl font-black tracking-wider ${isReady ? "text-[#f472b6]" : "text-amber-400"}`}
												>
													#{order.id}
												</span>
												<span
													className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded border ${isReady ? "bg-pink-950/40 border-pink-500/30 text-[#f472b6]" : "bg-amber-950/40 border-amber-500/20 text-amber-400"}`}
												>
													{isReady ? "呼び出し中" : "準備中"}
												</span>
											</div>
											<span className="text-[11px] text-zinc-500 mt-2.5">
												{new Date(
													order.created_at || Date.now(),
												).toLocaleTimeString()}
											</span>
										</div>
										<div className="space-y-2 mb-5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
											{order.order_items?.map((item) => (
												<div
													key={item.id}
													className="bg-[rgba(255,255,255,0.04)] p-2.5 rounded-[12px] border border-[rgba(255,255,255,0.06)] flex justify-between items-center text-xs"
												>
													<span className="text-white font-semibold truncate max-w-[140px]">
														{item.menu.name}
													</span>
													<span className="text-zinc-300 font-bold bg-white/5 border border-white/8 px-2 py-1 rounded text-[11px]">
														x {item.quantity}
													</span>
												</div>
											))}
										</div>
										<div className="bg-[rgba(255,255,255,0.04)] p-3 rounded-[12px] border border-[rgba(255,255,255,0.06)] flex justify-between text-[13px] text-zinc-400 mb-5">
											<span>合計</span>
											<span className="text-white font-bold">
												¥{total.toLocaleString()}
											</span>
										</div>
										{!isReady ? (
											<button
												type="button"
												onClick={() => handleUpdateStatus(order.id, "ready")}
												className="w-full bg-gradient-to-r from-amber-500 to-[#ec4899] hover:opacity-90 text-white font-extrabold text-[13px] py-3.5 rounded-[12px] shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
											>
												<BellRing size={16} className="animate-bounce" />
												準備完了 ➡️ 呼び出し(Ready)
											</button>
										) : (
											<button
												type="button"
												onClick={() =>
													handleUpdateStatus(order.id, "completed")
												}
												className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[13px] py-3.5 rounded-[12px] shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition flex items-center justify-center gap-2 cursor-pointer"
											>
												<CheckCircle2 size={16} />
												お渡し完了 (Served)
											</button>
										)}
									</div>
								);
							})
					)}
				</div>
			</div>
			{/* Completed History */}
			<div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 backdrop-blur-sm">
				<h2 className="text-sm font-bold text-zinc-400 mb-4">
					最近の提供完了履歴
				</h2>
				<div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-2">
					{orders.filter((o) => o.status === "completed").length === 0 ? (
						<p className="text-xs text-zinc-600 text-center py-4">
							履歴はありません
						</p>
					) : (
						orders
							.filter((o) => o.status === "completed")
							.slice()
							.reverse()
							.map((order) => {
								const total = getOrderTotal(order);
								const count = getOrderItemsCount(order);
								return (
									<div
										key={order.id}
										className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-3 flex justify-between items-center text-xs"
									>
										<div>
											<span className="text-emerald-500 font-bold mr-2">
												#{order.id}
											</span>
											<span className="text-zinc-400">
												{order.order_items
													?.map((item) => `${item.menu.name} x${item.quantity}`)
													.join(", ")}
											</span>
											<span className="text-zinc-500 ml-2">
												({count}点 / ¥{total.toLocaleString()})
											</span>
										</div>
										<span className="text-zinc-500 font-medium flex items-center gap-1">
											<Check size={11} className="text-emerald-500" />
											{new Date(
												order.created_at || Date.now(),
											).toLocaleTimeString()}
										</span>
									</div>
								);
							})
					)}
				</div>
			</div>
		</div>
	);
}
