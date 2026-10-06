import { PlusCircle, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import type { Menu } from "../../cart";
export function MenuManager({
	menus,
	newMenuName,
	setNewMenuName,
	newMenuPrice,
	setNewMenuPrice,
	submittingMenu,
	handleAddMenu,
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
	newMenuName: string;
	setNewMenuName: (value: string) => void;
	newMenuPrice: string;
	setNewMenuPrice: (value: string) => void;
	submittingMenu: boolean;
	handleAddMenu: (event: FormEvent) => Promise<void>;
	handleToggleAvailable: (menu: Menu) => Promise<void>;
	handleDeleteMenu: (id: number) => Promise<void>;
}) {
	return (
		<>
			{/* Menu Editor Sidebar */}
			<div className="space-y-6">
				<div className="bg-[#14141e]/40 border border-white/8 rounded-[16px] p-6 backdrop-blur-sm">
					<h2 className="text-[15px] font-bold text-white flex items-center gap-2 mb-5">
						<PlusCircle size={16} className="text-emerald-400" />
						メニューの追加
					</h2>
					<form onSubmit={handleAddMenu} className="space-y-4">
						<div>
							<label
								htmlFor="menuName"
								className="block text-[12px] font-bold text-zinc-400 mb-2"
							>
								メニュー名
							</label>
							<input
								id="menuName"
								type="text"
								placeholder="例: 特製ジントニック"
								value={newMenuName}
								onChange={(e) => setNewMenuName(e.target.value)}
								className="w-full bg-[#0a0a12] border border-[rgba(255,255,255,0.1)] rounded-[12px] px-4 py-3 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
								required
							/>
						</div>
						<div>
							<label
								htmlFor="menuPrice"
								className="block text-[12px] font-bold text-zinc-400 mb-2"
							>
								価格 (¥)
							</label>
							<input
								id="menuPrice"
								type="number"
								placeholder="400"
								value={newMenuPrice}
								onChange={(e) => setNewMenuPrice(e.target.value)}
								className="w-full bg-[#0a0a12] border border-[rgba(255,255,255,0.1)] rounded-[12px] px-4 py-3 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
								required
							/>
						</div>
						<button
							type="submit"
							disabled={submittingMenu}
							className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[13px] py-3.5 rounded-[12px] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.35)] cursor-pointer"
						>
							{submittingMenu ? "追加中..." : "メニューリストに登録"}
						</button>
					</form>
				</div>
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
