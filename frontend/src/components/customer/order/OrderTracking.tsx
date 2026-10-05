import { Clock, RotateCw } from "lucide-react";
import type { Order } from "../../../api/order";
import { OrderCard } from "./OrderCard";

interface Props {
	orders: Order[];
	fetchData: () => Promise<void>;
}

export function OrderTracking({ orders, fetchData }: Props) {
	const activeOrders = orders
		.filter((order) => order.status !== "completed")
		.slice()
		.reverse();
	return (
		<section className="mt-5 md:mt-8 rounded-2xl border border-white/8 bg-[rgba(20,20,30,0.6)] p-4 md:p-6 backdrop-blur-sm">
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-white/8 pb-3 mb-3">
				<h2 className="flex items-center gap-2 text-base font-bold text-white">
					<Clock size={16} className="shrink-0 text-pink-400" />
					Live 注文ステータス
				</h2>
				<button
					type="button"
					onClick={fetchData}
					className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-white/12 bg-white/5 px-3 py-2 text-[13px] text-zinc-400 transition hover:border-white/20 hover:text-white cursor-pointer"
				>
					<RotateCw size={13} aria-hidden="true" />
					更新
				</button>
				<p className="col-span-2 text-xs leading-5 text-zinc-400">
					番号が「お呼び出し中」になったら、カウンターでお受け取りください。
				</p>
			</div>
			{activeOrders.length === 0 ? (
				<p className="py-4 text-center text-xs text-zinc-500">
					現在、準備中・お呼び出し中の注文はありません。
				</p>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar">
					{activeOrders.map((order) => (
						<OrderCard key={order.id} order={order} />
					))}
				</div>
			)}
		</section>
	);
}
