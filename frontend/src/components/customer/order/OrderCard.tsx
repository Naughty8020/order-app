import { BellRing, Clock } from "lucide-react";
import type { Order } from "../../../api/order";

export function OrderCard({ order }: { order: Order }) {
	const ready = order.status === "ready";
	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/5 px-4 py-3 ${ready ? "border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.1)]" : "border-white/8"}`}
		>
			<span className="text-xl font-extrabold tracking-wide text-pink-400">
				<span className="sr-only">オーダー番号 </span>#{order.id}
			</span>
			<span
				className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold ${ready ? "border-pink-500/40 bg-pink-500/15 text-pink-300" : "border-amber-600/30 bg-amber-950/50 text-amber-400"}`}
			>
				{ready ? (
					<BellRing size={14} aria-hidden="true" />
				) : (
					<Clock size={14} aria-hidden="true" />
				)}
				{ready ? "お呼び出し中" : "準備中"}
			</span>
		</div>
	);
}
