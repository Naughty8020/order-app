import { useState } from "react";
import { useCustomerOrder } from "../../hooks/customer/useCustomerOrder";
import { useMenuManagement } from "../../hooks/staff/useMenuManagement";
import { useOrderManagement } from "../../hooks/staff/useOrderManagement";
import { useOrderQR } from "../../hooks/useOrderQR";
import { CustomerBackground } from "../customer/CustomerBackground";
import { CustomerContent } from "../customer/CustomerContent";
import { CustomerError } from "../customer/CustomerError";
import { OrderSuccessModal } from "../customer/order/OrderSuccessModal";
import { ToastNotification } from "../customer/ToastNotification";
import { MonitorBoard } from "../monitor/MonitorBoard";
import { MenuManager } from "../staff/MenuManager";
import { OrderQRPanel } from "../staff/OrderQRPanel";
import { StaffOrders } from "../staff/StaffOrders";
import { OperationsHeader, type OperationsMode } from "./OperationsHeader";
export function OperationsPage({
	initialMode,
}: {
	initialMode: OperationsMode;
}) {
	const [mode, setMode] = useState(initialMode);
	const customer = useCustomerOrder(mode === "monitor");
	const qr = useOrderQR(customer.showToast);
	const menuManagement = useMenuManagement(
		customer.refreshMenus,
		customer.showToast,
	);
	const orderManagement = useOrderManagement(
		customer.refreshOrders,
		customer.showToast,
	);
	return (
		<div className="relative min-h-screen bg-[#0a0a12] text-white overflow-x-hidden font-['Hiragino_Sans','Yu_Gothic',sans-serif] selection:bg-pink-500/30">
			<CustomerBackground />
			<ToastNotification toast={customer.toast} />
			<OrderSuccessModal
				orderId={
					customer.successModal.show ? customer.successModal.orderId : null
				}
				onClose={() => customer.setSuccessModal({ show: false, orderId: null })}
			/>
			<OperationsHeader mode={mode} setMode={setMode} />
			<main className="relative z-10 px-6 md:px-12 pb-32 lg:pb-16 max-w-[1400px] mx-auto">
				<CustomerError error={customer.error} onRetry={customer.fetchData} />
				{mode === "customer" && <CustomerContent {...customer} />}
				{mode === "staff" && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<OrderQRPanel {...qr} />
						<StaffOrders orders={customer.orders} {...orderManagement} />
						<MenuManager menus={customer.menus} {...menuManagement} />
					</div>
				)}
				{mode === "monitor" && (
					<MonitorBoard orders={customer.orders} {...qr} />
				)}
			</main>
		</div>
	);
}
