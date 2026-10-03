import { Ticket, X } from "lucide-react";
export function OrderSuccessModal({
	orderId,
	onClose,
}: {
	orderId: number | null;
	onClose: () => void;
}) {
	return (
		<>
			{/* Order Success Modal */}
			{orderId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
					<div className="bg-[#14141e] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(236,72,153,0.15)]">
						<button
							type="button"
							onClick={onClose}
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
									#{orderId}
								</span>
							</div>
							<p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">
								※モニター画面で番号が「お呼び出し中
								(Ready)」になりましたら、カウンターへお越しください。
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-xl shadow-[0_4px_20px_rgba(236,72,153,0.35)] transition cursor-pointer"
						>
							確認して閉じる
						</button>
					</div>
				</div>
			)}
		</>
	);
}
