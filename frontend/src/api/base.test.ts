import { afterEach, expect, it, vi } from "vitest";
import { getApiBase } from "./base";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

it("uses the configured API URL in production and development", () => {
	vi.stubEnv("VITE_API_BASE_URL", " https://api.example.com/api/ ");
	for (const development of [false, true]) {
		vi.stubEnv("DEV", development);
		expect(getApiBase()).toBe("https://api.example.com/api");
	}
});

it("uses the development PC hostname for LAN clients", () => {
	vi.stubEnv("VITE_API_BASE_URL", "");
	vi.stubEnv("DEV", true);
	vi.stubGlobal("window", { location: { hostname: "192.168.1.20" } });
	expect(getApiBase()).toBe("http://192.168.1.20:8080/api");
});

it("works without window during development SSR", () => {
	vi.stubEnv("VITE_API_BASE_URL", "");
	vi.stubEnv("DEV", true);
	vi.stubGlobal("window", undefined);
	expect(getApiBase()).toBe("http://localhost:8080/api");
});

it("uses same-origin API in production when no override is supplied", () => {
	vi.stubEnv("VITE_API_BASE_URL", "");
	vi.stubEnv("DEV", false);
	expect(getApiBase()).toBe("/api");
});
