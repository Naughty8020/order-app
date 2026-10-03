import { createFileRoute } from "@tanstack/react-router";
import { CartTray } from "../components/customer/CartTray";
import { CustomerBackground } from "../components/customer/CustomerBackground";
import { CustomerError } from "../components/customer/CustomerError";
import { CustomerHeader } from "../components/customer/CustomerHeader";
import { MenuGrid } from "../components/customer/MenuGrid";
import { OrderAccessNotice } from "../components/customer/OrderAccessNotice";
import { OrderSuccessModal } from "../components/customer/OrderSuccessModal";
import { OrderTracking } from "../components/customer/OrderTracking";
import { ToastNotification } from "../components/customer/ToastNotification";
import { useCustomerOrder } from "../hooks/customer/useCustomerOrder";
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
			<CustomerBackground />

			<ToastNotification toast={toast} />

			<OrderSuccessModal
				orderId={successModal.show ? successModal.orderId : null}
				onClose={() => setSuccessModal({ show: false, orderId: null })}
			/>

			<CustomerHeader />

			{/* ===== MAIN CONTENT ===== */}
			<main className="relative z-10 px-6 md:px-12 pb-32 lg:pb-16 max-w-[1400px] mx-auto">
				<CustomerError error={error} onRetry={fetchData} />

				{/* ===== 1. CUSTOMER MODE ===== */}
				<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
					<OrderAccessNotice orderAccessStatus={orderAccessStatus} />

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
