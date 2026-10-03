import { AlertCircle, RotateCw } from "lucide-react";
export function CustomerError({
	error,
	onRetry,
}: {
	error: string | null;
	onRetry: () => void;
}) {
	return (
		<>
			{error && (
				<div className="bg-[rgba(20,20,30,0.6)] border border-rose-800/80 rounded-2xl p-4 text-rose-300 flex items-center gap-3 mb-8 backdrop-blur-md">
					<AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
					<div>
						<p className="font-bold text-sm">システムエラー</p>
						<p className="text-xs text-rose-400/90">{error}</p>
					</div>
					<button
						type="button"
						onClick={onRetry}
						className="ml-auto bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
					>
						<RotateCw size={12} />
						再試行
					</button>
				</div>
			)}
		</>
	);
}
