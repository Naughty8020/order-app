import { useCallback, useEffect, useRef, useState } from "react";
import { getMenus } from "../api/menu";
import { getOrders, type Order } from "../api/order";
import type { Menu } from "../cart";
export function useOrderData(
	onReady?: (ids: number[]) => void,
	loadOrders = getOrders,
) {
	const [menus, setMenus] = useState<Menu[]>([]);
	const [orderState, setOrderState] = useState<{
		source: typeof loadOrders;
		orders: Order[];
	}>({ source: loadOrders, orders: [] });
	const orders = orderState.source === loadOrders ? orderState.orders : [];
	const orderRequestRef = useRef(0);
	const fetchOrders = useCallback(async () => {
		const request = ++orderRequestRef.current;
		const newOrders = await loadOrders();
		if (request !== orderRequestRef.current) return;
		setOrderState({ source: loadOrders, orders: newOrders });
		const currentReadyIds = newOrders
			.filter((order) => order.status === "ready")
			.map((order) => order.id);
		const newlyReady = currentReadyIds.filter(
			(id) => !prevReadyIdsRef.current.includes(id),
		);
		if (newlyReady.length > 0) onReady?.(newlyReady);
		prevReadyIdsRef.current = currentReadyIds;
		return newlyReady;
	}, [loadOrders, onReady]);
	const refreshOrders = useCallback(async () => {
		await fetchOrders();
	}, [fetchOrders]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const prevReadyIdsRef = useRef<number[]>([]);
	const menuRequestRef = useRef(0);
	const refreshMenus = useCallback(async () => {
		const request = ++menuRequestRef.current;
		const newMenus = await getMenus();
		if (request === menuRequestRef.current) setMenus(newMenus);
	}, []);
	// Fetch Data
	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		const reportError = (err: unknown) => {
			console.error(err);
			setError(
				err instanceof Error
					? err.message
					: String(err) || "サーバーとの通信中にエラーが発生しました",
			);
		};
		// Each request applies its result without waiting for the other.
		const menusRequest = refreshMenus().catch(reportError);
		const ordersRequest = refreshOrders().catch(reportError);
		await Promise.all([menusRequest, ordersRequest]);
		setLoading(false);
	}, [refreshOrders, refreshMenus]);

	useEffect(() => {
		prevReadyIdsRef.current = [];
		fetchData();
		// Refresh menu promotions and orders on already-open screens.
		const interval = setInterval(() => {
			void refreshMenus().catch(() => {
				// Keep the previous menus when polling fails.
			});
			void fetchOrders()
				.then((newlyAdded) => {
					if (newlyAdded && newlyAdded.length > 0) {
						// Synthesize sound cue if supported
						if (typeof window !== "undefined" && "speechSynthesis" in window) {
							const utterance = new SpeechSynthesisUtterance(
								`オーダー番号、${newlyAdded.join("番、")}、できあがりました。`,
							);
							utterance.lang = "ja-JP";
							window.speechSynthesis.speak(utterance);
						}
					}
				})
				.catch(() => {
					// Keep the previous orders when polling fails.
				});
		}, 4000);

		return () => {
			clearInterval(interval);
			++menuRequestRef.current;
			++orderRequestRef.current;
		};
	}, [fetchData, refreshMenus, fetchOrders]);
	return {
		menus,
		orders,
		loading,
		setLoading,
		error,
		fetchData,
		refreshMenus,
		refreshOrders,
	};
}
