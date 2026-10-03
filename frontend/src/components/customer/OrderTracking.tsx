import { Clock, RotateCw } from "lucide-react";
import type { Order } from "../../api/order";
import { OrderCard } from "./OrderCard";

interface Props {
	orders: Order[];
	fetchData: () => Promise<void>;
}

export function OrderTracking({ orders, fetchData }: Props) {
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
							.map((order) => (
								<OrderCard key={order.id} order={order} />
							))}
					</div>
				)}
			</section>
		</>
	);
}
