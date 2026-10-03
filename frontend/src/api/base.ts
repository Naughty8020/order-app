/** VITE_API_BASE_URL includes /api and is embedded at build time. */
export function getApiBase(): string {
	const configured = import.meta.env.VITE_API_BASE_URL?.trim();
	if (configured) return configured.replace(/\/+$/, "");

	if (import.meta.env.DEV) {
		const hostname = typeof window === "undefined" ? "localhost" : window.location.hostname;
		return `http://${hostname}:8080/api`;
	}

	return "/api";
}
