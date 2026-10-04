export function CustomerBackground() {
	return (
		<>
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
		</>
	);
}
