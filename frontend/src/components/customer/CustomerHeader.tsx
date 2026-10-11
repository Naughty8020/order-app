import { AudioLines } from "lucide-react";
export function CustomerHeader() {
	return (
		<header className="club-hero">
			<div className="club-hero-content">
				<div className="club-lounge-badge">
					<AudioLines size={20} aria-hidden="true" /> MUSIC LOUNGE
				</div>
				<h1>Tech Club</h1>
				<p>
					音楽とテクノロジーが織りなす
					<br />
					新しい体験を。
				</p>
			</div>
		</header>
	);
}
