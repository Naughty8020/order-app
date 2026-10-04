import { type AuthUser, cookieFetch, getCurrentUser } from "./auth";

type LoginRequest = { username: string; password: string };

export async function createSession(data: LoginRequest): Promise<AuthUser> {
	const response = await cookieFetch("/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ userName: data.username, password: data.password }),
	});
	if (!response.ok)
		throw new Error(
			response.status === 429
				? "ログインの試行回数が多すぎます。しばらく待って再試行してください"
				: "ログインできませんでした。接続を確認して再試行してください",
		);
	// The backend sets the HttpOnly cookie. Never read a JWT from the response.
	return getCurrentUser();
}
