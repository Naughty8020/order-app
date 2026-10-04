import { getApiBase } from "./base";

export interface OrderQRToken {
	token: string;
	expires_at: string;
}

export async function getQRToken(): Promise<OrderQRToken> {
	const response = await fetch(`${getApiBase()}/order-access/qr`);
	if (!response.ok) throw new Error("QRコードの発行に失敗しました");
	return response.json();
}

export interface OrderSession {
	token: string;
	expiresAt: string;
}

export async function createOrderSession(
	qrToken: string,
): Promise<OrderSession> {
	const response = await fetch(`${getApiBase()}/order-access/session`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token: qrToken }),
	});
	if (!response.ok) throw new Error("invalid QR token");
	const data: { session_token: string; expires_at: string } =
		await response.json();
	return { token: data.session_token, expiresAt: data.expires_at };
}
