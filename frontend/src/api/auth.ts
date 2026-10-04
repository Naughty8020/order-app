import { getApiBase } from "./base";

export const SESSION_EXPIRED_EVENT = "auth:session-expired";
export type ProtectedDestination = "/staff" | "/monitor";

export interface AuthUser {
	id: string;
	username: string;
}

export class AuthError extends Error {
	constructor(
		message: string,
		public status: number,
		public code: string,
	) {
		super(message);
		this.name = "AuthError";
	}
}

export function loginDestination(value: unknown): ProtectedDestination {
	return value === "/monitor" ? "/monitor" : "/staff";
}

function apiURL(path: string): string {
	if (typeof window === "undefined") {
		throw new Error("認証APIはブラウザから呼び出してください");
	}
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
		throw new Error("認証APIのパスが不正です");
	}
	const base = new URL(`${getApiBase()}/`, window.location.origin);
	const url = new URL(`.${path}`, base);
	if (
		url.origin !== base.origin ||
		!url.pathname.startsWith(base.pathname) ||
		url.hash
	) {
		throw new Error("認証APIのパスが不正です");
	}
	return url.toString();
}

async function checkAuthentication(response: Response, requiresAuth: boolean) {
	if (response.status !== 401 && response.status !== 403) return;
	const data = await response
		.clone()
		.json()
		.catch(() => null);
	const code = typeof data?.code === "string" ? data.code : "";
	if (response.status === 401) {
		if (requiresAuth) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
		throw new AuthError(
			requiresAuth
				? "ログインの有効期限が切れました。再度ログインしてください"
				: "ユーザー名またはパスワードが違います",
			401,
			code || "UNAUTHENTICATED",
		);
	}
	if (code === "CSRF_INVALID") {
		// Never replay a mutation automatically: its outcome could be uncertain.
		throw new AuthError(
			"操作の確認期限が切れました。もう一度操作してください",
			403,
			code,
		);
	}
	throw new AuthError("アクセスが拒否されました", 403, code || "FORBIDDEN");
}

async function getCSRFToken(
	requiresAuth: boolean,
	signal?: AbortSignal | null,
): Promise<string> {
	const response = await fetch(apiURL("/csrf-token"), {
		credentials: "include",
		cache: "no-store",
		redirect: "error",
		signal,
		headers: { Accept: "application/json" },
	});
	await checkAuthentication(response, requiresAuth);
	if (!response.ok)
		throw new Error(
			"操作の確認情報を取得できませんでした。接続を確認して再試行してください",
		);
	const data: unknown = await response.json();
	if (
		!data ||
		typeof data !== "object" ||
		!("csrfToken" in data) ||
		typeof data.csrfToken !== "string" ||
		!data.csrfToken.trim()
	) {
		throw new Error("認証サーバーのCSRF応答が不正です");
	}
	return data.csrfToken;
}

/** Only call with paths relative to the configured API, e.g. /menus/1. */
export async function cookieFetch(
	path: string,
	init: RequestInit = {},
	requiresAuth = false,
): Promise<Response> {
	const url = apiURL(path);
	const method = (init.method || "GET").toUpperCase();
	const headers = new Headers(init.headers);
	headers.delete("Authorization");
	headers.delete("X-CSRF-Token");
	headers.set("Accept", "application/json");
	if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
		headers.set("X-CSRF-Token", await getCSRFToken(requiresAuth, init.signal));
	}
	const response = await fetch(url, {
		...init,
		method,
		headers,
		credentials: "include",
		cache: "no-store",
		redirect: "error",
	});
	await checkAuthentication(response, requiresAuth);
	return response;
}

export function authenticatedFetch(path: string, init: RequestInit = {}) {
	return cookieFetch(path, init, true);
}

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
	// Route checks (including preloads) must not invalidate another active page.
	const response = await authenticatedFetch("/me", { signal });
	if (!response.ok) throw new Error("ログイン状態を確認できませんでした");
	const data = await response.json();
	const user = data?.user;
	if (
		!user ||
		typeof user.id !== "string" ||
		!user.id ||
		typeof user.username !== "string"
	) {
		throw new Error("認証サーバーのユーザー情報が不正です");
	}
	return { id: user.id, username: user.username };
}

export async function logout(): Promise<void> {
	const response = await authenticatedFetch("/logout", { method: "POST" });
	if (!response.ok)
		throw new Error(
			"ログアウトできませんでした。接続を確認して再試行してください",
		);
	window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
