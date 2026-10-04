import { useCallback, useEffect, useState } from "react";
import { createOrderSession, type OrderSession } from "../../api/orderAccess";
export type OrderAccessStatus = "checking" | "valid" | "missing" | "invalid";
export function useOrderSession() {
	const [orderSession, setOrderSession] = useState<OrderSession | null>(null);
	const [orderAccessStatus, setOrderAccessStatus] =
		useState<OrderAccessStatus>("checking");
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

	const invalidateSession = useCallback(() => {
		window.sessionStorage.removeItem("order_session");
		setOrderSession(null);
		setOrderAccessStatus("invalid");
	}, []);
	return {
		orderSession,
		orderAccessStatus,
		setOrderAccessStatus,
		invalidateSession,
	};
}
