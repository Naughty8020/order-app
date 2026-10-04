// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, it, vi } from "vitest";
import { requireSession } from "./requireSession";

const fetchMock = vi.fn<typeof fetch>();
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

function setup(path: string) {
	vi.stubGlobal("fetch", fetchMock);
	const root = createRootRoute();
	const loader = vi.fn();
	const routes = [
		createRoute({ getParentRoute: () => root, path: "/" }),
		createRoute({
			getParentRoute: () => root,
			path: "/login",
			validateSearch: (search) => ({ redirect: search.redirect }),
		}),
		...(["/staff", "/monitor"] as const).map((destination) =>
			createRoute({
				getParentRoute: () => root,
				path: destination,
				beforeLoad: ({ abortController }) =>
					requireSession(destination, abortController.signal),
				loader,
			}),
		),
	];
	return {
		router: createRouter({
			routeTree: root.addChildren(routes),
			history: createMemoryHistory({ initialEntries: [path] }),
			isServer: false,
		}),
		loader,
	};
}

it.each([
	"/staff",
	"/monitor",
])("redirects unauthenticated direct access to %s before loading data", async (path) => {
	fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
	const { router, loader } = setup(path);
	await router.load();
	expect(router.state.location.pathname).toBe("/login");
	expect(router.state.location.search).toEqual({ redirect: path });
	expect(loader).not.toHaveBeenCalled();
});

it("leaves public routes open and checks authentication on client navigation", async () => {
	const { router, loader } = setup("/");
	await router.load();
	expect(fetchMock).not.toHaveBeenCalled();
	fetchMock.mockResolvedValue(
		Response.json({ user: { id: "1", username: "user" } }),
	);
	await router.navigate({ to: "/staff" });
	expect(router.state.location.pathname).toBe("/staff");
	expect(loader).toHaveBeenCalledOnce();
	expect(router.state.matches.at(-1)?.context).toMatchObject({
		user: { id: "1", username: "user" },
	});
	fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
	await router.navigate({ to: "/monitor" });
	expect(router.state.location.pathname).toBe("/login");
	expect(loader).toHaveBeenCalledOnce();
});

it("does not load protected data on connection failure and supports retry", async () => {
	const { router, loader } = setup("/staff");
	fetchMock.mockRejectedValueOnce(new TypeError("offline"));
	await router.load();
	expect(loader).not.toHaveBeenCalled();
	expect(router.state.matches.at(-1)?.status).toBe("error");
	fetchMock.mockResolvedValue(
		Response.json({ user: { id: "1", username: "user", role: "viewer" } }),
	);
	await router.invalidate();
	expect(loader).toHaveBeenCalledOnce();
});
