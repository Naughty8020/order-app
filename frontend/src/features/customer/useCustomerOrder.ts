import { useCallback, useEffect, useRef, useState } from "react";
import { getMenus } from "../../api/menu";
import { createOrder, getOrders, type Order } from "../../api/order";
import { createOrderSession, type OrderSession } from "../../api/orderAccess";
import { type Cart, changeCartQuantity, type Menu } from "../../cart";
export function useCustomerOrder() {
	const [menus, setMenus] = useState<Menu[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
	const [cart, setCart] = useState<Cart>({});
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [orderSession, setOrderSession] = useState<OrderSession | null>(null);
	const [orderAccessStatus, setOrderAccessStatus] = useState<
		"checking" | "valid" | "missing" | "invalid"
	>("checking");
	// Order Success Modal State
	const [successModal, setSuccessModal] = useState<{
		show: boolean;
		orderId: number | null;
	}>({
		show: false,
		orderId: null,
	});

	// Notification Toast
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error" | "info";
	} | null>(null);

	// Track newly called ready orders to trigger a visual or sound alert
	const prevReadyIdsRef = useRef<number[]>([]);

	useEffect(() => {
		const exchangeOrderToken = async () => {
			const params = new URLSearchParams(window.location.search);
			const qrToken = params.get("order_token");

			if (!qrToken) {
				const saved = window.sessionStorage.getItem("order_session");
				if (saved) {
					try {
						const session = JSON.parse(saved) as OrderSession;
						if (new Date(session.expiresAt).getTime() > Date.now()) {
							setOrderSession(session);
							setOrderAccessStatus("valid");
							return;
						}
					} catch {
						// Invalid stored data is discarded below.
					}
					window.sessionStorage.removeItem("order_session");
				}
				setOrderAccessStatus("missing");
				return;
			}

			try {
				const session = await createOrderSession(qrToken);
				window.sessionStorage.setItem("order_session", JSON.stringify(session));
				setOrderSession(session);
				setOrderAccessStatus("valid");

				params.delete("order_token");
				const query = params.toString();
				window.history.replaceState(
					{},
					"",
					`${window.location.pathname}${query ? `?${query}` : ""}`,
				);
			} catch {
				setOrderAccessStatus("invalid");
			}
		};

		void exchangeOrderToken();
	}, []);

	const showToast = useCallback(
		(message: string, type: "success" | "error" | "info" = "success") => {
			setToast({ message, type });
			setTimeout(() => setToast(null), 3000);
		},
		[],
	);

	// Fetch Data
	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setMenus(await getMenus());
			const newOrders = await getOrders();
			setOrders(newOrders);

			// Monitor logic: Detect if new orders became "ready" to flash
			const currentReadyIds = newOrders
				.filter((o: Order) => o.status === "ready")
				.map((o: Order) => o.id);
			prevReadyIdsRef.current = currentReadyIds;
		} catch (err: unknown) {
			console.error(err);
			setError(
				err instanceof Error
					? err.message
					: String(err) || "サーバーとの通信中にエラーが発生しました",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
		// Poll orders every 4 seconds for immediate monitor updates
		const interval = setInterval(async () => {
			try {
				const newOrders = await getOrders();
				setOrders(newOrders);

				const currentReadyIds = newOrders
					.filter((o: Order) => o.status === "ready")
					.map((o: Order) => o.id);
				const newlyAdded = currentReadyIds.filter(
					(id: number) => !prevReadyIdsRef.current.includes(id),
				);
				if (newlyAdded.length > 0) {
					// Synthesize sound cue if supported
					if (typeof window !== "undefined" && "speechSynthesis" in window) {
						const utterance = new SpeechSynthesisUtterance(
							`オーダー番号、${newlyAdded.join("番、")}、できあがりました。`,
						);
						utterance.lang = "ja-JP";
						window.speechSynthesis.speak(utterance);
					}
				}
				prevReadyIdsRef.current = currentReadyIds;
			} catch (_e) {
				// Silently fail polling
			}
		}, 4000);

		return () => clearInterval(interval);
	}, [fetchData]);

	// Add to Cart
	const addToCart = (menu: Menu) => {
		if (!menu.is_available) {
			showToast("このメニューは現在売り切れです", "error");
			return;
		}
		setCart((prev) => {
			const current = prev[menu.id];
			return {
				...prev,
				[menu.id]: {
					menu,
					quantity: current ? current.quantity + 1 : 1,
				},
			};
		});
		showToast(`${menu.name} をカートに追加しました`);
	};

	// Update Cart Quantity
	const updateCartQty = (menuId: number, delta: number) => {
		setCart((prev) => changeCartQuantity(prev, menuId, delta));
	};

	// Remove from Cart
	const removeFromCart = (menuId: number) => {
		setCart((prev) => {
			const copy = { ...prev };
			delete copy[menuId];
			return copy;
		});
	};

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
					window.sessionStorage.removeItem("order_session");
					setOrderSession(null);
					setOrderAccessStatus("invalid");
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
