import { type StaffOrderStatus, updateOrderStatus } from "../../api/order";
import type { ShowToast } from "../useToast";
export function useOrderManagement(
	refreshOrders: () => Promise<void>,
	showToast: ShowToast,
) {
	// Staff: Update Order Status
	const handleUpdateStatus = async (
		orderId: number,
		status: StaffOrderStatus,
	) => {
		try {
			await updateOrderStatus(orderId, status);

			let msg = "";
			if (status === "ready")
				msg = `オーダー番号 #${orderId} を「お呼び出し中」にしました`;
			if (status === "completed")
				msg = `オーダー番号 #${orderId} を「提供完了」にしました`;
			showToast(msg);

			// Refresh orders
			await refreshOrders();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	return { handleUpdateStatus };
}
