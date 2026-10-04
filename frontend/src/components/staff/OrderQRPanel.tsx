import type { OrderQR } from "../../hooks/useOrderQR";
export function OrderQRPanel({
	qrImage,
	qrUrl,
	qrExpiresAt,
	qrLoading,
}: OrderQR) {
	return (
		<div className="lg:col-span-3 bg-[#14141e]/60 border border-emerald-500/20 rounded-2xl p-6">
			<h2 className="text-lg font-bold text-white">店頭注文用QRコード</h2>
			<p className="text-xs text-zinc-400 mt-1 mb-4">
				QRコードは常時表示され、10分ごとに自動更新されます。
			</p>
			<div className="flex justify-center">
				<div className="bg-white p-3 rounded-xl text-center min-w-56 min-h-64 flex flex-col items-center justify-center">
					{qrImage ? (
						<>
							<img
								src={qrImage}
								alt="注文ページを開くQRコード"
								className="w-56 h-56"
							/>
							<a
								href={qrUrl}
								className="mt-3 block max-w-64 break-all text-xs text-blue-700 underline"
							>
								{qrUrl}
							</a>
							<p className="text-[11px] text-zinc-700 mt-2">
								有効期限: {new Date(qrExpiresAt).toLocaleTimeString()}
							</p>
						</>
					) : (
						<p className="text-sm text-zinc-700 px-4">
							{qrLoading
								? "QRコードを発行中…"
								: "QRコードを取得できませんでした"}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
