export function CustomerFooter() {
	return (
		<footer className="relative z-10 mt-5 md:mt-8 border-t border-[rgba(255,255,255,0.08)] px-6 lg:px-12 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-4 min-h-24 lg:min-h-0 text-left lg:text-center">
			<p className="text-[11px] text-zinc-500">
				ご注文ありがとうございます。ご不明な点はスタッフまでお声がけください。
			</p>
			<p className="text-[10px] text-zinc-600 mt-2">
				&copy; {new Date().getFullYear()} KTC Order App
			</p>
		</footer>
	);
}
