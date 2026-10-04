import type { Order } from "../api/order";
export const getOrderTotal = (order: Order) => {
	return order.order_items
		? order.order_items.reduce(
				(sum, item) => sum + item.price * item.quantity,
				0,
			)
		: 0;
};
export const getOrderItemsCount = (order: Order) => {
	return order.order_items
		? order.order_items.reduce((sum, item) => sum + item.quantity, 0)
		: 0;
};

// Emoji icon mapping for known drinks
export const getDrinkEmoji = (name: string) => {
	if (name.includes("コーラ") || name.includes("Cola")) return "🥤";
	if (name.includes("グレープ") || name.includes("Grape")) return "🍇";
	if (name.includes("オレンジ") || name.includes("Orange")) return "🍊";
	if (name.includes("サイダー") || name.includes("Cider")) return "🫧";
	if (name.includes("アップル") || name.includes("Apple")) return "🍎";
	if (name.includes("ジュース") || name.includes("Juice")) return "🧃";
	return "🥤";
};

// English name mapping
export const getDrinkEnglish = (name: string) => {
	if (name.includes("コーラ")) return "Cola";
	if (name.includes("ファンタグレープ")) return "Fanta Grape";
	if (name.includes("ファンタオレンジ")) return "Fanta Orange";
	if (name.includes("三ツ矢サイダー")) return "Mitsuya Cider";
	if (name.includes("アップルジュース")) return "Apple Juice";
	if (name.includes("オレンジジュース")) return "Orange Juice";
	return "";
};

// Icon bg color mapping
export const getDrinkIconBg = (name: string) => {
	if (name.includes("コーラ")) return "bg-[rgba(120,53,15,0.3)]";
	if (name.includes("グレープ")) return "bg-[rgba(168,85,247,0.25)]";
	if (name.includes("オレンジ")) return "bg-[rgba(251,146,60,0.2)]";
	if (name.includes("サイダー")) return "bg-[rgba(59,130,246,0.18)]";
	if (name.includes("アップル")) return "bg-red-500/20";
	if (name.includes("ジュース")) return "bg-yellow-500/20";
	return "bg-pink-500/20";
};
