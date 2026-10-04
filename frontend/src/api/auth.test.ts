// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	authenticatedFetch,
	getCurrentUser,
	loginDestination,
	logout,
	SESSION_EXPIRED_EVENT,
} from "./auth";
import { createSession } from "./login";
import { createMenu, deleteMenu, updateMenuAvailability } from "./menu";
import { updateOrderStatus } from "./order";
import { getQRToken } from "./orderAccess";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
	window.localStorage.clear();
	window.sessionStorage.clear();
});
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

describe("cookie authentication", () => {
	it("protects login against CSRF then verifies the cookie with /me without reading a JWT", async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json({ csrfToken: "pre-login-csrf" }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockResolvedValueOnce(
				Response.json({ user: { id: "1", username: "staff" } }),
			);
		expect(
			await createSession({ username: "staff", password: "password" }),
		).toEqual({ id: "1", username: "staff" });
		const [url, init] = fetchMock.mock.calls[1];
		expect(url).toMatch(/\/login$/);
		expect(init?.credentials).toBe("include");
		expect(new Headers(init?.headers).get("X-CSRF-Token")).toBe(
			"pre-login-csrf",
		);
		expect(init?.body).toBe(
			JSON.stringify({ userName: "staff", password: "password" }),
		);
		expect(fetchMock.mock.calls[2][0]).toMatch(/\/me$/);
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
	});

	it.each([
		[
			"create menu",
			() => createMenu({ name: "Tea", price: 150, is_available: true }),
		],
		["availability", () => updateMenuAvailability(1, false)],
		["delete", () => deleteMenu(1)],
		["status", () => updateOrderStatus(7, "ready")],
	])("sends cookies and a fresh CSRF token for %s", async (_, action) => {
		fetchMock
			.mockResolvedValueOnce(Response.json({ csrfToken: "csrf" }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		await action();
		expect(fetchMock.mock.calls[0][0]).toMatch(/\/csrf-token$/);
		for (const [, init] of fetchMock.mock.calls)
			expect(init?.credentials).toBe("include");
		const headers = new Headers(fetchMock.mock.calls[1][1]?.headers);
		expect(headers.get("X-CSRF-Token")).toBe("csrf");
		expect(headers.has("Authorization")).toBe(false);
	});

	it("fetches QR data with the cookie but without a CSRF request for GET", async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ token: "qr", expires_at: "later" }),
		);
		await getQRToken();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][1]).toMatchObject({
			credentials: "include",
			cache: "no-store",
			redirect: "error",
		});
	});

	it.each([
		{},
		{ csrfToken: "" },
		null,
	])("does not send the mutation when CSRF response is invalid: %j", async (data) => {
		fetchMock.mockResolvedValueOnce(Response.json(data));
		await expect(deleteMenu(1)).rejects.toThrow("CSRF応答");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not send the mutation when CSRF retrieval fails", async () => {
		fetchMock.mockRejectedValueOnce(new TypeError("offline"));
		await expect(deleteMenu(1)).rejects.toThrow("offline");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("signals expired authentication for a protected 401", async () => {
		const listener = vi.fn();
		window.addEventListener(SESSION_EXPIRED_EVENT, listener);
		try {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
			await expect(authenticatedFetch("/orders/1")).rejects.toMatchObject({
				status: 401,
			});
			expect(listener).toHaveBeenCalledTimes(1);
		} finally {
			window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
		}
	});

	it("distinguishes CSRF failure from denied permissions and never retries a mutation", async () => {
		const listener = vi.fn();
		window.addEventListener(SESSION_EXPIRED_EVENT, listener);
		try {
			fetchMock
				.mockResolvedValueOnce(Response.json({ csrfToken: "csrf" }))
				.mockResolvedValueOnce(
					Response.json({ code: "CSRF_INVALID" }, { status: 403 }),
				);
			await expect(deleteMenu(1)).rejects.toMatchObject({
				code: "CSRF_INVALID",
			});
			expect(fetchMock).toHaveBeenCalledTimes(2);
			expect(listener).not.toHaveBeenCalled();
			fetchMock.mockResolvedValueOnce(
				Response.json({ code: "FORBIDDEN" }, { status: 403 }),
			);
			await expect(getCurrentUser()).rejects.toMatchObject({ status: 403 });
			expect(listener).not.toHaveBeenCalled();
		} finally {
			window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
		}
	});

	it("accepts authenticated users regardless of role", async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json({ csrfToken: "csrf" }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockResolvedValueOnce(
				Response.json({
					user: { id: "1", username: "viewer", role: "viewer" },
				}),
			);
		await expect(
			createSession({ username: "viewer", password: "password" }),
		).resolves.toEqual({ id: "1", username: "viewer" });
	});

	it("requires server confirmation of logout and sends CSRF", async () => {
		fetchMock
			.mockResolvedValueOnce(Response.json({ csrfToken: "csrf" }))
			.mockResolvedValueOnce(new Response(null, { status: 500 }));
		const listener = vi.fn();
		window.addEventListener(SESSION_EXPIRED_EVENT, listener);
		try {
			await expect(logout()).rejects.toThrow("ログアウトできません");
			expect(listener).not.toHaveBeenCalled();
			fetchMock
				.mockResolvedValueOnce(Response.json({ csrfToken: "new-csrf" }))
				.mockResolvedValueOnce(new Response(null, { status: 204 }));
			await logout();
			expect(listener).toHaveBeenCalledTimes(1);
			expect(fetchMock.mock.calls[3][0]).toMatch(/\/logout$/);
			expect(
				new Headers(fetchMock.mock.calls[3][1]?.headers).get("X-CSRF-Token"),
			).toBe("new-csrf");
		} finally {
			window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
		}
	});

	it.each([
		"https://evil.example/api",
		"//evil.example/api",
		"/../outside",
		"/\\evil.example/api",
	])("rejects non-API paths before fetching: %s", async (path) => {
		await expect(authenticatedFetch(path)).rejects.toThrow("パスが不正");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("allows only local staff destinations after login", () => {
		expect(loginDestination("/monitor")).toBe("/monitor");
		expect(loginDestination("https://evil.example")).toBe("/staff");
		expect(loginDestination("//evil.example")).toBe("/staff");
	});
});
