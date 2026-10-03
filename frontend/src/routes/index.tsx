import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	BellRing,
	Check,
	RotateCw,
	Ticket,
	X,
} from "lucide-react";
import { CartTray } from "../features/customer/CartTray";
import { MenuGrid } from "../features/customer/MenuGrid";
import { OrderTracking } from "../features/customer/OrderTracking";
import { useCustomerOrder } from "../features/customer/useCustomerOrder";
export const Route = createFileRoute("/")({ component: App });
function App() {
	const {
		menus,
		orders,
		cart,
		isCartOpen,
		setIsCartOpen,
		loading,
		error,
		orderAccessStatus,
		successModal,
		setSuccessModal,
		toast,
		fetchData,
		addToCart,
		updateCartQty,
		removeFromCart,
		submitOrder,
	} = useCustomerOrder();
	return (
		<div className="relative min-h-screen bg-[#0a0a12] text-white overflow-x-hidden font-['Hiragino_Sans','Yu_Gothic',sans-serif] selection:bg-pink-500/30">
			{/* Background gradients */}
			<div
				className="fixed inset-0 pointer-events-none z-0"
				style={{
					background: `
						radial-gradient(ellipse 700px 400px at 15% 10%, rgba(168,85,247,0.25), transparent 60%),
						radial-gradient(ellipse 600px 500px at 90% 20%, rgba(236,72,153,0.20), transparent 60%),
						radial-gradient(ellipse 500px 400px at 50% 90%, rgba(59,130,246,0.12), transparent 60%)
					`,
				}}
			/>
			{/* Grid overlay */}
			<div
				className="fixed top-0 left-0 right-0 h-[520px] pointer-events-none z-0"
				style={{
					backgroundImage: `
						linear-gradient(rgba(236,72,153,0.10) 1px, transparent 1px),
						linear-gradient(90deg, rgba(236,72,153,0.10) 1px, transparent 1px)
					`,
					backgroundSize: "48px 48px",
					maskImage: "linear-gradient(to bottom, black 0%, transparent 90%)",
					WebkitMaskImage:
						"linear-gradient(to bottom, black 0%, transparent 90%)",
				}}
			/>

			{/* Toast Notification */}
			{toast && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
					<div
						className={`px-6 py-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border text-sm font-semibold flex items-center gap-2 backdrop-blur-md transition-all
							${toast.type === "success" ? "bg-emerald-950/90 border-emerald-500 text-emerald-300" : ""}
							${toast.type === "error" ? "bg-rose-950/90 border-rose-500 text-rose-300" : ""}
							${toast.type === "info" ? "bg-sky-950/90 border-sky-500 text-sky-300 animate-pulse" : ""}
						`}
					>
						{toast.type === "success" && (
							<Check size={16} className="text-emerald-400" />
						)}
						{toast.type === "error" && (
							<AlertCircle size={16} className="text-rose-400" />
						)}
						{toast.type === "info" && (
							<BellRing size={16} className="text-sky-400 animate-bounce" />
						)}
						<span>{toast.message}</span>
					</div>
				</div>
			)}

			{/* Order Success Modal */}
			{successModal.show && successModal.orderId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
					<div className="bg-[#14141e] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(236,72,153,0.15)]">
						<button
							type="button"
							onClick={() => setSuccessModal({ show: false, orderId: null })}
							className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition cursor-pointer"
						>
							<X size={20} />
						</button>
						<div className="h-16 w-16 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-400">
							<Ticket size={32} className="animate-pulse" />
						</div>
						<h2 className="text-2xl font-black text-white">
							ご注文ありがとうございます！
						</h2>
						<p className="text-sm text-zinc-400 mt-2">
							ドリンクの準備を進めております。以下のオーダー番号をお控えください。
						</p>
						<div className="my-6 bg-[#0a0a12] border border-white/8 p-6 rounded-2xl">
							<p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">
								あなたのオーダー番号
							</p>
							<div className="flex justify-center">
								<span className="text-5xl font-black text-white tracking-wider bg-[#14141e] border border-pink-500/40 px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.15)]">
									#{successModal.orderId}
								</span>
							</div>
							<p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">
								※モニター画面で番号が「お呼び出し中
								(Ready)」になりましたら、カウンターへお越しください。
							</p>
						</div>
						<button
							type="button"
							onClick={() => setSuccessModal({ show: false, orderId: null })}
							className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-xl shadow-[0_4px_20px_rgba(236,72,153,0.35)] transition cursor-pointer"
						>
							確認して閉じる
						</button>
					</div>
				</div>
			)}

			{/* ===== HERO SECTION ===== */}
			<div className="relative z-10 px-6 md:px-12 pt-14 pb-10 max-w-[1400px] mx-auto">
				{/* Now Playing widget removed */}

				<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-40">
					{/* Title Group */}
					<div>
						{/* Badge */}
						<div className="inline-flex items-center gap-1.5 bg-[rgba(236,72,153,0.15)] border border-[rgba(236,72,153,0.4)] text-[#f472b6] text-[11px] font-bold tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-full mb-5 -ml-3.5">
							<span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
							MUSIC LOUNGE
						</div>

						<h1 className="text-5xl md:text-[64px] font-extrabold tracking-tight bg-gradient-to-r from-[#a78bfa] via-[#ec4899] to-[#fb923c] bg-clip-text text-transparent leading-[1.05] mb-1">
							Tech Club
						</h1>
						<p className="text-gray-100 text-base font-medium mb-4">
							音楽とテクノロジーが織りなす新しい体験を。
						</p>
					</div>
				</div>
			</div>

			{/* ===== MAIN CONTENT ===== */}
			<main className="relative z-10 px-6 md:px-12 pb-32 lg:pb-16 max-w-[1400px] mx-auto">
				{error && (
					<div className="bg-[rgba(20,20,30,0.6)] border border-rose-800/80 rounded-2xl p-4 text-rose-300 flex items-center gap-3 mb-8 backdrop-blur-md">
						<AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
						<div>
							<p className="font-bold text-sm">システムエラー</p>
							<p className="text-xs text-rose-400/90">{error}</p>
						</div>
						<button
							type="button"
							onClick={fetchData}
							className="ml-auto bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
						>
							<RotateCw size={12} />
							再試行
						</button>
					</div>
				)}

				{/* ===== 1. CUSTOMER MODE ===== */}
				<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
					{orderAccessStatus !== "valid" && (
						<div className="lg:col-span-2 bg-amber-950/40 border border-amber-400/60 rounded-2xl p-5 text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.15)] mb-4">
							<p className="font-bold flex items-center gap-2 text-lg">
								<span className="text-xl">📱</span>{" "}
								店頭の注文用QRコードを読み取ってください
							</p>
							<p className="text-sm text-amber-200/90 mt-1 ml-7">
								{orderAccessStatus === "checking"
									? "注文セッションを確認しています…"
									: "QRコードは10分ごとに更新されます。期限切れの場合は、最新のQRコードを読み取ってください。"}
							</p>
						</div>
					)}
					{/* Menu Grid */}
					<div>
						<MenuGrid
							loading={loading}
							menus={menus}
							cart={cart}
							addToCart={addToCart}
							updateCartQty={updateCartQty}
						/>

						<OrderTracking orders={orders} fetchData={fetchData} />
					</div>

					<CartTray
						cart={cart}
						isCartOpen={isCartOpen}
						setIsCartOpen={setIsCartOpen}
						updateCartQty={updateCartQty}
						removeFromCart={removeFromCart}
						submitOrder={submitOrder}
						loading={loading}
						orderAccessStatus={orderAccessStatus}
					/>
				</div>
			</main>
		</div>
	);
}
