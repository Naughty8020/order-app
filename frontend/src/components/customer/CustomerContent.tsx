import type { ComponentProps } from "react";
import { CartTray } from "./cart/CartTray";
import { MenuGrid } from "./menu/MenuGrid";
import { OrderAccessNotice } from "./order/OrderAccessNotice";
import { OrderTracking } from "./order/OrderTracking";

type Props = ComponentProps<typeof CartTray> &
	ComponentProps<typeof MenuGrid> &
	ComponentProps<typeof OrderTracking>;
export function CustomerContent({
	cart,
	isCartOpen,
	setIsCartOpen,
	loading,
	orderAccessStatus,
	menus,
	orders,
	fetchData,
	addToCart,
	updateCartQty,
	removeFromCart,
	submitOrder,
}: Props) {
	return (
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
	);
}
