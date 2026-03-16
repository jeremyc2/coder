import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Command,
	PanelRight,
	Rows4,
	ScanSearch,
	SquareKanban,
	Table2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { defaultSearchLabRouteState } from "@/lib/search-lab";
import { cn } from "@/lib/utils";

const prototypeCards = [
	{
		to: "/search-one",
		title: "Search One",
		copy: "Editorial split view with a persistent preview panel and collection rail.",
		icon: PanelRight,
		cardTone: "border-[color:oklch(84%_0.03_55)] bg-[oklch(98%_0.012_70)]",
		buttonTone:
			"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)] hover:bg-[oklch(94%_0.02_70)]",
		iconTone: "text-[oklch(48%_0.11_55)]",
	},
	{
		to: "/search-two",
		title: "Search Two",
		copy: "Workbench layout with tabs, metrics, and a calmer control deck.",
		icon: SquareKanban,
		cardTone: "border-[color:oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)]",
		buttonTone:
			"border-[oklch(81%_0.026_145)] bg-[oklch(97%_0.01_145)] text-[oklch(32%_0.04_145)] hover:bg-[oklch(94%_0.016_145)]",
		iconTone: "text-[oklch(43%_0.08_145)]",
	},
	{
		to: "/search-three",
		title: "Search Three",
		copy: "Command-centered layout that feels like a launcher for note retrieval.",
		icon: Command,
		cardTone: "border-[color:oklch(84%_0.03_35)] bg-[oklch(98%_0.014_35)]",
		buttonTone:
			"border-[oklch(82%_0.028_35)] bg-[oklch(97%_0.012_35)] text-[oklch(39%_0.07_35)] hover:bg-[oklch(94%_0.02_35)]",
		iconTone: "text-[oklch(49%_0.12_35)]",
	},
	{
		to: "/search-four",
		title: "Search Four",
		copy: "Table-first prototype for operational scanning and fast inspection.",
		icon: Table2,
		cardTone: "border-[color:oklch(83%_0.025_85)] bg-[oklch(98%_0.012_85)]",
		buttonTone:
			"border-[oklch(82%_0.026_85)] bg-[oklch(97%_0.012_85)] text-[oklch(37%_0.06_85)] hover:bg-[oklch(94%_0.018_85)]",
		iconTone: "text-[oklch(49%_0.09_85)]",
	},
	{
		to: "/search-five",
		title: "Search Five",
		copy: "Compact mobile-friendly comparison with results and preview tabs.",
		icon: Rows4,
		cardTone: "border-[color:oklch(84%_0.025_115)] bg-[oklch(98%_0.012_115)]",
		buttonTone:
			"border-[oklch(82%_0.022_115)] bg-[oklch(97%_0.012_115)] text-[oklch(34%_0.045_115)] hover:bg-[oklch(94%_0.018_115)]",
		iconTone: "text-[oklch(43%_0.075_115)]",
	},
] as const;

export const Route = createFileRoute("/search")({
	component: SearchHub,
});

function SearchHub() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="rounded-[2rem] border border-[oklch(86%_0.025_60)] bg-background p-6 shadow-sm">
					<div className="max-w-3xl">
						<div className="inline-flex items-center gap-2 rounded-full border border-[oklch(82%_0.035_55)] bg-[oklch(96%_0.025_70)] px-3 py-1 text-xs text-[oklch(40%_0.09_55)]">
							<ScanSearch data-icon="inline-start" />
							QMD search prototypes
						</div>
						<h1 className="mt-3 text-4xl font-semibold tracking-tight">
							Five search pages, one retrieval lab.
						</h1>
						<p className="mt-3 text-sm leading-6 text-[oklch(44%_0.02_68)] sm:text-base">
							Each route shares the same QMD capabilities but frames them very
							differently so you can compare the ergonomics, hierarchy, and note
							preview patterns side by side.
						</p>
						<div className="mt-5 flex flex-wrap gap-2">
							<Link
								to="/search-one"
								search={defaultSearchLabRouteState}
								className={cn(
									buttonVariants({ variant: "default" }),
									"border-[oklch(62%_0.11_50)] bg-[oklch(60%_0.13_50)] text-[oklch(98%_0.01_80)] hover:bg-[oklch(56%_0.12_50)]",
								)}
							>
								Start with search one
							</Link>
							<Link
								to="/"
								className={cn(
									buttonVariants({ variant: "outline" }),
									"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)] hover:bg-[oklch(94%_0.02_70)]",
								)}
							>
								Back home
							</Link>
						</div>
					</div>
				</header>

				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{prototypeCards.map((card) => (
						<Card key={card.to} className={cn("h-full", card.cardTone)}>
							<CardHeader>
								<div className="flex items-center justify-between gap-3">
									<card.icon className={card.iconTone} />
									<Link
										to={card.to}
										search={defaultSearchLabRouteState}
										className={cn(
											buttonVariants({ variant: "ghost", size: "sm" }),
											card.buttonTone,
										)}
									>
										Open
										<ArrowRight data-icon="inline-end" />
									</Link>
								</div>
								<CardTitle>{card.title}</CardTitle>
								<CardDescription>{card.copy}</CardDescription>
							</CardHeader>
							<CardContent>
								<Link
									to={card.to}
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"w-full",
										card.buttonTone,
									)}
								>
									Explore this prototype
								</Link>
							</CardContent>
						</Card>
					))}
				</section>
			</section>
		</main>
	);
}
