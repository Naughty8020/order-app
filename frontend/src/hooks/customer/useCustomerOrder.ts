import { useState } from "react";
import { createOrder, getOrders } from "../../api/order";
import { useToast } from "../useToast";
import { useCart } from "./useCart";
import { useCustomerData } from "./useCustomerData";
import { useOrderSession } from "./useOrderSession";
export function useCustomerOrder() {
	const {
		orderSession,
		orderAccessStatus,
		setOrderAccessStatus,
		invalidateSession,
	} = useOrderSession();
	const { toast, showToast } = useToast();
	const {
		cart,
		setCart,
		isCartOpen,
		setIsCartOpen,
		addToCart,
		updateCartQty,
		removeFromCart,
	} = useCart(showToast);
	const { menus, orders, setOrders, loading, setLoading, error, fetchData } =
		useCustomerData();
	const [successModal, setSuccessModal] = useState<{
		show: boolean;
		orderId: number | null;
	}>({ show: false, orderId: null });
	// Submit Order
	const submitOrder = async () => {
		const items = Object.values(cart);
		if (items.length === 0) return;
		if (
			!orderSession ||
			new Date(orderSession.expiresAt).getTime() <= Date.now()
		) {
			setOrderAccessStatus("invalid");
			showToast("注文用QRコードをもう一度読み取ってください", "error");
			return;
		}

		setLoading(true);
		try {
			const payload = {
				items: items.map((item) => ({
					menu_id: item.menu.id,
					quantity: item.quantity,
				})),
			};

			const result = await createOrder(payload, orderSession.token);

			if (result.ok) {
				const resData = result.order;
				if (resData.id) {
					setSuccessModal({ show: true, orderId: resData.id });
				} else {
					showToast(
						"注文は完了しましたが、オーダー番号を取得できませんでした。",
						"info",
					);
				}
				setCart({});
				// Reload orders
				setOrders(await getOrders());
			} else {
				if (result.status === 401) {
					invalidateSession();
				}
				showToast(result.error, "error");
			}
		} catch (err) {
			console.error(err);
			showToast("通信エラーが発生しました", "error");
		} finally {
			setLoading(false);
		}
	};

	return {
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
	};
}
