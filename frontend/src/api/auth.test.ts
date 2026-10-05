import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { authenticatedFetch, getAuthToken, isCurrentToken } from "./auth";
import { createOrder } from "./order";

const token = (exp: number) =>
	`e30.${btoa(JSON.stringify({ exp })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;
const current = () => token(Date.now() / 1000 + 3600);
const values = new Map<string, string>();
const assign = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	values.clear();
	vi.stubGlobal("window", {
		localStorage: {
			getItem: (key: string) => values.get(key) ?? null,
			removeItem: (key: string) => values.delete(key),
		},
		location: { pathname: "/staff", hostname: "localhost", assign },
	});
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockResolvedValue(Response.json({}));
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

it("rejects malformed, missing-expiry and expired tokens", () => {
	for (const value of [
		"abc",
		"e30.e30.signature",
		token(Date.now() / 1000),
		"a.!.b",
	]) {
		expect(isCurrentToken(value)).toBe(false);
		values.set("token", value);
		expect(getAuthToken()).toBeNull();
		expect(values.has("token")).toBe(false);
	}
	expect(isCurrentToken(current())).toBe(true);
});

it("adds the JWT while preserving request headers and body", async () => {
	const jwt = current();
	values.set("token", jwt);
	await authenticatedFetch(
		"/api/menus",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		},
		true,
	);
	const init = fetchMock.mock.calls[0][1];
	expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${jwt}`);
	expect(new Headers(init?.headers).get("Content-Type")).toBe(
		"application/json",
	);
	expect(init?.body).toBe("{}");
});

it("blocks staff mutations without a current token", async () => {
	await expect(
		authenticatedFetch("/api/menus/1", { method: "DELETE" }, true),
	).rejects.toThrow();
	expect(fetchMock).not.toHaveBeenCalled();
	expect(assign).toHaveBeenCalledWith("/login");
});

it("clears rejected JWTs and redirects on 401", async () => {
	values.set("token", current());
	fetchMock.mockResolvedValueOnce(Response.json({}, { status: 401 }));
	await authenticatedFetch("/api/orders");
	expect(values.has("token")).toBe(false);
	expect(assign).toHaveBeenCalledWith("/login");
});

it("keeps JWT login separate from customer order-session rejection", async () => {
	const jwt = current();
	values.set("token", jwt);
	fetchMock.mockResolvedValueOnce(
		Response.json({ error: "invalid session" }, { status: 401 }),
	);
	await createOrder({ items: [{ menu_id: 1, quantity: 1 }] }, "session");
	expect(values.get("token")).toBe(jwt);
	expect(assign).not.toHaveBeenCalled();
	const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
	expect(headers.get("X-Order-Session")).toBe("session");
	expect(headers.has("Authorization")).toBe(false);
});

it("allows public reads without login and works during SSR", async () => {
	await authenticatedFetch("/api/menus");
	expect(assign).not.toHaveBeenCalled();
	vi.stubGlobal("window", undefined);
	expect(getAuthToken()).toBeNull();
});
