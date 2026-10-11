// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MenuGrid } from "./MenuGrid";

afterEach(cleanup);
it("uses saved promotions rather than menu position, supports both badges, and removes them", () => {
	const menu = {
		id: 1,
		name: "コーラ",
		price: 200,
		is_available: true,
		is_recommended: true,
		is_featured: true,
	};
	const props = {
		loading: false,
		cart: {},
		addToCart: vi.fn(),
		updateCartQty: vi.fn(),
	};
	const { rerender } = render(<MenuGrid {...props} menus={[menu]} />);
	expect(
		within(screen.getByRole("article")).getByText("おすすめ"),
	).toBeTruthy();
	expect(screen.getByText("イチオシ")).toBeTruthy();
	expect(screen.getByRole("article").className).toContain("club-card-featured");
	rerender(
		<MenuGrid
			{...props}
			menus={[
				{ ...menu, is_recommended: false, is_featured: false },
				{ ...menu, id: 2, is_recommended: false, is_featured: false },
			]}
		/>,
	);
	for (const article of screen.getAllByRole("article"))
		expect(within(article).queryByText("おすすめ")).toBeNull();
	expect(screen.queryByText("イチオシ")).toBeNull();
	for (const article of screen.getAllByRole("article"))
		expect(article.className).not.toContain("club-card-featured");
	rerender(<MenuGrid {...props} menus={[{ ...menu, is_available: false }]} />);
	expect(screen.getByText("SOLD OUT")).toBeTruthy();
	expect(screen.queryByRole("button", { name: "コーラをカートに追加" })).toBeNull();
});

it("filters recommendations using saved settings, including after a refresh", () => {
	const menus = [
		{
			id: 1,
			name: "コーラ",
			price: 200,
			is_available: true,
			is_recommended: false,
		},
		{
			id: 2,
			name: "リンゴ",
			price: 200,
			is_available: true,
			is_recommended: true,
		},
	];
	const props = {
		loading: false,
		cart: {},
		addToCart: vi.fn(),
		updateCartQty: vi.fn(),
	};
	const { rerender } = render(<MenuGrid {...props} menus={menus} />);
	fireEvent.click(screen.getByRole("button", { name: "おすすめ" }));
	expect(screen.queryByRole("heading", { name: "コーラ" })).toBeNull();
	expect(screen.getByRole("heading", { name: "リンゴ" })).toBeTruthy();
	rerender(
		<MenuGrid
			{...props}
			menus={menus.map((menu) => ({
				...menu,
				is_recommended: !menu.is_recommended,
			}))}
		/>,
	);
	expect(screen.getByRole("heading", { name: "コーラ" })).toBeTruthy();
	expect(screen.queryByRole("heading", { name: "リンゴ" })).toBeNull();
});
