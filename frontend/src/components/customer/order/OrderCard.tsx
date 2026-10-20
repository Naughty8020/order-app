import { BellRing, Clock } from "lucide-react";
import type { Order } from "../../../api/order";

export function OrderCard({ order }: { order: Order }) {
	const ready = order.status === "ready";
	const completed = order.status === "completed";
	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/5 px-4 py-3 ${ready ? "border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.1)]" : "border-white/8"}`}
		>
			<span className="text-xl font-extrabold tracking-wide text-pink-400">
				<span className="sr-only">オーダー番号 </span>#{order.id}
			</span>
			<span
				aria-live="polite"
				className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold ${ready ? "border-pink-500/40 bg-pink-500/15 text-pink-300" : "border-amber-600/30 bg-amber-950/50 text-amber-400"}`}
			>
				{ready ? (
					<BellRing size={14} aria-hidden="true" />
				) : (
					<Clock size={14} aria-hidden="true" />
				)}
				{completed ? "受け取り済み" : ready ? "お呼び出し中" : "準備中"}
			</span>
			<div className="w-full border-t border-white/10 pt-3 text-sm">
				{order.created_at && (
					<p className="mb-2 text-xs text-zinc-400">
						{new Date(order.created_at).toLocaleString("ja-JP")}
					</p>
				)}
				<ul className="space-y-2">
					{order.order_items.map((item) => (
						<li key={item.id} className="flex justify-between gap-3">
							<div>
								<span>
									{item.name || item.menu?.name || "商品"} × {item.quantity}
								</span>
								{item.option && (
									<p className="text-xs text-pink-300">{item.option}</p>
								)}
							</div>
							<span className="whitespace-nowrap">
								¥{(item.price * item.quantity).toLocaleString()}
							</span>
						</li>
					))}
				</ul>
				<p className="mt-3 text-right font-bold">
					注文合計 ¥
					{order.order_items
						.reduce((total, item) => total + item.price * item.quantity, 0)
						.toLocaleString()}
				</p>
			</div>
		</div>
	);
}
