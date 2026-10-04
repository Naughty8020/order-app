import "./monitor.css";
import type { Order } from "../../api/order";
import type { OrderQR } from "../../hooks/useOrderQR";
export function MonitorBoard({
	orders,
	qrImage,
	qrUrl,
	qrLoading,
}: OrderQR & { orders: Order[] }) {
	const preparingOrders = orders.filter((o) => o.status === "pending");
	const readyOrders = orders.filter((o) => o.status === "ready");
	return (
		<div className="fixed inset-0 z-50 bg-[#020817] text-slate-100 flex p-8 gap-10 box-border overflow-hidden">
			{/* Background Grid & Gradients */}
			<div className="absolute inset-0 monitor-bg-pattern pointer-events-none"></div>
			<div className="absolute inset-0 monitor-disco-dots opacity-65 pointer-events-none"></div>
			<div className="monitor-light-beam monitor-light-beam-left absolute bottom-[-5%] left-[calc(36%_-_6.5rem)] w-52 h-[155%] pointer-events-none"></div>
			<div className="monitor-light-beam monitor-light-beam-center absolute bottom-[-5%] left-[calc(50%_-_6.5rem)] w-52 h-[155%] pointer-events-none"></div>
			<div className="monitor-light-beam monitor-light-beam-right absolute bottom-[-5%] left-[calc(64%_-_6.5rem)] w-52 h-[155%] pointer-events-none"></div>
			<h1 className="absolute top-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-7xl font-black font-serif tracking-tight text-white drop-shadow-[0_8px_30px_rgba(14,165,233,0.28)]">
				Tech Club
			</h1>

			{/* ================= 左側：QRコードエリア (30%) ================= */}
			<div className="w-[30%] flex flex-col relative z-10">
				<div className="h-[88px] shrink-0 mb-8" aria-hidden="true"></div>
				<div className="flex-1 bg-transparent border-4 border-sky-200/40 rounded-[28px] flex flex-col items-center justify-center p-8 relative overflow-hidden">
					<div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
						<h2 className="text-4xl font-black font-serif text-white mb-8 tracking-wider">
							スマホで注文！
						</h2>

						<div className="bg-white p-5 rounded-[28px] mb-8 shadow-[0_18px_55px_rgba(14,165,233,0.28)] relative">
							{qrImage ? (
								<img
									src={qrImage}
									alt="QR Code"
									className="w-64 h-64 rounded-2xl relative z-10"
								/>
							) : (
								<div className="w-64 h-64 flex items-center justify-center text-zinc-700 bg-white relative z-10 rounded-2xl">
									{qrLoading ? "QR発行中…" : "QR取得エラー"}
								</div>
							)}
						</div>

						{qrUrl && (
							<a
								href={qrUrl}
								className="relative z-10 mb-6 block w-full break-all text-xs text-sky-300/70 underline"
							>
								{qrUrl}
							</a>
						)}
					</div>
					<div className="shrink-0 text-center pt-4">
						<p className="font-serif text-sky-100/70 font-bold text-lg tracking-[0.16em]">
							&gt;&gt;&gt; SCAN QR TO ORDER &lt;&lt;&lt;
						</p>
					</div>
				</div>
			</div>

			{/* ================= 右側：オーダー状況エリア (70%) ================= */}
			<div className="w-[70%] flex flex-col relative z-10">
				{/* ① ヘッダー部 */}
				<div className="h-[88px] shrink-0 mb-8" aria-hidden="true"></div>

				{/* ② ステータスボード部 */}
				<div className="flex gap-6 flex-1 min-h-0">
					{/* カラム1: PREPARING */}
					<div className="flex-1 bg-transparent border-4 border-blue-300/35 rounded-[28px] p-8 flex flex-col relative overflow-hidden">
						<h3 className="text-3xl font-black font-serif text-white flex items-center gap-4 mb-8 tracking-wide">
							<span className="w-3 h-3 rounded-full bg-blue-300"></span>
							PREPARING <span className="tracking-normal">/ 準備中</span>
						</h3>

						<div className="grid grid-cols-2 2xl:grid-cols-3 gap-5 overflow-y-auto custom-scrollbar pr-2 pb-2">
							{preparingOrders.length === 0 ? (
								<div className="col-span-full flex items-center justify-center h-40 text-blue-100/25 font-medium">
									準備中のオーダーはありません
								</div>
							) : (
								preparingOrders.map((order) => (
									<div
										key={order.id}
										className="bg-gradient-to-br from-[#466b9f]/95 via-[#304b78]/95 to-[#182a4e]/95 border-2 border-[#a8d8f0]/65 rounded-2xl p-5 min-h-32 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_36px_rgba(0,0,0,0.48)]"
									>
										<span className="w-full text-center font-mono tabular-nums text-6xl font-black leading-none tracking-[0.03em] text-transparent [-webkit-text-fill-color:transparent] [-webkit-text-stroke:2px_#effcff] [filter:drop-shadow(0_0_3px_rgba(245,253,255,0.9))_drop-shadow(0_0_7px_rgba(56,189,248,0.72))_drop-shadow(0_0_14px_rgba(37,99,235,0.5))]">
											{order.id}
										</span>
									</div>
								))
							)}
						</div>
						{preparingOrders.length > 0 && (
							<div className="mt-auto text-center pt-4">
								<p className="font-serif text-sky-100/70 font-bold text-lg tracking-[0.16em]">
									&gt;&gt;&gt; YOUR ORDER IS BEING PREPARED &lt;&lt;&lt;
								</p>
							</div>
						)}
					</div>

					{/* カラム2: READY TO PICK UP */}
					<div className="flex-1 bg-transparent border-4 border-sky-200/40 rounded-[28px] p-8 flex flex-col relative overflow-hidden">
						<h3 className="text-3xl font-black font-serif text-white flex items-center gap-4 mb-8 tracking-wide">
							<span className="w-3 h-3 rounded-full bg-white"></span>
							READY <span className="tracking-normal">/ お呼び出し</span>
						</h3>

						<div className="grid grid-cols-2 2xl:grid-cols-3 gap-5 overflow-y-auto custom-scrollbar pr-2 pb-2">
							{readyOrders.length === 0 ? (
								<div className="col-span-full flex items-center justify-center h-40 text-sky-100/25 font-medium">
									お呼び出し中のオーダーはありません
								</div>
							) : (
								readyOrders.map((order) => (
									<div
										key={order.id}
										className="bg-gradient-to-br from-[#466b9f]/95 via-[#304b78]/95 to-[#182a4e]/95 border-2 border-[#a8d8f0]/65 rounded-2xl p-5 min-h-32 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_36px_rgba(0,0,0,0.48)]"
									>
										<span className="w-full text-center font-mono tabular-nums text-6xl font-black leading-none tracking-[0.03em] text-transparent [-webkit-text-fill-color:transparent] [-webkit-text-stroke:2px_#effcff] [filter:drop-shadow(0_0_3px_rgba(245,253,255,0.9))_drop-shadow(0_0_7px_rgba(56,189,248,0.72))_drop-shadow(0_0_14px_rgba(37,99,235,0.5))]">
											{order.id}
										</span>
									</div>
								))
							)}
						</div>

						{readyOrders.length > 0 && (
							<div className="mt-auto text-center pt-4">
								<p className="font-serif text-sky-100/70 font-bold text-lg tracking-[0.16em]">
									&gt;&gt;&gt; PLEASE COME TO THE COUNTER &lt;&lt;&lt;
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
