import { defineConfig, devices } from "@playwright/test";

if (!process.env.TEST_MYSQL_DSN) {
	throw new Error(
		"TEST_MYSQL_DSN is required. Start the test MySQL first; see backend/README.md.",
	);
}

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://127.0.0.1:13000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1440, height: 1000 },
			},
		},
	],
	webServer: [
		{
			command:
				"mkdir -p .e2e && cd ../backend && go build -tags=integration -o ../frontend/.e2e/api ./cmd/e2eserver && exec ../frontend/.e2e/api",
			url: "http://127.0.0.1:18080/api/menus",
			reuseExistingServer: false,
			timeout: 120_000,
			gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
			env: {
				TEST_MYSQL_DSN: process.env.TEST_MYSQL_DSN,
				JWT_SECRET: "e2e-only-secret-at-least-32-bytes-long",
				ORDER_ACCESS_SECRET: "e2e-only-order-access-secret",
				ADMIN_USERNAME: "e2e-admin",
				ADMIN_PASSWORD: "e2e-password",
				FRONTEND_ORIGINS: "http://127.0.0.1:13000",
				GIN_MODE: "release",
			},
		},
		{
			command: "bun run dev --host 127.0.0.1 --port 13000 --strictPort",
			url: "http://127.0.0.1:13000/login",
			reuseExistingServer: false,
			timeout: 120_000,
			gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
			env: { VITE_API_BASE_URL: "http://127.0.0.1:18080/api" },
		},
	],
});
