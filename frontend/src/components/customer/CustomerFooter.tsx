export function CustomerFooter() {
	return (
		<footer className="relative z-10 mt-12 border-t border-[rgba(255,255,255,0.08)] px-6 md:px-12 pt-6 pb-28 lg:pb-8 text-center">
			<p className="text-[11px] text-zinc-500">
				ご注文ありがとうございます。ご不明な点はスタッフまでお声がけください。
			</p>
			<p className="text-[10px] text-zinc-600 mt-2">
				&copy; {new Date().getFullYear()} KTC Order App
			</p>
		</footer>
	);
}
