export function CustomerHeader() {
	return (
		<>
			{/* ===== HERO SECTION ===== */}
			<div className="relative z-10 px-6 md:px-12 pt-14 pb-10 max-w-[1400px] mx-auto">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-40">
					{/* Title Group */}
					<div>
						{/* Badge */}
						<div className="inline-flex items-center gap-1.5 bg-[rgba(236,72,153,0.15)] border border-[rgba(236,72,153,0.4)] text-[#f472b6] text-[11px] font-bold tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-full mb-5 -ml-3.5">
							<span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
							MUSIC LOUNGE
						</div>

						<h1 className="text-5xl md:text-[64px] font-extrabold tracking-tight bg-gradient-to-r from-[#a78bfa] via-[#ec4899] to-[#fb923c] bg-clip-text text-transparent leading-[1.05] mb-1">
							Tech Club
						</h1>
						<p className="text-gray-100 text-base font-medium mb-4">
							音楽とテクノロジーが織りなす新しい体験を。
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
