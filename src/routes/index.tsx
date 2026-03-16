import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Rows3, ScanSearch, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

const quickFacts = [
	{
		label: "Retrieval modes",
		value: "3",
		copy: "Keyword, vector, and hybrid all stay in one workflow.",
		tone: "border-[color:oklch(83%_0.03_55)] bg-[oklch(98%_0.012_70)] [&_[data-slot=badge]]:bg-[oklch(94%_0.03_70)] [&_[data-slot=badge]]:text-[oklch(39%_0.08_55)]",
	},
	{
		label: "Browse paths",
		value: "2",
		copy: "Jump into a collection or browse the entire vault without a query.",
		tone: "border-[color:oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)] [&_[data-slot=badge]]:bg-[oklch(94%_0.025_145)] [&_[data-slot=badge]]:text-[oklch(37%_0.065_145)]",
	},
	{
		label: "Chosen layout",
		value: "Workbench",
		copy: "The calmer tabbed layout is now the single search experience.",
		tone: "border-[color:oklch(83%_0.03_35)] bg-[oklch(98%_0.014_35)] [&_[data-slot=badge]]:bg-[oklch(94%_0.03_35)] [&_[data-slot=badge]]:text-[oklch(40%_0.085_35)]",
	},
] as const;

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<main className="min-h-screen bg-[#fbfafa] text-foreground">
			<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="overflow-hidden rounded-[2rem] border border-[oklch(86%_0.025_60)] bg-background shadow-sm">
					<div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:p-8">
						<div className="min-w-0">
							<Badge
								variant="outline"
								className="border-[oklch(82%_0.035_55)] bg-[oklch(96%_0.025_70)] text-[oklch(40%_0.09_55)]"
							>
								<ScanSearch data-icon="inline-start" />
								Vault search
							</Badge>
							<h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
								Search the vault from one focused workbench.
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-[oklch(44%_0.02_68)] sm:text-base">
								The prototype phase is over. The Search Two layout won, so the
								app now opens straight into that calmer workbench for browsing
								collections, tuning retrieval, and previewing notes.
							</p>
							<div className="mt-6 flex flex-wrap gap-2">
								<Link
									to="/search"
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({ variant: "default" }),
										"border-[oklch(55%_0.09_145)] bg-[oklch(53%_0.1_145)] text-[oklch(98%_0.01_145)] hover:bg-[oklch(49%_0.09_145)]",
									)}
								>
									Open search
									<ArrowRight data-icon="inline-end" />
								</Link>
							</div>
						</div>

						<Card className="relative self-start overflow-hidden border-none bg-[oklch(97%_0.012_145)] shadow-none ring-0">
							<div className="pointer-events-none absolute right-0 top-0 size-28 rounded-full bg-[oklch(90%_0.04_145)] blur-2xl" />
							<CardHeader>
								<CardTitle>What changed</CardTitle>
								<CardDescription className="text-[oklch(41%_0.02_145)]">
									Everything now points to one production search route.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<Alert className="border-[oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)]">
									<Rows3 />
									<AlertTitle>One clear path</AlertTitle>
									<AlertDescription>
										The five-way prototype chooser is gone. `/search` is now the
										single home for vault retrieval.
									</AlertDescription>
								</Alert>
								<Alert className="border-[oklch(84%_0.03_55)] bg-[oklch(98%_0.012_70)]">
									<Sparkles />
									<AlertTitle>Less setup, faster entry</AlertTitle>
									<AlertDescription>
										The landing page is now just an entry point with a short
										explanation instead of a route catalog.
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
								<CardTitle className="flex items-center justify-between gap-3 text-3xl">
									<span>{fact.value}</span>
									<Badge variant="secondary">{fact.label}</Badge>
								</CardTitle>
								<CardDescription>{fact.copy}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</section>
			</section>
		</main>
	);
}
