// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SESSION_EXPIRED_EVENT } from "../../api/auth";
import { SessionControls } from "./SessionControls";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	navigate.mockReset();
});
function mount() {
	render(
		<SessionControls user={{ id: "1", username: "user" }} returnTo="/monitor">
			<p>Protected content</p>
		</SessionControls>,
	);
}
it("hides content and returns to login when the session expires", () => {
	mount();
	act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));
	expect(screen.queryByText("Protected content")).toBeNull();
	expect(navigate).toHaveBeenCalledWith({
		to: "/login",
		search: { redirect: "/monitor" },
		replace: true,
	});
});
it("keeps the session UI on logout failure", async () => {
	vi.stubGlobal(
		"fetch",
		vi
			.fn()
			.mockResolvedValueOnce(Response.json({ csrfToken: "csrf" }))
			.mockResolvedValueOnce(new Response(null, { status: 500 })),
	);
	mount();
	fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
	expect(await screen.findByRole("alert")).toBeTruthy();
	expect(screen.getByText("Protected content")).toBeTruthy();
	expect(navigate).not.toHaveBeenCalled();
});
