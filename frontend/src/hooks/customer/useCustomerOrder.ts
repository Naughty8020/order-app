import { useCallback, useState } from "react";
import { createOrder, getOrders, getPublicOrders } from "../../api/order";
import { getAuthToken } from "../../api/auth";
import { getCustomerOrders, saveReceipt } from "../../api/orderReceipts";
import { useOrderData } from "../useOrderData";
import { useToast } from "../useToast";
import { useCart } from "./useCart";
import { useOrderSession } from "./useOrderSession";
const getStaffOrders = () =>
	getAuthToken() ? getOrders() : Promise.resolve([]);
export function useCustomerOrder(
	mode: "customer" | "staff" | "monitor" = "customer",
) {
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
	const onReady = useCallback(
		(ids: number[]) => {
			if (mode === "monitor")
				showToast(
					`オーダー番号 #${ids.join(", #")} ができあがりました！`,
					"info",
				);
		},
		[mode, showToast],
	);
	const {
		menus,
		orders,
		loading,
		setLoading,
		error,
		fetchData,
		refreshMenus,
		refreshOrders,
	} = useOrderData(
		onReady,
		mode === "customer"
			? getCustomerOrders
			: mode === "staff"
				? getStaffOrders
				: getPublicOrders,
	);
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
				const persisted = saveReceipt(resData);
				if (resData.id) {
					setSuccessModal({ show: true, orderId: resData.id });
				} else {
					showToast(
						"注文は完了しましたが、オーダー番号を取得できませんでした。",
						"info",
					);
				}
				setCart({});
				if (!persisted)
					showToast(
						"注文は完了しました。履歴を端末に保存できないため、注文番号を控えてください。",
						"info",
					);
				try {
					await refreshOrders();
				} catch {
					showToast(
						"注文は完了しました。履歴を取得できないため、後ほど更新してください。",
						"info",
					);
				}
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
		showToast,
		refreshMenus,
		refreshOrders,
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
