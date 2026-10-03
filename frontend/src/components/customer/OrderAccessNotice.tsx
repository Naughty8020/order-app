import type { OrderAccessStatus } from "../../hooks/customer/useOrderSession";
export function OrderAccessNotice({
	orderAccessStatus,
}: {
	orderAccessStatus: OrderAccessStatus;
}) {
	return (
		<>
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
		</>
	);
}
