import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpenText,
	EqualApproximately,
	FileStack,
	FolderKanban,
	Layers3,
	ListFilter,
	ScanSearch,
	Search,
	SlidersHorizontal,
	Sparkles,
} from "lucide-react";
import {
	startTransition,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
	SearchLabLoaderData,
	SearchLabRouteState,
	SearchMode,
} from "@/lib/search-lab";
import { loadSearchLabData, validateSearchLabRoute } from "@/lib/search-lab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
	validateSearch: validateSearchLabRoute,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadSearchLabData(deps),
	component: SearchRoute,
});

type SearchDraft = {
	query: string;
	collection: string;
	mode: SearchMode;
	limit: number;
	minScore: string;
	explain: boolean;
};

type SearchTone = {
	heroShell: string;
	heroBadge: string;
	heroBody: string;
	primaryAction: string;
	secondaryAction: string;
	metricCard: string;
	metricBadge: string;
	metricIcon: string;
	surfaceCard: string;
	surfaceCardAlt: string;
	dashedPanel: string;
	scrollFrame: string;
	contextPanel: string;
	metaBadge: string;
	metaBadgeOutline: string;
	metaText: string;
};

const searchTone: SearchTone = {
	heroShell:
		"border-[oklch(84%_0.03_145)] bg-[oklch(99%_0.008_145)] shadow-[0_24px_60px_oklch(74%_0.05_145/0.12)]",
	heroBadge:
		"border-[oklch(82%_0.03_145)] bg-[oklch(96%_0.02_145)] text-[oklch(38%_0.07_145)]",
	heroBody: "text-[oklch(41%_0.02_145)]",
	primaryAction:
		"border-[oklch(55%_0.09_145)] bg-[oklch(53%_0.1_145)] text-[oklch(98%_0.01_145)] hover:bg-[oklch(49%_0.09_145)]",
	secondaryAction:
		"border-[oklch(81%_0.026_145)] bg-[oklch(97%_0.01_145)] text-[oklch(32%_0.04_145)] hover:bg-[oklch(94%_0.016_145)]",
	metricCard: "border-[oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)]",
	metricBadge: "bg-[oklch(94%_0.025_145)] text-[oklch(37%_0.065_145)]",
	metricIcon: "text-[oklch(43%_0.08_145)]",
	surfaceCard: "border-[oklch(83%_0.03_145)] bg-[oklch(99%_0.008_145)]",
	surfaceCardAlt: "border-[oklch(82%_0.026_145)] bg-[oklch(97%_0.014_145)]",
	dashedPanel:
		"border-[oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)] text-[oklch(41%_0.02_145)]",
	scrollFrame: "border-[oklch(83%_0.03_145)] bg-[oklch(99%_0.008_145)]",
	contextPanel: "border-[oklch(84%_0.028_145)] bg-[oklch(97%_0.016_145)]",
	metaBadge: "bg-[oklch(94%_0.025_145)] text-[oklch(37%_0.065_145)]",
	metaBadgeOutline:
		"border-[oklch(81%_0.026_145)] bg-[oklch(97%_0.01_145)] text-[oklch(32%_0.04_145)]",
	metaText: "text-[oklch(41%_0.02_145)]",
};

const modeLabels: Record<SearchMode, string> = {
	search: "Keyword",
	vsearch: "Vector",
	query: "Hybrid",
};

function isSearchMode(value: string | undefined): value is SearchMode {
	return value === "search" || value === "vsearch" || value === "query";
}

function buildDraft(search: SearchLabRouteState): SearchDraft {
	return {
		query: search.query,
		collection: search.collection,
		mode: search.mode,
		limit: search.limit,
		minScore: search.minScore === undefined ? "" : String(search.minScore),
		explain: search.explain,
	};
}

function parseMinScore(value: string) {
	const trimmed = value.trim();

	if (!trimmed) {
		return undefined;
	}

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function formatTimestamp(value: string) {
	const parsed = Date.parse(value);

	if (Number.isNaN(parsed)) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(parsed);
}

function scoreLabel(score: number) {
	return score.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function readInputValue(
	target: EventTarget & { readonly ["value"]?: unknown },
) {
	const value = target["value"];
	return typeof value === "string" ? value : "";
}

function SearchRoute() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/search" });
	const [draft, setDraft] = useState(() => buildDraft(search));
	const [localFilter, setLocalFilter] = useState("");
	const [advancedOpen, advancedHandlers] = useDisclosure(
		search.mode === "query" || search.explain || search.minScore !== undefined,
	);
	const [debouncedLocalFilter] = useDebouncedValue(localFilter, 120);
	const deferredFilter = useDeferredValue(debouncedLocalFilter);

	useEffect(() => {
		setDraft(buildDraft(search));
	}, [search]);

	useEffect(() => {
		if (
			search.mode === "query" ||
			search.explain ||
			search.minScore !== undefined
		) {
			advancedHandlers.open();
		}
	}, [advancedHandlers, search.explain, search.minScore, search.mode]);

	const filteredItems = useMemo(() => {
		const filterValue = deferredFilter.trim().toLowerCase();

		if (!filterValue) {
			return data.items;
		}

		return data.items.filter((item) => {
			const fragments =
				item.kind === "search"
					? [item.title, item.displayPath, item.context ?? "", item.snippet]
					: [item.title, item.displayPath, item.collectionName];

			return fragments.some((fragment) =>
				fragment.toLowerCase().includes(filterValue),
			);
		});
	}, [data.items, deferredFilter]);

	const collectionSummary = search.collection
		? data.overview.collections.find(
				(collection) => collection.name === search.collection,
			)
		: undefined;

	function updateSearch(nextDraft: SearchDraft, docid = "") {
		startTransition(() => {
			void navigate({
				resetScroll: false,
				search: {
					query: nextDraft.query.trim(),
					collection: nextDraft.collection,
					limit: nextDraft.limit,
					mode: nextDraft.mode,
					minScore: parseMinScore(nextDraft.minScore),
					explain: nextDraft.mode === "query" ? nextDraft.explain : false,
					docid,
				},
			});
		});
	}

	function submitCurrentDraft() {
		updateSearch(draft, search.docid);
	}

	function browseCollection(collection: string) {
		const nextDraft = {
			...draft,
			collection,
		};
		setDraft(nextDraft);
		updateSearch(nextDraft);
	}

	function browseAllNotes() {
		const nextDraft = {
			...draft,
			collection: "",
			query: "",
		};
		setDraft(nextDraft);
		updateSearch(nextDraft);
	}

	function openDocument(docid: string) {
		updateSearch(draft, docid);
	}

	function closeDocument() {
		updateSearch(draft, "");
	}

	return (
		<main className="min-h-screen bg-[#fbfafa] text-foreground">
			<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
				<header
					className={cn(
						"overflow-hidden rounded-[2rem] border bg-background p-5 shadow-sm sm:p-6",
						searchTone.heroShell,
					)}
				>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="max-w-3xl">
								<div
									className={cn(
										"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
										searchTone.heroBadge,
									)}
								>
									<Layers3 data-icon="inline-start" />
									Vault search
								</div>
								<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
									Vault Search
								</h1>
								<p
									className={cn(
										"mt-3 max-w-2xl text-sm leading-6 sm:text-base",
										searchTone.heroBody,
									)}
								>
									Browse collections, switch retrieval modes, and preview notes
									in one calmer workbench without bouncing between experiments.
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<Link
									to="/"
									className={cn(
										buttonVariants({ variant: "outline" }),
										searchTone.secondaryAction,
									)}
								>
									Home
								</Link>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<MetricCard
								icon={FolderKanban}
								label="Collections"
								value={String(data.overview.collections.length)}
								copy="Clickable buckets that switch the browse context without extra client fetches."
							/>
							<MetricCard
								icon={FileStack}
								label="Indexed notes"
								value={Intl.NumberFormat("en-US").format(
									data.overview.status.totalDocuments,
								)}
								copy="Browse all notes when query is empty, then pivot into exact, vector, or hybrid retrieval."
							/>
							<MetricCard
								icon={EqualApproximately}
								label="Embeddings left"
								value={String(data.overview.status.needsEmbedding)}
								copy="A quick signal for whether vector and hybrid runs may be sparse."
							/>
							<MetricCard
								icon={Sparkles}
								label="Index ready"
								value={data.overview.status.hasVectorIndex ? "Yes" : "No"}
								copy="Hybrid and vector paths are surfaced, but still safe when the index is unavailable."
							/>
						</div>

						{data.errors.length ? (
							<div className="grid gap-3">
								{data.errors.map((error) => (
									<Alert
										key={`${error.command}-${error.message}`}
										className={searchTone.dashedPanel}
									>
										<Sparkles />
										<AlertTitle>{error.command} failed</AlertTitle>
										<AlertDescription>
											<div>{error.message}</div>
											<div className="mt-2 whitespace-pre-wrap wrap-break-word text-[11px] opacity-80">
												{error.details}
											</div>
										</AlertDescription>
									</Alert>
								))}
							</div>
						) : null}
					</div>
				</header>

				<section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
					<div className="min-w-0">
						<ControlsCard
							advancedOpen={advancedOpen}
							collectionOptions={data.overview.collections}
							draft={draft}
							localFilter={localFilter}
							onCollectionChange={(value) =>
								setDraft((current) => ({ ...current, collection: value }))
							}
							onExplainChange={(checked) =>
								setDraft((current) => ({ ...current, explain: checked }))
							}
							onLocalFilterChange={setLocalFilter}
							onMinScoreChange={(value) =>
								setDraft((current) => ({ ...current, minScore: value }))
							}
							onModeChange={(mode) =>
								setDraft((current) => ({ ...current, mode }))
							}
							onQueryChange={(value) =>
								setDraft((current) => ({ ...current, query: value }))
							}
							onSubmit={submitCurrentDraft}
							onToggleAdvanced={advancedHandlers.toggle}
							onLimitChange={(limit) =>
								setDraft((current) => ({ ...current, limit }))
							}
							showQuickFilter
						/>
						<Tabs defaultValue="results" className="mt-4">
							<TabsList variant="line">
								<TabsTrigger value="results">
									<Search data-icon="inline-start" />
									Results
								</TabsTrigger>
								<TabsTrigger value="collections">
									<FolderKanban data-icon="inline-start" />
									Collections
								</TabsTrigger>
							</TabsList>
							<TabsContent value="results">
								<ResultsBoard
									errors={data.errors}
									items={filteredItems}
									mode={search.mode}
									onDocumentOpen={openDocument}
								/>
							</TabsContent>
							<TabsContent value="collections">
								<CollectionsRail
									collectionSummary={collectionSummary?.description}
									collections={data.overview.collections}
									currentCollection={search.collection}
									onBrowseAllNotes={browseAllNotes}
									onCollectionSelect={browseCollection}
								/>
							</TabsContent>
						</Tabs>
					</div>
					<DocumentCard
						document={data.document}
						onDocumentClose={closeDocument}
					/>
				</section>
			</section>
		</main>
	);
}

function MetricCard({
	copy,
	icon: Icon,
	label,
	value,
}: {
	copy: string;
	icon: typeof Layers3;
	label: string;
	value: string;
}) {
	return (
		<Card className={cn("bg-background/80", searchTone.metricCard)}>
			<CardHeader className="gap-2">
				<div className="flex items-center justify-between gap-3">
					<Badge variant="secondary" className={searchTone.metricBadge}>
						{label}
					</Badge>
					<Icon className={searchTone.metricIcon} />
				</div>
				<CardTitle className="text-2xl">{value}</CardTitle>
				<CardDescription>{copy}</CardDescription>
			</CardHeader>
		</Card>
	);
}

function ControlsCard({
	advancedOpen,
	collectionOptions,
	draft,
	localFilter,
	onCollectionChange,
	onExplainChange,
	onLimitChange,
	onLocalFilterChange,
	onMinScoreChange,
	onModeChange,
	onQueryChange,
	onSubmit,
	onToggleAdvanced,
	showQuickFilter,
}: {
	advancedOpen: boolean;
	collectionOptions: SearchLabLoaderData["overview"]["collections"];
	draft: SearchDraft;
	localFilter: string;
	onCollectionChange: (value: string) => void;
	onExplainChange: (checked: boolean) => void;
	onLimitChange: (value: number) => void;
	onLocalFilterChange: (value: string) => void;
	onMinScoreChange: (value: string) => void;
	onModeChange: (mode: SearchMode) => void;
	onQueryChange: (value: string) => void;
	onSubmit: () => void;
	onToggleAdvanced: () => void;
	showQuickFilter: boolean;
}) {
	return (
		<Card className={searchTone.surfaceCard}>
			<CardHeader className="gap-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<CardTitle>Retrieval controls</CardTitle>
						<CardDescription>
							Search submits are explicit. Local filtering stays on the client.
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" onClick={onToggleAdvanced}>
							<SlidersHorizontal data-icon="inline-start" />
							Advanced
						</Button>
						<Button
							size="sm"
							onClick={onSubmit}
							className={searchTone.primaryAction}
						>
							<ScanSearch data-icon="inline-start" />
							Run search
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="query">Query</FieldLabel>
						<FieldContent>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Search />
								</InputGroupAddon>
								<InputGroupInput
									id="query"
									placeholder="Search notes, ideas, links, errands, work docs..."
									value={draft.query}
									onChange={(event) =>
										onQueryChange(readInputValue(event.currentTarget))
									}
								/>
								<InputGroupAddon align="inline-end">
									<InputGroupButton onClick={onSubmit}>Run</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
							<FieldDescription>
								Leave query empty to browse all notes or a single collection.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>

				<FieldSet>
					<FieldLegend>Search mode</FieldLegend>
					<ToggleGroup
						value={[draft.mode]}
						onValueChange={(value) => {
							const nextMode = value[0];

							if (isSearchMode(nextMode)) {
								onModeChange(nextMode);
							}
						}}
						variant="outline"
						size="sm"
						spacing={2}
					>
						<ToggleGroupItem value="search">Keyword</ToggleGroupItem>
						<ToggleGroupItem value="vsearch">Vector</ToggleGroupItem>
						<ToggleGroupItem value="query">Hybrid</ToggleGroupItem>
					</ToggleGroup>
				</FieldSet>

				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
					<Field>
						<FieldLabel>Collection</FieldLabel>
						<FieldContent>
							<Select
								value={draft.collection || "all"}
								onValueChange={(value) =>
									onCollectionChange(
										value === null || value === "all" ? "" : value,
									)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="All notes" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Browse scope</SelectLabel>
										<SelectItem value="all">All notes</SelectItem>
										{collectionOptions.map((collection) => (
											<SelectItem key={collection.name} value={collection.name}>
												{collection.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</FieldContent>
					</Field>

					<Field>
						<FieldLabel>Result limit</FieldLabel>
						<FieldContent>
							<div
								className={cn(
									"rounded-xl border p-3",
									searchTone.surfaceCardAlt,
								)}
							>
								<div className="flex items-center justify-between gap-3">
									<span className="text-xs text-muted-foreground">
										{draft.limit} results
									</span>
									<Badge
										variant="outline"
										className={searchTone.metaBadgeOutline}
									>
										{modeLabels[draft.mode]}
									</Badge>
								</div>
								<Slider
									className="mt-3"
									max={24}
									min={4}
									value={[draft.limit]}
									onValueChange={(value) => {
										const nextLimit = Array.isArray(value) ? value[0] : value;
										if (typeof nextLimit === "number") {
											onLimitChange(nextLimit);
										}
									}}
								/>
							</div>
						</FieldContent>
					</Field>
				</div>

				{advancedOpen ? (
					<div
						className={cn(
							"grid gap-4 rounded-2xl border border-dashed p-4 lg:grid-cols-[minmax(0,1fr)_auto]",
							searchTone.dashedPanel,
						)}
					>
						<Field>
							<FieldLabel htmlFor="min-score">Minimum score</FieldLabel>
							<FieldContent>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<EqualApproximately />
									</InputGroupAddon>
									<InputGroupInput
										id="min-score"
										inputMode="decimal"
										placeholder="Optional threshold for hybrid search"
										value={draft.minScore}
										onChange={(event) =>
											onMinScoreChange(readInputValue(event.currentTarget))
										}
									/>
								</InputGroup>
								<FieldDescription>
									Only applies meaningfully to the hybrid query path.
								</FieldDescription>
							</FieldContent>
						</Field>

						<Field orientation="horizontal" className="items-center">
							<FieldLabel htmlFor="explain">Explain traces</FieldLabel>
							<Switch
								id="explain"
								checked={draft.explain}
								onCheckedChange={onExplainChange}
							/>
						</Field>
					</div>
				) : null}

				{showQuickFilter ? (
					<Field>
						<FieldLabel htmlFor="local-filter">Quick filter</FieldLabel>
						<FieldContent>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<ListFilter />
								</InputGroupAddon>
								<InputGroupInput
									id="local-filter"
									placeholder="Refine visible results locally without another request"
									value={localFilter}
									onChange={(event) =>
										onLocalFilterChange(readInputValue(event.currentTarget))
									}
								/>
							</InputGroup>
						</FieldContent>
					</Field>
				) : null}
			</CardContent>
		</Card>
	);
}

function CollectionsRail({
	collectionSummary,
	collections,
	currentCollection,
	onBrowseAllNotes,
	onCollectionSelect,
}: {
	collectionSummary: string | undefined;
	collections: SearchLabLoaderData["overview"]["collections"];
	currentCollection: string;
	onBrowseAllNotes: () => void;
	onCollectionSelect: (collection: string) => void;
}) {
	return (
		<Card className={cn("min-w-0", searchTone.surfaceCard)}>
			<CardHeader>
				<CardTitle>Collections</CardTitle>
				<CardDescription>
					Click a collection to browse its notes.{" "}
					{collectionSummary ??
						"All notes are visible when no collection is selected."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ItemGroup>
					<Item
						variant={currentCollection ? "outline" : "muted"}
						render={
							<button
								type="button"
								onClick={onBrowseAllNotes}
								className="text-left"
							/>
						}
					>
						<ItemMedia variant="icon">
							<BookOpenText />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>All notes</ItemTitle>
							<ItemDescription>
								Recent notes across the full vault.
							</ItemDescription>
						</ItemContent>
					</Item>
					{collections.map((collection) => (
						<Item
							key={collection.name}
							variant={
								currentCollection === collection.name ? "muted" : "outline"
							}
							render={
								<button
									type="button"
									onClick={() => onCollectionSelect(collection.name)}
									className="text-left"
								/>
							}
						>
							<ItemHeader>
								<Badge
									variant="outline"
									className={searchTone.metaBadgeOutline}
								>
									{collection.documentCount} files
								</Badge>
								{collection.lastModified ? (
									<span className={cn("text-xs", searchTone.metaText)}>
										{formatTimestamp(collection.lastModified)}
									</span>
								) : null}
							</ItemHeader>
							<ItemContent>
								<ItemTitle>{collection.name}</ItemTitle>
								<ItemDescription>
									{collection.description || "Collection notes"}
								</ItemDescription>
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</CardContent>
		</Card>
	);
}

function ResultsBoard({
	errors,
	items,
	mode,
	onDocumentOpen,
}: {
	errors: SearchLabLoaderData["errors"];
	items: Array<SearchLabLoaderData["items"][number]>;
	mode: SearchMode;
	onDocumentOpen: (docid: string) => void;
}) {
	return (
		<Card className={searchTone.surfaceCard}>
			<CardHeader>
				<CardTitle>Results</CardTitle>
				<CardDescription>
					{items.length} visible result{items.length === 1 ? "" : "s"} in{" "}
					{modeLabels[mode]} mode.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ResultList
					errors={errors}
					items={items}
					onDocumentOpen={onDocumentOpen}
				/>
			</CardContent>
		</Card>
	);
}

function ResultList({
	errors,
	items,
	onDocumentOpen,
}: {
	errors: SearchLabLoaderData["errors"];
	items: Array<SearchLabLoaderData["items"][number]>;
	onDocumentOpen: (docid: string) => void;
}) {
	if (errors.length && !items.length) {
		return (
			<div
				className={cn(
					"rounded-2xl border border-dashed p-6 text-sm",
					searchTone.dashedPanel,
				)}
			>
				This search failed before results could be returned. The message above
				reflects a real QMD error, not a genuine zero-results state.
			</div>
		);
	}

	if (!items.length) {
		return (
			<div
				className={cn(
					"rounded-2xl border border-dashed p-6 text-sm",
					searchTone.dashedPanel,
				)}
			>
				No visible notes match this view yet. Try a different collection, lower
				the score threshold, or clear the quick filter.
			</div>
		);
	}

	return (
		<ScrollArea
			className={cn("h-[58vh] rounded-2xl border", searchTone.scrollFrame)}
		>
			<div className="flex min-w-0 flex-col gap-3 p-3">
				{items.map((item) => (
					<Item
						key={`${item.kind}-${item.docid}`}
						variant="outline"
						render={
							<button
								type="button"
								onClick={() => onDocumentOpen(item.docid)}
								className="text-left"
							/>
						}
					>
						<ItemHeader>
							<Badge variant="secondary" className={searchTone.metaBadge}>
								{item.kind === "search"
									? `${scoreLabel(item.score)} score`
									: item.collectionName}
							</Badge>
							<span className={cn("truncate text-xs", searchTone.metaText)}>
								{item.kind === "browse"
									? formatTimestamp(item.modifiedAt)
									: item.docid}
							</span>
						</ItemHeader>
						<ItemContent>
							<ItemTitle>{item.title}</ItemTitle>
							<ItemDescription className="wrap-break-word">
								{item.displayPath}
							</ItemDescription>
							{item.kind === "search" ? (
								<ItemDescription className="line-clamp-3">
									{item.context ?? item.snippet}
								</ItemDescription>
							) : null}
						</ItemContent>
						<ItemActions>
							<span
								className={cn(
									buttonVariants({ variant: "ghost", size: "sm" }),
									searchTone.secondaryAction,
								)}
							>
								Open
								<ArrowRight data-icon="inline-end" />
							</span>
						</ItemActions>
					</Item>
				))}
			</div>
		</ScrollArea>
	);
}

function DocumentBody({
	document,
}: {
	document: SearchLabLoaderData["document"];
}) {
	if (!document) {
		return (
			<div
				className={cn(
					"rounded-2xl border border-dashed p-6 text-sm",
					searchTone.dashedPanel,
				)}
			>
				Open a note to preview the full body here.
			</div>
		);
	}

	if (!document.found) {
		return (
			<div
				className={cn(
					"rounded-2xl border border-dashed p-6 text-sm",
					searchTone.dashedPanel,
				)}
			>
				QMD could not resolve that docid. Try one of the nearby matches:{" "}
				{document.similarFiles.join(", ")}
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary" className={searchTone.metaBadge}>
					{document.collectionName}
				</Badge>
				<Badge variant="outline" className={searchTone.metaBadgeOutline}>
					{document.docid}
				</Badge>
				<span className={cn("text-xs", searchTone.metaText)}>
					{formatTimestamp(document.modifiedAt)}
				</span>
			</div>
			<div>
				<h2 className="text-xl font-semibold tracking-tight">
					{document.title}
				</h2>
				<p className={cn("mt-1 wrap-break-word text-sm", searchTone.metaText)}>
					{document.displayPath}
				</p>
			</div>
			{document.context ? (
				<div
					className={cn(
						"rounded-xl border p-3 text-sm",
						searchTone.contextPanel,
						searchTone.metaText,
					)}
				>
					{document.context}
				</div>
			) : null}
			<Separator />
			<ScrollArea
				className={cn("h-[44vh] rounded-2xl border", searchTone.scrollFrame)}
			>
				<pre className="min-w-0 whitespace-pre-wrap wrap-break-word p-4 text-sm leading-6 text-foreground">
					{document.body}
				</pre>
			</ScrollArea>
		</div>
	);
}

function DocumentCard({
	document,
	onDocumentClose,
}: {
	document: SearchLabLoaderData["document"];
	onDocumentClose: () => void;
}) {
	return (
		<Card className={cn("min-w-0", searchTone.surfaceCard)}>
			<CardHeader className="flex flex-row items-start justify-between gap-3">
				<div>
					<CardTitle>Preview</CardTitle>
					<CardDescription>
						Stable note preview driven by the selected `docid` in the route
						state.
					</CardDescription>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onDocumentClose}
					className={searchTone.secondaryAction}
				>
					Clear
				</Button>
			</CardHeader>
			<CardContent className="min-w-0">
				<DocumentBody document={document} />
			</CardContent>
		</Card>
	);
}
