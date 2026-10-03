import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const isTest = typeof process !== "undefined" && !!process.env.VITEST;

// Set this before loading Wrangler, which resolves its log path at import time.
process.env.WRANGLER_LOG_PATH ??= fileURLToPath(
	new URL("./.wrangler/logs/", import.meta.url),
);
const { cloudflare } = await import("@cloudflare/vite-plugin");

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		!isTest && cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	].filter(Boolean),
});

export default config;
