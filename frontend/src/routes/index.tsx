import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	BellRing,
	Check,
	CheckCircle2,
	Clock,
	Disc,
	Minus,
	Music,
	Plus,
	PlusCircle,
	RotateCw,
	Sparkles,
	Ticket,
	ToggleLeft,
	ToggleRight,
	Trash2,
	Volume2,
	X,
} from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type Cart,
	changeCartQuantity,
	getCartSummary,
	type Menu,
} from "../cart";

export const Route = createFileRoute("/")({ component: App });

// Interfaces
interface OrderItem {
	id: number;
	order_id: number;
	menu_id: number;
	menu: Menu;
	quantity: number;
	price: number;
}

interface Order {
	id: number;
	status: string;
	created_at: string;
	order_items: OrderItem[];
}

interface OrderSession {
	token: string;
	expiresAt: string;
}

// Dummy Now Playing Tracks for Music Bar vibe
const TRACKS = [
	{
		title: "Midnight Horizon",
		artist: "DJ Neon Shimmer",
		genre: "Deep House",
		bpm: 124,
	},
	{
		title: "Lost in Echoes",
		artist: "Lofi Dreamer",
		genre: "Chillhop",
		bpm: 82,
	},
	{
		title: "Liquid Sunshine",
		artist: "Groove Syndicate",
		genre: "Nu-Jazz",
		bpm: 115,
	},
	{
		title: "Neon Reflections",
		artist: "Synthwave Rider",
		genre: "Retrowave",
		bpm: 110,
	},
];

function App() {
	const [menus, setMenus] = useState<Menu[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
	const [cart, setCart] = useState<Cart>({});
	const [mode, setMode] = useState<"customer" | "staff" | "monitor">(
		"customer",
	);
	const [activeCategory, _setActiveCategory] = useState<string>("all");
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [orderSession, setOrderSession] = useState<OrderSession | null>(null);
	const [orderAccessStatus, setOrderAccessStatus] = useState<
		"checking" | "valid" | "missing" | "invalid"
	>("checking");
	const [staffKey, setStaffKey] = useState(() =>
		typeof window === "undefined"
			? ""
			: window.sessionStorage.getItem("staff_access_key") || "",
	);
	const [qrImage, setQrImage] = useState("");
	const [qrExpiresAt, setQrExpiresAt] = useState("");
	const [qrLoading, setQrLoading] = useState(false);

	// Staff Mode States
	const [newMenuName, setNewMenuName] = useState("");
	const [newMenuPrice, setNewMenuPrice] = useState("");
	const [submittingMenu, setSubmittingMenu] = useState(false);

	// Music Simulator
	const [trackIndex, setTrackIndex] = useState(0);
	const [isPlaying] = useState(true);

	// Order Success Modal State
	const [successModal, setSuccessModal] = useState<{
		show: boolean;
		orderId: number | null;
	}>({
		show: false,
		orderId: null,
	});

	// Notification Toast
	const [toast, setToast] = useState<{
		message: string;
		type: "success" | "error" | "info";
	} | null>(null);

	// Track newly called ready orders to trigger a visual or sound alert
	const prevReadyIdsRef = useRef<number[]>([]);

	// Dynamic API Base Resolver
	const getApiBase = () => {
		if (typeof window !== "undefined") {
			return `http://${window.location.hostname}:8080/api`;
		}
		return "http://localhost:8080/api";
	};
	const API_BASE = getApiBase();

	useEffect(() => {
		const exchangeOrderToken = async () => {
			const params = new URLSearchParams(window.location.search);
			const qrToken = params.get("order_token");

			if (!qrToken) {
				const saved = window.sessionStorage.getItem("order_session");
				if (saved) {
					try {
						const session = JSON.parse(saved) as OrderSession;
						if (new Date(session.expiresAt).getTime() > Date.now()) {
							setOrderSession(session);
							setOrderAccessStatus("valid");
							return;
						}
					} catch {
						// Invalid stored data is discarded below.
					}
					window.sessionStorage.removeItem("order_session");
				}
				setOrderAccessStatus("missing");
				return;
			}

			try {
				const response = await fetch(
					`${API_BASE}/order-access/session?token=${encodeURIComponent(qrToken)}`,
					{ method: "POST" },
				);
				if (!response.ok) throw new Error("invalid QR token");
				const data = await response.json();
				const session = {
					token: data.session_token as string,
					expiresAt: data.expires_at as string,
				};
				window.sessionStorage.setItem("order_session", JSON.stringify(session));
				setOrderSession(session);
				setOrderAccessStatus("valid");

				params.delete("order_token");
				const query = params.toString();
				window.history.replaceState(
					{},
					"",
					`${window.location.pathname}${query ? `?${query}` : ""}`,
				);
			} catch {
				setOrderAccessStatus("invalid");
			}
		};

		void exchangeOrderToken();
	}, [API_BASE]);

	const showToast = useCallback(
		(message: string, type: "success" | "error" | "info" = "success") => {
			setToast({ message, type });
			setTimeout(() => setToast(null), 3000);
		},
		[],
	);

	// Fetch Data
	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const menuRes = await fetch(`${API_BASE}/menus`);
			if (!menuRes.ok) throw new Error("メニューの取得に失敗しました");
			const menuData = await menuRes.json();
			setMenus(menuData.data || []);

			const orderRes = await fetch(`${API_BASE}/orders`);
			if (!orderRes.ok) throw new Error("注文履歴の取得に失敗しました");
			const orderData = await orderRes.json();

			const newOrders = orderData.orders || [];
			setOrders(newOrders);

			// Monitor logic: Detect if new orders became "ready" to flash
			const currentReadyIds = newOrders
				.filter((o: Order) => o.status === "ready")
				.map((o: Order) => o.id);
			const newlyAdded = currentReadyIds.filter(
				(id: number) => !prevReadyIdsRef.current.includes(id),
			);
			if (newlyAdded.length > 0 && mode === "monitor") {
				// Sound simulator or notification flash
				showToast(
					`オーダー番号 #${newlyAdded.join(", #")} ができあがりました！`,
					"info",
				);
			}
			prevReadyIdsRef.current = currentReadyIds;
		} catch (err: unknown) {
			console.error(err);
			setError(
				err instanceof Error
					? err.message
					: String(err) || "サーバーとの通信中にエラーが発生しました",
			);
		} finally {
			setLoading(false);
		}
	}, [
		API_BASE,
		mode, // Sound simulator or notification flash
		showToast,
	]);

	useEffect(() => {
		fetchData();
		// Poll orders every 4 seconds for immediate monitor updates
		const interval = setInterval(async () => {
			try {
				const orderRes = await fetch(`${API_BASE}/orders`);
				if (orderRes.ok) {
					const orderData = await orderRes.json();
					const newOrders = orderData.orders || [];
					setOrders(newOrders);

					const currentReadyIds = newOrders
						.filter((o: Order) => o.status === "ready")
						.map((o: Order) => o.id);
					const newlyAdded = currentReadyIds.filter(
						(id: number) => !prevReadyIdsRef.current.includes(id),
					);
					if (newlyAdded.length > 0) {
						// Synthesize sound cue if supported
						if (typeof window !== "undefined" && "speechSynthesis" in window) {
							const utterance = new SpeechSynthesisUtterance(
								`オーダー番号、${newlyAdded.join("番、")}、できあがりました。`,
							);
							utterance.lang = "ja-JP";
							window.speechSynthesis.speak(utterance);
						}
					}
					prevReadyIdsRef.current = currentReadyIds;
				}
			} catch (_e) {
				// Silently fail polling
			}
		}, 4000);

		return () => clearInterval(interval);
	}, [API_BASE, fetchData]);

	// Rotate tracks automatically
	useEffect(() => {
		if (!isPlaying) return;
		const timer = setInterval(() => {
			setTrackIndex((prev) => (prev + 1) % TRACKS.length);
		}, 20000);
		return () => clearInterval(timer);
	}, [isPlaying]);

	// Category classifier
	const getCategory = (_menuName: string): string => {
		return "non-alc";
	};

	// Add to Cart
	const addToCart = (menu: Menu) => {
		if (!menu.is_available) {
			showToast("このメニューは現在売り切れです", "error");
			return;
		}
		setCart((prev) => {
			const current = prev[menu.id];
			return {
				...prev,
				[menu.id]: {
					menu,
					quantity: current ? current.quantity + 1 : 1,
				},
			};
		});
		showToast(`${menu.name} をカートに追加しました`);
	};

	// Update Cart Quantity
	const updateCartQty = (menuId: number, delta: number) => {
		setCart((prev) => changeCartQuantity(prev, menuId, delta));
	};

	// Remove from Cart
	const removeFromCart = (menuId: number) => {
		setCart((prev) => {
			const copy = { ...prev };
			delete copy[menuId];
			return copy;
		});
	};

	// Submit Order
	const submitOrder = async () => {
		const items = Object.values(cart);
		if (items.length === 0) return;
		if (
			!orderSession ||
			new Date(orderSession.expiresAt).getTime() <= Date.now()
		) {
			setOrderAccessStatus("invalid");
			showToast("注文用QRコードをもう一度読み取ってください", "error");
			return;
		}

		setLoading(true);
		try {
			const payload = {
				items: items.map((item) => ({
					menu_id: item.menu.id,
					quantity: item.quantity,
				})),
			};

			const response = await fetch(`${API_BASE}/orders`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Order-Session": orderSession.token,
				},
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const resData = await response.json();
				if (resData.id) {
					setSuccessModal({ show: true, orderId: resData.id });
				} else {
					showToast(
						"注文は完了しましたが、オーダー番号を取得できませんでした。",
						"info",
					);
				}
				setCart({});
				// Reload orders
				const orderRes = await fetch(`${API_BASE}/orders`);
				const orderData = await orderRes.json();
				setOrders(orderData.orders || []);
			} else {
				const errorData = await response.json();
				if (response.status === 401) {
					window.sessionStorage.removeItem("order_session");
					setOrderSession(null);
					setOrderAccessStatus("invalid");
				}
				showToast(errorData.error || "注文の送信に失敗しました", "error");
			}
		} catch (err) {
			console.error(err);
			showToast("通信エラーが発生しました", "error");
		} finally {
			setLoading(false);
		}
	};

	const generateOrderQR = useCallback(async () => {
		if (!staffKey) {
			showToast("スタッフキーを入力してください", "error");
			return;
		}

		setQrLoading(true);
		try {
			const response = await fetch(`${API_BASE}/order-access/qr`, {
				headers: { "X-Staff-Key": staffKey },
			});
			if (!response.ok) throw new Error("スタッフキーが正しくありません");
			const data = await response.json();
			const orderURL = new URL(window.location.origin);
			orderURL.searchParams.set("order_token", data.token);
			setQrImage(
				await QRCode.toDataURL(orderURL.toString(), { width: 280, margin: 2 }),
			);
			setQrExpiresAt(data.expires_at);
			window.sessionStorage.setItem("staff_access_key", staffKey);
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : "QRコードの発行に失敗しました",
				"error",
			);
		} finally {
			setQrLoading(false);
		}
	}, [API_BASE, showToast, staffKey]);

	useEffect(() => {
		if (!qrImage || !qrExpiresAt || !staffKey) return;
		const delay = Math.max(
			new Date(qrExpiresAt).getTime() - Date.now() + 1000,
			1000,
		);
		const timer = window.setTimeout(() => void generateOrderQR(), delay);
		return () => window.clearTimeout(timer);
	}, [generateOrderQR, qrExpiresAt, qrImage, staffKey]);

	// Staff: Update Order Status
	const handleUpdateStatus = async (orderId: number, status: string) => {
		try {
			const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status }),
			});
			if (!res.ok) throw new Error("ステータス更新に失敗しました");

			let msg = "";
			if (status === "ready")
				msg = `オーダー番号 #${orderId} を「お呼び出し中」にしました`;
			if (status === "completed")
				msg = `オーダー番号 #${orderId} を「提供完了」にしました`;
			showToast(msg);

			// Refresh orders
			const orderRes = await fetch(`${API_BASE}/orders`);
			const orderData = await orderRes.json();
			setOrders(orderData.orders || []);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	// Staff: Add Menu
	const handleAddMenu = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMenuName || !newMenuPrice) return;
		setSubmittingMenu(true);
		try {
			const price = parseInt(newMenuPrice, 10);
			if (Number.isNaN(price) || price <= 0)
				throw new Error("価格は正の数値で入力してください");

			const res = await fetch(`${API_BASE}/menus`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newMenuName,
					price,
					is_available: true,
				}),
			});

			if (!res.ok) throw new Error("メニューの作成に失敗しました");

			showToast(`${newMenuName} を追加しました`);
			setNewMenuName("");
			setNewMenuPrice("");

			// Refresh menus
			const menuRes = await fetch(`${API_BASE}/menus`);
			const menuData = await menuRes.json();
			setMenus(menuData.data || []);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		} finally {
			setSubmittingMenu(false);
		}
	};

	// Staff: Toggle Availability
	const handleToggleAvailable = async (menu: Menu) => {
		try {
			const res = await fetch(`${API_BASE}/menus/${menu.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					is_available: !menu.is_available,
				}),
			});
			if (!res.ok) throw new Error("更新に失敗しました");
			showToast(
				`${menu.name} を ${!menu.is_available ? "販売中" : "売り切れ"} に変更しました`,
			);

			// Refresh menus
			const menuRes = await fetch(`${API_BASE}/menus`);
			const menuData = await menuRes.json();
			setMenus(menuData.data || []);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	// Staff: Delete Menu
	const handleDeleteMenu = async (menuId: number) => {
		if (!window.confirm("このメニューを削除してよろしいですか？")) return;
		try {
			const res = await fetch(`${API_BASE}/menus/${menuId}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("削除に失敗しました");
			showToast("メニューを削除しました", "info");

			// Refresh menus
			const menuRes = await fetch(`${API_BASE}/menus`);
			const menuData = await menuRes.json();
			setMenus(menuData.data || []);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : String(err), "error");
		}
	};

	// Helpers
	const { total: cartTotal, count: cartCount } = getCartSummary(cart);

	const getOrderTotal = (order: Order) => {
		return order.order_items
			? order.order_items.reduce(
					(sum, item) => sum + item.price * item.quantity,
					0,
				)
			: 0;
	};
	const getOrderItemsCount = (order: Order) => {
		return order.order_items
			? order.order_items.reduce((sum, item) => sum + item.quantity, 0)
			: 0;
	};

	const activeTrack = TRACKS[trackIndex];

	// Filter orders for Monitor Screen
	const preparingOrders = orders.filter((o) => o.status === "pending");
	const readyOrders = orders.filter((o) => o.status === "ready");

	// Emoji icon mapping for known drinks
	const getDrinkEmoji = (name: string) => {
		if (name.includes("コーラ") || name.includes("Cola")) return "🥤";
		if (name.includes("グレープ") || name.includes("Grape")) return "🍇";
		if (name.includes("オレンジ") || name.includes("Orange")) return "🍊";
		if (name.includes("サイダー") || name.includes("Cider")) return "🫧";
		if (name.includes("アップル") || name.includes("Apple")) return "🍎";
		if (name.includes("ジュース") || name.includes("Juice")) return "🧃";
		return "🥤";
	};

	// English name mapping
	const getDrinkEnglish = (name: string) => {
		if (name.includes("コーラ")) return "Cola";
		if (name.includes("ファンタグレープ")) return "Fanta Grape";
		if (name.includes("ファンタオレンジ")) return "Fanta Orange";
		if (name.includes("三ツ矢サイダー")) return "Mitsuya Cider";
		if (name.includes("アップルジュース")) return "Apple Juice";
		if (name.includes("オレンジジュース")) return "Orange Juice";
		return "";
	};

	// Icon bg color mapping
	const getDrinkIconBg = (name: string) => {
		if (name.includes("コーラ")) return "bg-[rgba(120,53,15,0.3)]";
		if (name.includes("グレープ")) return "bg-[rgba(168,85,247,0.25)]";
		if (name.includes("オレンジ")) return "bg-[rgba(251,146,60,0.2)]";
		if (name.includes("サイダー")) return "bg-[rgba(59,130,246,0.18)]";
		if (name.includes("アップル")) return "bg-red-500/20";
		if (name.includes("ジュース")) return "bg-yellow-500/20";
		return "bg-pink-500/20";
	};

	return (
		<div className="relative min-h-screen bg-[#0a0a12] text-white overflow-x-hidden font-['Hiragino_Sans','Yu_Gothic',sans-serif] selection:bg-pink-500/30">
			{/* Background gradients */}
			<div
				className="fixed inset-0 pointer-events-none z-0"
				style={{
					background: `
						radial-gradient(ellipse 700px 400px at 15% 10%, rgba(168,85,247,0.25), transparent 60%),
						radial-gradient(ellipse 600px 500px at 90% 20%, rgba(236,72,153,0.20), transparent 60%),
						radial-gradient(ellipse 500px 400px at 50% 90%, rgba(59,130,246,0.12), transparent 60%)
					`,
				}}
			/>
			{/* Grid overlay */}
			<div
				className="fixed top-0 left-0 right-0 h-[520px] pointer-events-none z-0"
				style={{
					backgroundImage: `
						linear-gradient(rgba(236,72,153,0.10) 1px, transparent 1px),
						linear-gradient(90deg, rgba(236,72,153,0.10) 1px, transparent 1px)
					`,
					backgroundSize: "48px 48px",
					maskImage: "linear-gradient(to bottom, black 0%, transparent 90%)",
					WebkitMaskImage:
						"linear-gradient(to bottom, black 0%, transparent 90%)",
				}}
			/>

			{/* Toast Notification */}
			{toast && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
					<div
						className={`px-6 py-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border text-sm font-semibold flex items-center gap-2 backdrop-blur-md transition-all
							${toast.type === "success" ? "bg-emerald-950/90 border-emerald-500 text-emerald-300" : ""}
							${toast.type === "error" ? "bg-rose-950/90 border-rose-500 text-rose-300" : ""}
							${toast.type === "info" ? "bg-sky-950/90 border-sky-500 text-sky-300 animate-pulse" : ""}
						`}
					>
						{toast.type === "success" && (
							<Check size={16} className="text-emerald-400" />
						)}
						{toast.type === "error" && (
							<AlertCircle size={16} className="text-rose-400" />
						)}
						{toast.type === "info" && (
							<BellRing size={16} className="text-sky-400 animate-bounce" />
						)}
						<span>{toast.message}</span>
					</div>
				</div>
			)}

			{/* Order Success Modal */}
			{successModal.show && successModal.orderId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
					<div className="bg-[#14141e] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(236,72,153,0.15)]">
						<button
							type="button"
							onClick={() => setSuccessModal({ show: false, orderId: null })}
							className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition cursor-pointer"
						>
							<X size={20} />
						</button>
						<div className="h-16 w-16 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-400">
							<Ticket size={32} className="animate-pulse" />
						</div>
						<h2 className="text-2xl font-black text-white">
							ご注文ありがとうございます！
						</h2>
						<p className="text-sm text-zinc-400 mt-2">
							ドリンクの準備を進めております。以下のオーダー番号をお控えください。
						</p>
						<div className="my-6 bg-[#0a0a12] border border-white/8 p-6 rounded-2xl">
							<p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">
								あなたのオーダー番号
							</p>
							<div className="flex justify-center">
								<span className="text-5xl font-black text-white tracking-wider bg-[#14141e] border border-pink-500/40 px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.15)]">
									#{successModal.orderId}
								</span>
							</div>
							<p className="text-[11px] text-zinc-500 mt-4 leading-relaxed">
								※モニター画面で番号が「お呼び出し中
								(Ready)」になりましたら、カウンターへお越しください。
							</p>
						</div>
						<button
							type="button"
							onClick={() => setSuccessModal({ show: false, orderId: null })}
							className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-xl shadow-[0_4px_20px_rgba(236,72,153,0.35)] transition cursor-pointer"
						>
							確認して閉じる
						</button>
					</div>
				</div>
			)}

			{/* ===== HERO SECTION ===== */}
			<div className="relative z-10 px-6 md:px-12 pt-14 pb-10 max-w-[1400px] mx-auto">
				{/* Now Playing - Moved to Top Right */}
				<div className="absolute top-4 right-4 md:top-10 md:right-12 z-50 flex items-center gap-4 bg-[rgba(20,20,30,0.85)] border border-[rgba(236,72,153,0.4)] rounded-full md:rounded-2xl pr-5 pl-2 py-2 md:px-6 md:py-4 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.15)] max-w-[75vw] md:max-w-none transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(236,72,153,0.25)]">
					{/* Stylish Spinning Record / Circle */}
					<div className="relative flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
						{/* Spinning Tail & Glow */}
						<div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_50%,rgba(236,72,153,0.2)_80%,#ec4899_100%)] animate-[spin_1.5s_linear_infinite]">
							{/* Glowing Dot at the tip */}
							<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px] w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full shadow-[0_0_12px_2px_#ec4899]" />
						</div>
						{/* Inner Center */}
						<div className="absolute inset-[2.5px] md:inset-[3px] bg-[#0a0a12] rounded-full flex items-center justify-center border border-pink-500/20 shadow-[inset_0_0_10px_rgba(236,72,153,0.2)]">
							<Disc
								size={16}
								className="text-pink-400 md:hidden animate-[pulse_2s_ease-in-out_infinite]"
							/>
							<Disc
								size={18}
								className="text-pink-400 hidden md:block animate-[pulse_2s_ease-in-out_infinite]"
							/>
						</div>
					</div>

					<div className="overflow-hidden select-none">
						<div className="flex items-center gap-2 mb-0.5">
							{/* Mini Equalizer Bars */}
							<div className="flex items-end gap-[2px] h-2.5">
								<div
									className="w-[2.5px] h-[80%] bg-pink-500 rounded-t-sm animate-[bounce_1s_infinite_ease-in-out]"
									style={{ animationDelay: "0.1s" }}
								/>
								<div
									className="w-[2.5px] h-[60%] bg-purple-400 rounded-t-sm animate-[bounce_1s_infinite_ease-in-out]"
									style={{ animationDelay: "0.4s" }}
								/>
								<div
									className="w-[2.5px] h-full bg-pink-400 rounded-t-sm animate-[bounce_1s_infinite_ease-in-out]"
									style={{ animationDelay: "0.2s" }}
								/>
							</div>
							<p className="text-[10px] md:text-[11px] text-[#f472b6] font-bold tracking-[0.1em] uppercase">
								NOW PLAYING
							</p>
						</div>
						<p className="text-[13px] md:text-[15px] font-semibold text-white truncate max-w-[120px] md:max-w-[180px]">
							{activeTrack.title}
						</p>
						<p className="text-[11px] md:text-xs text-[#a1a1aa] truncate max-w-[120px] md:max-w-[180px] flex items-center">
							{activeTrack.artist}{" "}
							<span className="text-pink-500/60 ml-2 font-mono text-[10px]">
								{activeTrack.bpm} BPM
							</span>
						</p>
					</div>
				</div>

				<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-40">
					{/* Title Group */}
					<div>
						{/* Badge */}
						<div className="inline-flex items-center gap-1.5 bg-[rgba(236,72,153,0.15)] border border-[rgba(236,72,153,0.4)] text-[#f472b6] text-[11px] font-bold tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-full mb-5">
							<span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
							MUSIC LOUNGE
						</div>

						<h1 className="text-5xl md:text-[64px] font-extrabold tracking-tight bg-gradient-to-r from-[#a78bfa] via-[#ec4899] to-[#fb923c] bg-clip-text text-transparent leading-[1.05] mb-3">
							Tech Club
						</h1>
						<p className="text-[#a1a1aa] text-base">
							音楽とテクノロジーが織りなす新しい体験を。
						</p>
					</div>

					{/* Mode Buttons */}
					<div className="flex gap-3 flex-wrap justify-end">
						<button
							type="button"
							onClick={() => setMode("customer")}
							className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer
								${
									mode === "customer"
										? "bg-gradient-to-br from-[#ec4899] to-[#db2777] text-white shadow-[0_4px_20px_rgba(236,72,153,0.35)] border-none"
										: "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#e4e4e7] hover:bg-[rgba(255,255,255,0.08)]"
								}`}
						>
							👤 顧客メニュー
						</button>
						<button
							type="button"
							onClick={() => setMode("staff")}
							className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer
								${
									mode === "staff"
										? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] border-none"
										: "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#e4e4e7] hover:bg-[rgba(255,255,255,0.08)]"
								}`}
						>
							⚙ スタッフ画面
						</button>
						<button
							type="button"
							onClick={() => setMode("monitor")}
							className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer
								${
									mode === "monitor"
										? "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] border-none"
										: "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#e4e4e7] hover:bg-[rgba(255,255,255,0.08)]"
								}`}
						>
							📺 サイネージモニター
						</button>
					</div>
				</div>
			</div>

			{/* ===== MAIN CONTENT ===== */}
			<main className="relative z-10 px-6 md:px-12 pb-32 lg:pb-16 max-w-[1400px] mx-auto">
				{error && (
					<div className="bg-[rgba(20,20,30,0.6)] border border-rose-800/80 rounded-2xl p-4 text-rose-300 flex items-center gap-3 mb-8 backdrop-blur-md">
						<AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
						<div>
							<p className="font-bold text-sm">システムエラー</p>
							<p className="text-xs text-rose-400/90">{error}</p>
						</div>
						<button
							type="button"
							onClick={fetchData}
							className="ml-auto bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
						>
							<RotateCw size={12} />
							再試行
						</button>
					</div>
				)}

				{/* ===== 1. CUSTOMER MODE ===== */}
				{mode === "customer" && (
					<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
						{orderAccessStatus !== "valid" && (
							<div className="lg:col-span-2 bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 text-amber-200">
								<p className="font-bold">
									店頭の注文用QRコードを読み取ってください
								</p>
								<p className="text-xs text-amber-300/70 mt-1">
									{orderAccessStatus === "checking"
										? "注文セッションを確認しています…"
										: "QRコードは10分ごとに更新されます。期限切れの場合は、最新のQRコードを読み取ってください。"}
								</p>
							</div>
						)}
						{/* Menu Grid */}
						<div>
							{loading && menus.length === 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{[1, 2, 3, 4].map((n) => (
										<div
											key={n}
											className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] h-[220px] rounded-2xl animate-pulse"
										/>
									))}
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{menus
										.filter(
											(menu) =>
												activeCategory === "all" ||
												getCategory(menu.name) === activeCategory,
										)
										.map((menu, index) => {
											const inCart = cart[menu.id];
											const emoji = getDrinkEmoji(menu.name);
											const englishName = getDrinkEnglish(menu.name);
											const iconBg = getDrinkIconBg(menu.name);
											const isFeatured = index === 1; // second item featured like mockup
											return (
												<div
													key={menu.id}
													className={`relative bg-gradient-to-br from-[rgba(255,255,255,0.045)] to-[rgba(255,255,255,0.015)] border rounded-[16px] p-6 flex flex-col justify-between transition-colors duration-200 group
														${
															menu.is_available
																? isFeatured
																	? "border-[rgba(236,72,153,0.55)] shadow-[0_0_24px_rgba(236,72,153,0.12)]"
																	: "border-[rgba(255,255,255,0.08)] hover:border-[rgba(236,72,153,0.4)]"
																: "border-white/5 opacity-50"
														}`}
												>
													{/* Emoji Icon */}
													<div
														className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] mb-4 ${iconBg}`}
													>
														{emoji}
													</div>

													{/* Name */}
													<h3 className="text-[17px] font-semibold text-white mb-1">
														{menu.name.split(" (")[0]}
													</h3>
													{englishName && (
														<p className="text-xs text-[#71717a] mb-[14px]">
															{englishName}
														</p>
													)}

													{/* Price */}
													<p className="text-[20px] font-bold text-[#f472b6] mb-[18px]">
														¥{menu.price.toLocaleString()}
													</p>

													{/* Add / Quantity */}
													{!menu.is_available ? (
														<span className="text-[13px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/60 px-3 py-3 rounded-[10px] text-center w-full block">
															SOLD OUT
														</span>
													) : inCart ? (
														<div className="flex items-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-[10px] p-1.5 w-full justify-between">
															<button
																type="button"
																onClick={() => updateCartQty(menu.id, -1)}
																className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
															>
																<Minus size={14} />
															</button>
															<span className="px-3 text-[13px] font-bold text-white min-w-[20px] text-center">
																{inCart.quantity}
															</span>
															<button
																type="button"
																onClick={() => updateCartQty(menu.id, 1)}
																className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
															>
																<Plus size={14} />
															</button>
														</div>
													) : (
														<button
															type="button"
															onClick={() => addToCart(menu)}
															className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-[#e4e4e7] text-[13px] font-semibold py-3 rounded-[10px] transition hover:bg-gradient-to-br hover:from-[#ec4899] hover:to-[#db2777] hover:text-white hover:border-transparent hover:shadow-[0_4px_16px_rgba(236,72,153,0.35)] flex items-center justify-center gap-2 cursor-pointer"
														>
															＋ カートに追加
														</button>
													)}
												</div>
											);
										})}
								</div>
							)}

							{/* Customer Order Tracking */}
							<section className="mt-8 bg-[rgba(20,20,30,0.6)] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 backdrop-blur-sm">
								<div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 mb-6">
									<div>
										<h2 className="text-[16px] font-bold text-white flex items-center gap-2">
											<Clock size={16} className="text-[#f472b6]" />
											Live 注文ステータス
										</h2>
										<p className="text-[11px] text-zinc-500 mt-1">
											モニターで番号が「お呼び出し中
											(Ready)」になりましたらお受け取りください。
										</p>
									</div>
									<button
										type="button"
										onClick={fetchData}
										className="text-[13px] text-zinc-400 hover:text-white flex items-center gap-1.5 transition border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] px-3 py-2 rounded-[10px] cursor-pointer"
									>
										<RotateCw size={13} />
										更新
									</button>
								</div>
								{orders.length === 0 ? (
									<div className="py-8 text-center text-zinc-500 text-xs">
										注文した履歴はありません。
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
										{orders
											.filter((o) => o.status !== "completed")
											.slice()
											.reverse()
											.map((order) => {
												const total = getOrderTotal(order);
												const count = getOrderItemsCount(order);
												return (
													<div
														key={order.id}
														className={`bg-[rgba(255,255,255,0.045)] border rounded-[16px] p-5 flex flex-col justify-between transition-all
															${
																order.status === "ready"
																	? "border-[rgba(236,72,153,0.55)] shadow-[0_0_24px_rgba(236,72,153,0.12)]"
																	: "border-[rgba(255,255,255,0.08)]"
															}`}
													>
														<div className="flex justify-between items-center border-b border-white/8 pb-3 mb-3">
															<span
																className={`text-lg font-black tracking-wider px-3.5 py-1 rounded-[10px]
																${
																	order.status === "ready"
																		? "text-white bg-pink-500/20 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
																		: "text-pink-400 bg-pink-950/20 border border-pink-500/20"
																}`}
															>
																#{order.id}
															</span>
															<div className="flex items-center gap-1 text-[11px] text-zinc-500">
																<Clock size={12} />
																<span>
																	{new Date(
																		order.created_at || Date.now(),
																	).toLocaleTimeString()}
																</span>
															</div>
														</div>
														<div className="space-y-2 max-h-36 overflow-y-auto pr-1 mb-3 custom-scrollbar">
															{order.order_items?.map((item) => (
																<div
																	key={item.id}
																	className="flex justify-between items-center text-xs"
																>
																	<span className="text-white font-semibold truncate max-w-[160px]">
																		{item.menu.name}
																	</span>
																	<span className="text-zinc-400 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded text-[11px]">
																		x {item.quantity}
																	</span>
																</div>
															))}
														</div>
														<div className="flex justify-between text-[13px] font-bold text-zinc-400 mb-3 border-t border-white/8 pt-3">
															<span>{count}点</span>
															<span className="text-white">
																¥{total.toLocaleString()}
															</span>
														</div>
														<div className="flex justify-between items-center">
															<p className="text-[11px] text-zinc-500">
																{order.status === "ready"
																	? "カウンターでお受け取りください！"
																	: "準備中です..."}
															</p>
															{order.status === "pending" ? (
																<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-950/50 border border-amber-600/30 text-amber-400 animate-pulse">
																	準備中
																</span>
															) : (
																<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-[rgba(236,72,153,0.2)] border border-[rgba(236,72,153,0.5)] text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-bounce">
																	<BellRing
																		size={12}
																		className="animate-spin"
																	/>
																	お呼び出し中
																</span>
															)}
														</div>
													</div>
												);
											})}
									</div>
								)}
							</section>
						</div>

						{/* Cart Tray */}
						<div className="fixed bottom-0 left-0 right-0 z-40 p-4 lg:relative lg:p-0 lg:z-auto pointer-events-none lg:pointer-events-auto">
							<div className="bg-[rgba(20,20,30,0.95)] lg:bg-[rgba(20,20,30,0.6)] border border-[rgba(255,255,255,0.08)] rounded-[18px] p-6 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.4)] lg:shadow-none lg:sticky lg:top-6 pointer-events-auto max-h-[50vh] lg:max-h-none flex flex-col h-fit">
								{/* Tray Header */}
								<div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)] mb-5 flex-shrink-0">
									<h2 className="text-[16px] font-bold text-white flex items-center gap-2">
										🛍 注文トレイ
									</h2>
									<span className="text-[#f472b6] font-semibold text-[16px]">
										({cartCount})
									</span>
								</div>

								{cartCount === 0 ? (
									<div className="flex flex-col items-center text-center py-10 px-3">
										<div className="w-16 h-16 rounded-full border border-dashed border-[rgba(236,72,153,0.4)] flex items-center justify-center mb-5 text-[#f472b6] text-2xl animate-[pulse_2.4s_ease-in-out_infinite]">
											◎
										</div>
										<p className="text-[15px] font-semibold text-white mb-2">
											トレイは空です
										</p>
										<p className="text-[13px] text-[#a1a1aa] leading-[1.6]">
											レコードメニューからドリンクを選んでカートに入れてください。
										</p>
									</div>
								) : (
									<div className="flex flex-col flex-grow overflow-hidden">
										<div className="space-y-3 overflow-y-auto pr-1 flex-grow mb-5 custom-scrollbar">
											{Object.values(cart).map((item) => (
												<div
													key={item.menu.id}
													className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-3 flex justify-between items-center"
												>
													<div className="max-w-[130px]">
														<p className="text-[13px] font-semibold text-white truncate mb-0.5">
															{item.menu.name}
														</p>
														<p className="text-[12px] text-[#a1a1aa]">
															¥{item.menu.price.toLocaleString()}
														</p>
													</div>
													<div className="flex items-center gap-2">
														<div className="flex items-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[8px] p-0.5">
															<button
																type="button"
																onClick={() => updateCartQty(item.menu.id, -1)}
																className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white cursor-pointer"
															>
																<Minus size={12} />
															</button>
															<span className="px-2 text-[13px] font-bold text-white min-w-[20px] text-center">
																{item.quantity}
															</span>
															<button
																type="button"
																onClick={() => updateCartQty(item.menu.id, 1)}
																className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white cursor-pointer"
															>
																<Plus size={12} />
															</button>
														</div>
														<button
															type="button"
															onClick={() => removeFromCart(item.menu.id)}
															className="p-2 hover:bg-[rgba(255,255,255,0.05)] text-zinc-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
														>
															<Trash2 size={14} />
														</button>
													</div>
												</div>
											))}
										</div>
										<div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0 text-[14px] text-[#a1a1aa]">
											<span>合計</span>
											<span className="text-[20px] font-bold text-white">
												¥{cartTotal.toLocaleString()}
											</span>
										</div>
										<button
											type="button"
											onClick={submitOrder}
											disabled={loading || orderAccessStatus !== "valid"}
											className="w-full mt-5 bg-gradient-to-br from-[#ec4899] to-[#db2777] hover:opacity-90 text-white font-extrabold py-3.5 rounded-[12px] shadow-[0_4px_20px_rgba(236,72,153,0.35)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[14px] cursor-pointer"
										>
											{loading ? (
												<>
													<RotateCw size={16} className="animate-spin" />{" "}
													注文送信中...
												</>
											) : (
												<>
													<Sparkles size={16} /> 注文を確定する
												</>
											)}
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* ===== 2. STAFF MODE ===== */}
				{mode === "staff" && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-3 bg-[#14141e]/60 border border-emerald-500/20 rounded-2xl p-6">
							<h2 className="text-lg font-bold text-white">
								店頭注文用QRコード
							</h2>
							<p className="text-xs text-zinc-400 mt-1 mb-4">
								QRコードは10分ごとに変わります。期限が来たら再発行してください。
							</p>
							<div className="flex flex-col md:flex-row gap-5 items-start">
								<div className="flex-1 w-full">
									<label className="text-xs text-zinc-400" htmlFor="staff-key">
										スタッフキー
									</label>
									<div className="flex gap-2 mt-2">
										<input
											id="staff-key"
											type="password"
											value={staffKey}
											onChange={(event) => setStaffKey(event.target.value)}
											className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm"
										/>
										<button
											type="button"
											onClick={generateOrderQR}
											disabled={qrLoading}
											className="bg-emerald-600 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
										>
											{qrLoading ? "発行中…" : "QRを発行"}
										</button>
									</div>
								</div>
								{qrImage && (
									<div className="bg-white p-3 rounded-xl text-center">
										<img
											src={qrImage}
											alt="注文ページを開くQRコード"
											className="w-56 h-56"
										/>
										<p className="text-[11px] text-zinc-700 mt-2">
											有効期限: {new Date(qrExpiresAt).toLocaleTimeString()}
										</p>
									</div>
								)}
							</div>
						</div>
						<div className="lg:col-span-2 space-y-6">
							<div className="bg-[#14141e]/40 border border-white/8 rounded-[16px] p-6 backdrop-blur-sm">
								<div className="flex justify-between items-center mb-6">
									<div>
										<h2 className="text-lg font-bold text-white flex items-center gap-2">
											<Volume2 size={18} className="text-emerald-400" />
											受注・進行モニター
										</h2>
										<p className="text-xs text-zinc-400 mt-0.5">
											「準備完了(呼び出し)」 ➡️ 「お渡し完了」の2ステップで処理
										</p>
									</div>
									<div className="flex gap-2">
										<span className="text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 px-3 py-1.5 rounded-full">
											準備中:{" "}
											{orders.filter((o) => o.status === "pending").length}件
										</span>
										<span className="text-xs font-bold bg-pink-950 text-pink-400 border border-pink-800 px-3 py-1.5 rounded-full">
											呼び出し:{" "}
											{orders.filter((o) => o.status === "ready").length}件
										</span>
									</div>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{orders.filter(
										(o) => o.status === "pending" || o.status === "ready",
									).length === 0 ? (
										<div className="md:col-span-2 py-16 text-center text-zinc-500 text-sm flex flex-col items-center justify-center bg-[rgba(255,255,255,0.03)] rounded-[16px] border border-[rgba(255,255,255,0.05)]">
											<Check size={32} className="text-emerald-500/40 mb-3" />
											<p className="font-bold text-zinc-400">
												処理待ちの注文はありません
											</p>
										</div>
									) : (
										orders
											.filter(
												(o) => o.status === "pending" || o.status === "ready",
											)
											.map((order) => {
												const total = getOrderTotal(order);
												const isReady = order.status === "ready";
												return (
													<div
														key={order.id}
														className={`bg-[rgba(255,255,255,0.04)] border rounded-[16px] p-5 flex flex-col justify-between transition relative overflow-hidden ${isReady ? "border-[rgba(236,72,153,0.4)] shadow-[0_0_20px_rgba(236,72,153,0.1)]" : "border-[rgba(255,255,255,0.08)]"}`}
													>
														<div className="flex justify-between items-start mb-3 border-b border-[rgba(255,255,255,0.08)] pb-3">
															<div className="flex items-center gap-2">
																<span
																	className={`text-3xl font-black tracking-wider ${isReady ? "text-[#f472b6]" : "text-amber-400"}`}
																>
																	#{order.id}
																</span>
																<span
																	className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded border ${isReady ? "bg-pink-950/40 border-pink-500/30 text-[#f472b6]" : "bg-amber-950/40 border-amber-500/20 text-amber-400"}`}
																>
																	{isReady ? "呼び出し中" : "準備中"}
																</span>
															</div>
															<span className="text-[11px] text-zinc-500 mt-2.5">
																{new Date(
																	order.created_at || Date.now(),
																).toLocaleTimeString()}
															</span>
														</div>
														<div className="space-y-2 mb-5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
															{order.order_items?.map((item) => (
																<div
																	key={item.id}
																	className="bg-[rgba(255,255,255,0.04)] p-2.5 rounded-[12px] border border-[rgba(255,255,255,0.06)] flex justify-between items-center text-xs"
																>
																	<span className="text-white font-semibold truncate max-w-[140px]">
																		{item.menu.name}
																	</span>
																	<span className="text-zinc-300 font-bold bg-white/5 border border-white/8 px-2 py-1 rounded text-[11px]">
																		x {item.quantity}
																	</span>
																</div>
															))}
														</div>
														<div className="bg-[rgba(255,255,255,0.04)] p-3 rounded-[12px] border border-[rgba(255,255,255,0.06)] flex justify-between text-[13px] text-zinc-400 mb-5">
															<span>合計</span>
															<span className="text-white font-bold">
																¥{total.toLocaleString()}
															</span>
														</div>
														{!isReady ? (
															<button
																type="button"
																onClick={() =>
																	handleUpdateStatus(order.id, "ready")
																}
																className="w-full bg-gradient-to-r from-amber-500 to-[#ec4899] hover:opacity-90 text-white font-extrabold text-[13px] py-3.5 rounded-[12px] shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
															>
																<BellRing
																	size={16}
																	className="animate-bounce"
																/>
																準備完了 ➡️ 呼び出し(Ready)
															</button>
														) : (
															<button
																type="button"
																onClick={() =>
																	handleUpdateStatus(order.id, "completed")
																}
																className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[13px] py-3.5 rounded-[12px] shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition flex items-center justify-center gap-2 cursor-pointer"
															>
																<CheckCircle2 size={16} />
																お渡し完了 (Served)
															</button>
														)}
													</div>
												);
											})
									)}
								</div>
							</div>
							{/* Completed History */}
							<div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 backdrop-blur-sm">
								<h2 className="text-sm font-bold text-zinc-400 mb-4">
									最近の提供完了履歴
								</h2>
								<div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-2">
									{orders.filter((o) => o.status === "completed").length ===
									0 ? (
										<p className="text-xs text-zinc-600 text-center py-4">
											履歴はありません
										</p>
									) : (
										orders
											.filter((o) => o.status === "completed")
											.slice()
											.reverse()
											.map((order) => {
												const total = getOrderTotal(order);
												const count = getOrderItemsCount(order);
												return (
													<div
														key={order.id}
														className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-3 flex justify-between items-center text-xs"
													>
														<div>
															<span className="text-emerald-500 font-bold mr-2">
																#{order.id}
															</span>
															<span className="text-zinc-400">
																{order.order_items
																	?.map(
																		(item) =>
																			`${item.menu.name} x${item.quantity}`,
																	)
																	.join(", ")}
															</span>
															<span className="text-zinc-500 ml-2">
																({count}点 / ¥{total.toLocaleString()})
															</span>
														</div>
														<span className="text-zinc-500 font-medium flex items-center gap-1">
															<Check size={11} className="text-emerald-500" />
															{new Date(
																order.created_at || Date.now(),
															).toLocaleTimeString()}
														</span>
													</div>
												);
											})
									)}
								</div>
							</div>
						</div>
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
											className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-3 flex justify-between items-center"
										>
											<div className="max-w-[140px] overflow-hidden">
												<p className="text-[13px] font-extrabold text-white truncate mb-0.5">
													{menu.name}
												</p>
												<p className="text-[11px] text-zinc-500 font-bold">
													¥{menu.price.toLocaleString()}
												</p>
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
					</div>
				)}

				{/* ===== 3. MONITOR SCREEN ===== */}
				{mode === "monitor" && (
					<div className="bg-[rgba(10,10,18,0.8)] border border-[rgba(255,255,255,0.08)] rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden min-h-[75vh] backdrop-blur-xl">
						<div className="flex flex-col md:flex-row justify-between items-center border-b border-[rgba(255,255,255,0.08)] pb-8 mb-10 gap-6">
							<div>
								<span className="text-[11px] tracking-[0.3em] font-black uppercase text-[#f472b6] bg-pink-950/50 border border-[rgba(236,72,153,0.4)] px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.15)]">
									Now Boarding Drinks
								</span>
								<h2 className="text-4xl font-black text-white mt-4 tracking-tight">
									Order Status Board
								</h2>
							</div>
							<div className="bg-[#0a0a12] border border-[rgba(255,255,255,0.08)] rounded-2xl px-6 py-4 flex items-center gap-4">
								<Music size={24} className="text-[#f472b6] animate-pulse" />
								<div className="text-left">
									<p className="text-[10px] text-[#f472b6] font-bold uppercase tracking-wider mb-1">
										Soundtrack
									</p>
									<p className="text-[15px] font-extrabold text-white truncate max-w-[180px]">
										{activeTrack.title}
									</p>
								</div>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative min-h-[500px]">
							<div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[rgba(255,255,255,0.08)]" />
							{/* Preparing */}
							<div className="space-y-8 text-center md:text-left">
								<div className="flex items-center justify-center md:justify-start gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
									<div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
									<h3 className="text-[20px] font-black tracking-wider text-amber-400 uppercase">
										Preparing / 準備中
									</h3>
								</div>
								{preparingOrders.length === 0 ? (
									<div className="h-64 flex items-center justify-center text-zinc-600 text-[15px] italic font-medium">
										準備中のオーダーはありません
									</div>
								) : (
									<div className="grid grid-cols-3 sm:grid-cols-4 gap-5 justify-items-center md:justify-items-start">
										{preparingOrders.map((order) => (
											<div
												key={order.id}
												className="w-24 h-24 bg-[#0a0a12] border border-amber-600/10 rounded-[20px] flex items-center justify-center text-3xl font-black text-zinc-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-pulse"
											>
												#{order.id}
											</div>
										))}
									</div>
								)}
							</div>
							{/* Ready */}
							<div className="space-y-8 text-center md:text-left">
								<div className="flex items-center justify-center md:justify-start gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4">
									<div className="h-3 w-3 rounded-full bg-[#ec4899] animate-ping" />
									<h3 className="text-[20px] font-black tracking-wider text-[#f472b6] uppercase flex items-center gap-2">
										Ready to Pick Up / お呼び出し
									</h3>
								</div>
								{readyOrders.length === 0 ? (
									<div className="h-64 flex items-center justify-center text-zinc-600 text-[15px] italic font-medium">
										お呼び出し中のオーダーはありません
									</div>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center md:justify-items-start">
										{readyOrders.map((order) => (
											<div
												key={order.id}
												className="w-32 h-32 bg-gradient-to-br from-pink-950/30 to-purple-950/30 border-2 border-[rgba(236,72,153,0.6)] text-5xl font-black text-white rounded-[24px] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.3)] relative overflow-hidden animate-[pulse_1.5s_infinite]"
											>
												<span className="text-[11px] font-black text-[#f472b6] uppercase tracking-widest mb-1.5">
													Order
												</span>
												<span className="drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
													#{order.id}
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<div className="mt-16 bg-[#0a0a12] border border-[rgba(255,255,255,0.08)] p-5 rounded-2xl flex items-center gap-4 max-w-[800px] mx-auto">
							<Sparkles size={20} className="text-[#f472b6] flex-shrink-0" />
							<p className="text-[14px] text-zinc-400 text-left leading-normal font-semibold">
								画面の「Ready to Pick Up /
								お呼び出し」に番号が表示されたお客様は、バーカウンターまでお越しください。
							</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
