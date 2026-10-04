import { BellRing, Clock } from "lucide-react";
import type { Order } from "../../../api/order";
import {
	getOrderItemsCount,
	getOrderTotal,
} from "../../../utils/customerPresentation";
export function OrderCard({ order }: { order: Order }) {
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
						{new Date(order.created_at || Date.now()).toLocaleTimeString()}
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
				<span className="text-white">¥{total.toLocaleString()}</span>
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
}
