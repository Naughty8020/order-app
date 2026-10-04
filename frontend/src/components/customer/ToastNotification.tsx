import { AlertCircle, BellRing, Check } from "lucide-react";
import type { ToastMessage } from "../../hooks/useToast";
export function ToastNotification({ toast }: { toast: ToastMessage | null }) {
	return (
		<>
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
		</>
	);
}
