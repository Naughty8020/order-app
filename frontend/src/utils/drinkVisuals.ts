const cocktails = [
	{
		name: "シャーリー・テンプル風",
		description: "ノンアルコール。\nコーラの甘さに、フルーツの爽やかな酸味。",
	},
	{
		name: "フルーツ・サイダーポンチ",
		description:
			"ノンアルコール。\nサイダーとフルーツジュースの華やかな味わい。",
	},
	{
		name: "オレンジ・グレープ・フィズ",
		description: "ノンアルコール。\nオレンジとグレープのフルーティーな炭酸。",
	},
	{
		name: "サンライズ風モクテル",
		description: "ノンアルコール。\n朝焼けのような2層の色合いを楽しむ一杯。",
	},
];

export function getDrinkVisual(name: string) {
	const cocktail = cocktails.find((drink) => name.startsWith(drink.name));
	if (cocktail) return { image: null, description: cocktail.description };
	if (/コーラ|cola/i.test(name))
		return {
			image: "cola",
			description: "スッキリとした爽快感。\nどんなシーンにもぴったり。",
		};
	if (/グレープ|grape/i.test(name))
		return { image: "grape", description: "甘くてフルーティーな\n定番の味。" };
	if (/ファンタオレンジ|fanta orange/i.test(name))
		return {
			image: "orange-soda",
			description: "爽やかなオレンジの香りと\n優しい甘さ。",
		};
	if (/サイダー|cider/i.test(name))
		return {
			image: "cider",
			description: "はじける炭酸で\n気分をリフレッシュ。",
		};
	if (/アップル|apple/i.test(name))
		return {
			image: "apple",
			description: "りんごの自然な甘みで\n飲みやすい一杯。",
		};
	if (/オレンジ|orange/i.test(name))
		return {
			image: "orange",
			description: "フレッシュな甘さで\n人気の定番ドリンク。",
		};
	return {
		image: null,
		description: "音楽と一緒に楽しむ、\nお気に入りの一杯。",
	};
}
export const isRecommendedDrink = (name: string) =>
	/オレンジジュース|orange juice/i.test(name);
export const isMocktailDrink = (name: string) =>
	cocktails.some((drink) => name.startsWith(drink.name));
export const isCocktailDrink = (name: string) =>
	isMocktailDrink(name) ||
	/カクテル|cocktail|モヒート|mojito|ジントニック|gin tonic|カシス|ウォッカ|vodka|ラムコーク|ハイボール|highball/i.test(
		name,
	);
