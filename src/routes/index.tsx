import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Command,
	Database,
	FolderSearch2,
	LayoutPanelLeft,
	Rows3,
	ScanSearch,
	Sparkles,
	Table2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { defaultSearchLabRouteState } from "@/lib/search-lab";
import { cn } from "@/lib/utils";

const prototypeCards = [
	{
		to: "/search-one",
		title: "Search One",
		kicker: "Split view",
		copy: "Editorial layout with a persistent preview beside the result queue.",
		icon: LayoutPanelLeft,
		cardTone: "border-[color:oklch(84%_0.03_55)] bg-[oklch(98%_0.012_70)]",
		chipTone: "bg-[oklch(95%_0.03_70)] text-[oklch(39%_0.08_55)]",
		iconTone: "bg-[oklch(93%_0.04_70)] text-[oklch(48%_0.11_55)]",
	},
	{
		to: "/search-two",
		title: "Search Two",
		kicker: "Workbench",
		copy: "Metrics and tabs up top, with a calmer control surface for comparison.",
		icon: Rows3,
		cardTone: "border-[color:oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)]",
		chipTone: "bg-[oklch(95%_0.025_145)] text-[oklch(38%_0.065_145)]",
		iconTone: "bg-[oklch(93%_0.03_145)] text-[oklch(44%_0.08_145)]",
	},
	{
		to: "/search-three",
		title: "Search Three",
		kicker: "Command deck",
		copy: "Command-palette framing for quick scanning and opening notes.",
		icon: Command,
		cardTone: "border-[color:oklch(84%_0.03_35)] bg-[oklch(98%_0.014_35)]",
		chipTone: "bg-[oklch(95%_0.03_35)] text-[oklch(41%_0.085_35)]",
		iconTone: "bg-[oklch(93%_0.04_35)] text-[oklch(50%_0.12_35)]",
	},
	{
		to: "/search-four",
		title: "Search Four",
		kicker: "Operations table",
		copy: "Table-first layout for title, path, and score-heavy evaluation.",
		icon: Table2,
		cardTone: "border-[color:oklch(83%_0.025_85)] bg-[oklch(98%_0.012_85)]",
		chipTone: "bg-[oklch(95%_0.028_85)] text-[oklch(41%_0.075_85)]",
		iconTone: "bg-[oklch(93%_0.035_85)] text-[oklch(49%_0.09_85)]",
	},
	{
		to: "/search-five",
		title: "Search Five",
		kicker: "Compact compare",
		copy: "A tighter, more mobile-friendly layout with results and preview tabs.",
		icon: FolderSearch2,
		cardTone: "border-[color:oklch(84%_0.025_115)] bg-[oklch(98%_0.012_115)]",
		chipTone: "bg-[oklch(95%_0.022_115)] text-[oklch(38%_0.06_115)]",
		iconTone: "bg-[oklch(93%_0.026_115)] text-[oklch(43%_0.075_115)]",
	},
] as const;

const quickFacts = [
	{
		label: "Retrieval modes",
		value: "3",
		copy: "Keyword, vector, and hybrid search all wired into the same lab.",
		icon: ScanSearch,
		tone: "border-[color:oklch(83%_0.03_55)] bg-[oklch(98%_0.012_70)] [&_[data-slot=badge]]:bg-[oklch(94%_0.03_70)] [&_[data-slot=badge]]:text-[oklch(39%_0.08_55)] [&_svg]:text-[oklch(48%_0.11_55)]",
	},
	{
		label: "Prototype routes",
		value: "5",
		copy: "Five distinct visual systems so the differences are easy to feel.",
		icon: Sparkles,
		tone: "border-[color:oklch(83%_0.03_35)] bg-[oklch(98%_0.014_35)] [&_[data-slot=badge]]:bg-[oklch(94%_0.03_35)] [&_[data-slot=badge]]:text-[oklch(40%_0.085_35)] [&_svg]:text-[oklch(49%_0.12_35)]",
	},
	{
		label: "Browse paths",
		value: "2",
		copy: "Jump into a collection or browse recent notes across the full vault.",
		icon: Database,
		tone: "border-[color:oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)] [&_[data-slot=badge]]:bg-[oklch(94%_0.025_145)] [&_[data-slot=badge]]:text-[oklch(37%_0.065_145)] [&_svg]:text-[oklch(43%_0.08_145)]",
	},
] as const;

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="overflow-hidden rounded-[2rem] border border-[oklch(86%_0.025_60)] bg-background shadow-sm">
					<div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:p-8">
						<div className="min-w-0">
							<Badge
								variant="outline"
								className="border-[oklch(82%_0.035_55)] bg-[oklch(96%_0.025_70)] text-[oklch(40%_0.09_55)]"
							>
								<ScanSearch data-icon="inline-start" />
								Vault search lab
							</Badge>
							<h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
								Test the search experience, not just the query engine.
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-[oklch(44%_0.02_68)] sm:text-base">
								This home page is now a front door to the prototypes instead of
								a pile of vibes. Pick a route, compare the layouts, and see
								which search workflow actually helps when you are browsing
								collections, tuning parameters, and opening notes.
							</p>
							<div className="mt-6 flex flex-wrap gap-2">
								<Link
									to="/search"
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({ variant: "default" }),
										"border-[oklch(62%_0.11_50)] bg-[oklch(60%_0.13_50)] text-[oklch(98%_0.01_80)] hover:bg-[oklch(56%_0.12_50)]",
									)}
								>
									Open prototype index
									<ArrowRight data-icon="inline-end" />
								</Link>
								<Link
									to="/search-one"
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)] hover:bg-[oklch(94%_0.02_70)]",
									)}
								>
									Start with search one
								</Link>
							</div>
						</div>

						<Card className="relative self-start overflow-hidden border-none bg-[oklch(96%_0.012_65)] shadow-none ring-0">
							<div className="pointer-events-none absolute right-0 top-0 size-28 rounded-full bg-[oklch(88%_0.05_50)] blur-2xl" />
							<CardHeader>
								<CardTitle>What changed</CardTitle>
								<CardDescription className="text-[oklch(44%_0.02_68)]">
									The landing page is now task-oriented and prototype-first.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<Alert className="border-[oklch(84%_0.03_55)] bg-[oklch(98%_0.012_70)]">
									<ScanSearch />
									<AlertTitle>Sharper entry point</AlertTitle>
									<AlertDescription>
										Shorter copy, clearer actions, and direct links to all five
										search pages.
									</AlertDescription>
								</Alert>
								<Alert className="border-[oklch(84%_0.028_145)] bg-[oklch(98%_0.012_145)]">
									<FolderSearch2 />
									<AlertTitle>Built for comparison</AlertTitle>
									<AlertDescription>
										Each route offers the same QMD surface area with a different
										layout and navigation rhythm.
									</AlertDescription>
								</Alert>
							</CardContent>
						</Card>
					</div>
				</header>

				<section className="grid gap-4 md:grid-cols-3">
					{quickFacts.map((fact) => (
						<Card key={fact.label} className={fact.tone}>
							<CardHeader>
								<div className="flex items-center justify-between gap-3">
									<Badge variant="secondary">{fact.label}</Badge>
									<fact.icon />
								</div>
								<CardTitle className="text-3xl">{fact.value}</CardTitle>
								<CardDescription>{fact.copy}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</section>

				<section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
					<Card>
						<CardHeader>
							<CardTitle>Search prototypes</CardTitle>
							<CardDescription className="text-[oklch(44%_0.02_68)]">
								Same capabilities, intentionally different presentation.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							{prototypeCards.map((prototype) => (
								<Card
									key={prototype.to}
									size="sm"
									className={prototype.cardTone}
								>
									<CardHeader>
										<CardAction>
											<Link
												to={prototype.to}
												search={defaultSearchLabRouteState}
												className={cn(
													buttonVariants({ variant: "outline", size: "sm" }),
													"border-[oklch(80%_0.03_60)] bg-[oklch(96%_0.015_70)] text-[oklch(34%_0.04_55)] shadow-[inset_0_1px_0_0_oklch(100%_0_0/0.65)] hover:bg-[oklch(92%_0.025_60)]",
												)}
											>
												Open
											</Link>
										</CardAction>
										<div className="flex items-center gap-2">
											<div
												className={`flex size-8 items-center justify-center rounded-full ${prototype.iconTone}`}
											>
												<prototype.icon />
											</div>
											<Badge variant="outline" className={prototype.chipTone}>
												{prototype.kicker}
											</Badge>
										</div>
										<CardTitle>{prototype.title}</CardTitle>
										<CardDescription>{prototype.copy}</CardDescription>
									</CardHeader>
								</Card>
							))}
						</CardContent>
					</Card>

					<Card className="border-[oklch(84%_0.025_75)] bg-[oklch(98%_0.01_75)]">
						<CardHeader>
							<CardTitle>Best use for this page</CardTitle>
							<CardDescription className="text-[oklch(44%_0.02_68)]">
								Use the home route as a staging area, not a brochure.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div>
								<div className="text-sm font-medium text-[oklch(34%_0.04_55)]">
									When you are evaluating UI
								</div>
								<p className="mt-1 text-sm text-[oklch(44%_0.02_68)]">
									Click through all five prototypes and compare how browsing,
									parameter controls, and previews feel in each layout.
								</p>
							</div>
							<Separator className="bg-[oklch(86%_0.02_70)]" />
							<div>
								<div className="text-sm font-medium text-[oklch(34%_0.04_55)]">
									When you just want to search
								</div>
								<p className="mt-1 text-sm text-[oklch(44%_0.02_68)]">
									Go straight to the prototype index and pick the route that
									feels closest to the workflow you want to test.
								</p>
							</div>
							<Separator className="bg-[oklch(86%_0.02_70)]" />
							<div className="flex flex-wrap gap-2">
								<Link
									to="/search"
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)] hover:bg-[oklch(94%_0.02_70)]",
									)}
								>
									Prototype index
								</Link>
								<Link
									to="/search-five"
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({ variant: "outline" }),
										"border-[oklch(82%_0.028_35)] bg-[oklch(97%_0.012_35)] text-[oklch(39%_0.07_35)] hover:bg-[oklch(94%_0.02_35)]",
									)}
								>
									Jump to search five
								</Link>
							</div>
						</CardContent>
					</Card>
				</section>
			</section>
		</main>
	);
}
