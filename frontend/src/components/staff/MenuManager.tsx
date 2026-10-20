import { ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import type { Menu } from "../../cart";
export function MenuManager({
	menus,
	handleToggleAvailable,
	handleDeleteMenu,
	handleTogglePromotion,
	updatingPromotion,
}: {
	menus: Menu[];
	updatingPromotion: number | null;
	handleTogglePromotion: (
		menu: Menu,
		field: "is_recommended" | "is_featured",
	) => Promise<void>;
	handleToggleAvailable: (menu: Menu) => Promise<void>;
	handleDeleteMenu: (id: number) => Promise<void>;
}) {
	return (
		<>
			{/* Menu Editor Sidebar */}
			<div className="space-y-6">
				<div className="bg-[#14141e]/40 border border-white/8 rounded-[16px] p-6 backdrop-blur-sm">
					<h2 className="text-[15px] font-bold text-white flex items-center gap-2 mb-5 border-b border-[rgba(255,255,255,0.08)] pb-4">
						メニュー在庫コントロール
					</h2>
					<div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
						{menus.map((menu) => (
							<div
								key={menu.id}
								className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-3 flex flex-wrap justify-between items-center gap-3"
							>
								<div className="max-w-[140px] overflow-hidden">
									<p className="text-[13px] font-extrabold text-white truncate mb-0.5">
										{menu.name}
									</p>
									<p className="text-[11px] text-zinc-500 font-bold">
										¥{menu.price.toLocaleString()}
									</p>
								</div>
								<div className="flex gap-2 w-full order-last">
									{(["is_recommended", "is_featured"] as const).map((field) => (
										<button
											key={field}
											type="button"
											aria-label={`${menu.name}の${field === "is_recommended" ? "おすすめ" : "イチオシ"}`}
											aria-pressed={!!menu[field]}
											disabled={updatingPromotion !== null}
											onClick={() => handleTogglePromotion(menu, field)}
											className={`flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition disabled:opacity-50 ${menu[field] ? "border-pink-400 text-pink-300 bg-pink-500/15" : "border-white/10 text-zinc-400 hover:bg-white/5"}`}
										>
											{field === "is_recommended" ? "おすすめ" : "イチオシ"}
											{menu[field] ? " ON" : " OFF"}
										</button>
									))}
								</div>
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => handleToggleAvailable(menu)}
										className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${menu.is_available ? "text-emerald-400 hover:bg-emerald-950/40" : "text-rose-500 hover:bg-rose-950/40"}`}
										title={
											menu.is_available
												? "販売を一時停止する"
												: "販売を再開する"
										}
									>
										{menu.is_available ? (
											<ToggleRight size={22} />
										) : (
											<ToggleLeft size={22} />
										)}
									</button>
									<button
										type="button"
										onClick={() => handleDeleteMenu(menu.id)}
										className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] text-zinc-600 hover:text-rose-400 rounded-[8px] transition cursor-pointer"
										title="削除"
									>
										<Trash2 size={15} />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
