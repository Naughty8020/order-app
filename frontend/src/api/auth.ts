/** This checks expiry for the UI only. JWT signatures must be verified by the server. */
export function isCurrentToken(token: string): boolean {
	try {
		const parts = token.split(".");
		if (
			parts.length !== 3 ||
			parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
		)
			return false;
		const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const claims = JSON.parse(
			atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")),
		);
		return (
			typeof claims.exp === "number" &&
			Number.isFinite(claims.exp) &&
			claims.exp * 1000 > Date.now()
		);
	} catch {
		return false;
	}
}

export function getAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	const token = window.localStorage.getItem("token");
	if (token && isCurrentToken(token)) return token;
	if (token) window.localStorage.removeItem("token");
	return null;
}

export function requireLogin(): void {
	if (typeof window !== "undefined" && window.location.pathname !== "/login") {
		window.location.assign("/login");
	}
}

export async function authenticatedFetch(
	url: string,
	init?: RequestInit,
	required = false,
): Promise<Response> {
	const token = getAuthToken();
	if (required && !token) {
		requireLogin();
		throw new Error("ログインし直してください");
	}
	const headers = new Headers(init?.headers);
	if (token) headers.set("Authorization", `Bearer ${token}`);
	const response = await fetch(url, token ? { ...init, headers } : init);
	if (response.status === 401 && token) {
		// A delayed response must not clear a newer login.
		if (window.localStorage.getItem("token") === token) {
			window.localStorage.removeItem("token");
			requireLogin();
		}
	}
	return response;
}
