import { useCallback, useEffect, useRef, useState } from "react";
import { getMenus } from "../api/menu";
import { getOrders, type Order } from "../api/order";
import type { Menu } from "../cart";
export function useOrderData(onReady?: (ids: number[]) => void) {
	const [menus, setMenus] = useState<Menu[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
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
		const ordersRequest = getOrders()
			.then((newOrders) => {
				setOrders(newOrders);

				// Monitor logic: Detect if new orders became "ready" to flash
				const currentReadyIds = newOrders
					.filter((o: Order) => o.status === "ready")
					.map((o: Order) => o.id);
				const newlyReady = currentReadyIds.filter(
					(id) => !prevReadyIdsRef.current.includes(id),
				);
				if (newlyReady.length > 0) onReady?.(newlyReady);
				prevReadyIdsRef.current = currentReadyIds;
			})
			.catch(reportError);
		await Promise.all([menusRequest, ordersRequest]);
		setLoading(false);
	}, [onReady, refreshMenus]);

	useEffect(() => {
		fetchData();
		// Refresh menu promotions and orders on already-open screens.
		const interval = setInterval(() => {
			void refreshMenus().catch(() => {
				// Keep the previous menus when polling fails.
			});
			void getOrders()
				.then((newOrders) => {
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
				})
				.catch(() => {
					// Keep the previous orders when polling fails.
				});
		}, 4000);

		return () => {
			clearInterval(interval);
			++menuRequestRef.current;
		};
	}, [fetchData, refreshMenus]);
	const refreshOrders = useCallback(async () => {
		setOrders(await getOrders());
	}, []);
	return {
		menus,
		orders,
		setOrders,
		loading,
		setLoading,
		error,
		fetchData,
		refreshMenus,
		refreshOrders,
	};
}
