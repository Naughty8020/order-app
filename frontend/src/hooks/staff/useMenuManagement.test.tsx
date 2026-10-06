// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { updateMenuPromotion } from "../../api/menu";
import { MenuManager } from "../../components/staff/MenuManager";
import { useMenuManagement } from "./useMenuManagement";

vi.mock("../../api/menu", () => ({
	createMenu: vi.fn(),
	deleteMenu: vi.fn(),
	updateMenuAvailability: vi.fn(),
	updateMenuPromotion: vi.fn(),
}));
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});
it("lets staff toggle either promotion and reports save failures", async () => {
	const refresh = vi.fn(async () => {});
	const toast = vi.fn();
	function Manager() {
		const state = useMenuManagement(refresh, toast);
		return (
			<MenuManager
				{...state}
				menus={[
					{
						id: 7,
						name: "コーラ",
						price: 200,
						is_available: true,
						is_recommended: true,
						is_featured: false,
					},
				]}
			/>
		);
	}
	render(<Manager />);
	expect(
		screen
			.getByRole("button", { name: "コーラのおすすめ" })
			.getAttribute("aria-pressed"),
	).toBe("true");
	fireEvent.click(screen.getByRole("button", { name: "コーラのおすすめ" }));
	await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
	expect(updateMenuPromotion).toHaveBeenCalledWith(7, "is_recommended", false);
	await waitFor(() =>
		expect(
			(
				screen.getByRole("button", {
					name: "コーラのイチオシ",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false),
	);
	vi.mocked(updateMenuPromotion).mockRejectedValueOnce(new Error("保存失敗"));
	fireEvent.click(screen.getByRole("button", { name: "コーラのイチオシ" }));
	await waitFor(() => expect(toast).toHaveBeenCalledWith("保存失敗", "error"));
	expect(updateMenuPromotion).toHaveBeenLastCalledWith(7, "is_featured", true);
	expect(refresh).toHaveBeenCalledTimes(1);
});
