import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Braces,
	CornerDownRight,
	Layers3,
	Link2,
	NotebookPen,
	Waypoints,
} from "lucide-react";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const columns = [
		{
			kicker: "Keep",
			title: "The scraps worth saving.",
			copy: "Commands, links, snippets, half-formed ideas, and the line you do not want to reverse-engineer again next week.",
		},
		{
			kicker: "Return",
			title: "A place side quests survive.",
			copy: "Vault keeps rabbit holes warm. You can leave for a while and still find the thread when you come back.",
		},
		{
			kicker: "Blend",
			title: "Useful because it is blurry.",
			copy: "Part dev environment, part notebook, part personal life hack. The best tools usually refuse cleaner categories.",
		},
	];

	const tags = ["private", "searchable", "messy", "useful"];

	return (
		<main className="min-h-screen bg-stone-50 text-stone-950">
			<section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-14 pt-6 sm:px-8 lg:px-10">
				<header className="mb-12 flex items-center justify-between">
					<div className="inline-flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
							<Layers3 className="h-5 w-5 text-amber-900" />
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.34em] text-stone-500">
								Vault
							</p>
							<p className="text-sm text-stone-600">
								For developers who keep notes like contraband
							</p>
						</div>
					</div>

					<div className="hidden rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm text-stone-600 md:block">
						Not sure exactly what this is yet.
					</div>
				</header>

				<section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.82fr)]">
					<div className="max-w-3xl">
						<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
							<Waypoints className="h-4 w-4 text-emerald-700" />
							Development environment? Knowledge base? Why not both?
						</div>

						<h1 className="max-w-3xl text-4xl font-semibold leading-[0.96] tracking-[-0.065em] text-stone-950 sm:text-5xl lg:text-[4.1rem]">
							A private stash for
							<br />
							useful things you
							<br />
							were never supposed
							<br />
							to lose.
						</h1>

						<div className="mt-7 max-w-xl space-y-4">
							<p className="text-base leading-7 text-stone-800 sm:text-lg">
								Vault is intimate on purpose. Less productivity theater, more
								personal utility. The kind of place you leave open all day
								because it quietly earns the tab.
							</p>
							<p className="text-sm leading-7 text-stone-600 sm:text-base">
								For side projects, terminal detours, clever links, scraps of
								prose, and anything too alive for normal note-taking software.
							</p>
						</div>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
							<Link
								to="/search"
								className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-orange-950 transition-colors hover:bg-orange-400"
							>
								Open search
								<ArrowRight className="h-4 w-4" />
							</Link>
							<div className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm text-sky-900">
								<NotebookPen className="h-4 w-4 text-sky-700" />
								Built for notes you keep for fun
							</div>
						</div>
					</div>

					<div className="flex items-end lg:justify-end">
						<div className="w-full max-w-sm rounded-[1.4rem] border border-stone-300 bg-white p-4 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
							<div className="mb-5 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="h-3 w-3 rounded-full bg-rose-400" />
									<span className="h-3 w-3 rounded-full bg-amber-400" />
									<span className="h-3 w-3 rounded-full bg-emerald-500" />
								</div>
								<div className="rounded-full bg-stone-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
									Local stash
								</div>
							</div>

							<div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
								<div>
									<p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
										Current file
									</p>
									<h2 className="mt-3 max-w-60 text-2xl font-semibold leading-tight tracking-[-0.055em] text-stone-950">
										not-sure-what-this-is-yet.md
									</h2>
								</div>
								<div className="rounded-xl bg-orange-50 px-3 py-2.5">
									<Braces className="h-4 w-4 text-orange-700" />
								</div>
							</div>

							<div className="mt-5 space-y-3">
								<div className="rounded-[0.95rem] bg-orange-50 px-4 py-3.5">
									<p className="text-[11px] uppercase tracking-[0.2em] text-orange-700">
										Idea
									</p>
									<p className="mt-2 text-sm leading-6 text-orange-950">
										Terminal, but for memory. Notes, but less polite.
									</p>
								</div>

								<div className="rounded-[0.95rem] bg-sky-50 px-4 py-3.5">
									<p className="text-[11px] uppercase tracking-[0.2em] text-sky-700">
										Save for later
									</p>
									<p className="mt-2 text-sm leading-7 text-sky-950">
										Look at `t3code`, `Solo`, `QMD`, and steal the parts that
										still feel alive.
									</p>
								</div>

								<div className="rounded-[0.95rem] bg-emerald-50 px-4 py-3.5">
									<p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
										Rule of thumb
									</p>
									<p className="mt-2 text-sm leading-7 text-emerald-950">
										If it feels like work software, make it weirder. If it feels
										chaotic, make it quieter.
									</p>
								</div>
							</div>

							<div className="mt-6 flex flex-wrap gap-2 border-t border-stone-200 pt-5">
								{tags.map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-stone-100 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500"
									>
										{tag}
									</span>
								))}
							</div>
						</div>
					</div>
				</section>

				<section
					id="tour"
					className="mt-14 grid gap-5 lg:grid-cols-[0.72fr_1.28fr]"
				>
					<div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4.5">
						<div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-amber-700">
							<CornerDownRight className="h-4 w-4" />
							Note to self
						</div>
						<p className="mt-3 text-sm leading-7 text-amber-950 sm:text-base">
							Make it feel like a place you want to keep open all day, not a
							place you visit because you should.
						</p>
					</div>

					<div className="rounded-[1.35rem] border border-stone-200 bg-white p-4.5">
						<div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-500">
							<Link2 className="h-4 w-4" />
							Reference pile
						</div>
						<div className="mt-4 flex flex-wrap gap-2.5">
							{["t3code", "Solo", "QMD", "Effect", "TanStack"].map((item) => (
								<span
									key={item}
									className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700"
								>
									{item}
								</span>
							))}
						</div>
					</div>
				</section>

				<section className="mt-14 border-t border-stone-200 pt-9">
					<div className="grid gap-7 md:grid-cols-3">
						{columns.map((item) => (
							<article key={item.title} className="max-w-sm">
								<p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
									{item.kicker}
								</p>
								<h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-2xl">
									{item.title}
								</h2>
								<p className="mt-3 text-sm leading-6 text-stone-600">
									{item.copy}
								</p>
							</article>
						))}
					</div>
				</section>
			</section>
		</main>
	);
}
