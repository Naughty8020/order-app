import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { getQRToken } from "../api/orderAccess";
import type { ShowToast } from "./useToast";
export interface OrderQR {
	qrImage: string;
	qrUrl: string;
	qrExpiresAt: string;
	qrLoading: boolean;
}
export function useOrderQR(showToast: ShowToast) {
	const [qrImage, setQrImage] = useState("");
	const [qrUrl, setQrUrl] = useState("");
	const [qrExpiresAt, setQrExpiresAt] = useState("");
	const [qrLoading, setQrLoading] = useState(false);
	const generateOrderQR = useCallback(async () => {
		setQrLoading(true);
		try {
			const data = await getQRToken();
			const orderURL = new URL(window.location.origin);
			orderURL.searchParams.set("order_token", data.token);
			setQrImage(
				await QRCode.toDataURL(orderURL.toString(), { width: 280, margin: 2 }),
			);
			setQrUrl(orderURL.toString());
			setQrExpiresAt(data.expires_at);
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : "QRコードの発行に失敗しました",
				"error",
			);
		} finally {
			setQrLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		if (!qrImage) void generateOrderQR();
	}, [generateOrderQR, qrImage]);

	useEffect(() => {
		if (!qrImage || !qrExpiresAt) return;
		const delay = Math.max(
			new Date(qrExpiresAt).getTime() - Date.now() + 1000,
			1000,
		);
		const timer = window.setTimeout(() => void generateOrderQR(), delay);
		return () => window.clearTimeout(timer);
	}, [generateOrderQR, qrExpiresAt, qrImage]);

	return { qrImage, qrUrl, qrExpiresAt, qrLoading };
}
