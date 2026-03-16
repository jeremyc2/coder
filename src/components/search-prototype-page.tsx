import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpenText,
	ChevronsUpDown,
	Command as CommandIcon,
	EqualApproximately,
	FileStack,
	FolderKanban,
	GalleryVerticalEnd,
	Layers3,
	ListFilter,
	PanelRight,
	ScanSearch,
	Search,
	SlidersHorizontal,
	Sparkles,
	TableOfContents,
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
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
	SearchLabLoaderData,
	SearchLabRouteState,
	SearchMode,
} from "@/lib/search-lab";
import { defaultSearchLabRouteState } from "@/lib/search-lab";
import { cn } from "@/lib/utils";

type PrototypeVariant = "one" | "two" | "three" | "four" | "five";

type SearchDraft = {
	query: string;
	collection: string;
	mode: SearchMode;
	limit: number;
	minScore: string;
	explain: boolean;
};

type SearchPrototypePageProps = {
	data: SearchLabLoaderData;
	routePath:
		| "/search-one"
		| "/search-two"
		| "/search-three"
		| "/search-four"
		| "/search-five";
	search: SearchLabRouteState;
	title: string;
	variant: PrototypeVariant;
};

type PrototypeTone = {
	heroShell: string;
	heroBadge: string;
	heroBody: string;
	primaryAction: string;
	secondaryAction: string;
	activePrototype: string;
	inactivePrototype: string;
	metricCard: string;
	metricBadge: string;
	metricIcon: string;
	surfaceCard: string;
	surfaceCardAlt: string;
	dashedPanel: string;
	scrollFrame: string;
	tableHeader: string;
	tableRow: string;
	contextPanel: string;
	metaBadge: string;
	metaBadgeOutline: string;
	metaText: string;
};

const prototypeLinks = [
	{ to: "/search-one", label: "Search One" },
	{ to: "/search-two", label: "Search Two" },
	{ to: "/search-three", label: "Search Three" },
	{ to: "/search-four", label: "Search Four" },
	{ to: "/search-five", label: "Search Five" },
] as const;

const modeLabels: Record<SearchMode, string> = {
	search: "Keyword",
	vsearch: "Vector",
	query: "Hybrid",
};

const variantShell: Record<PrototypeVariant, { hero: string; canvas: string }> =
	{
		one: {
			hero: "rounded-[2rem] border bg-background/95 shadow-sm",
			canvas:
				"grid min-h-[68vh] gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]",
		},
		two: {
			hero: "rounded-[2rem] border bg-background shadow-sm",
			canvas: "grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]",
		},
		three: {
			hero: "rounded-[2rem] border bg-muted/25 shadow-sm",
			canvas: "grid gap-4",
		},
		four: {
			hero: "rounded-[2rem] border bg-background shadow-sm",
			canvas: "grid gap-4",
		},
		five: {
			hero: "rounded-[2rem] border bg-muted/20 shadow-sm",
			canvas: "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]",
		},
	};

const variantTone: Record<PrototypeVariant, PrototypeTone> = {
	one: {
		heroShell:
			"border-[oklch(86%_0.03_60)] bg-[oklch(99%_0.008_70)] shadow-[0_24px_60px_oklch(76%_0.05_60/0.12)]",
		heroBadge:
			"border-[oklch(82%_0.035_55)] bg-[oklch(96%_0.025_70)] text-[oklch(40%_0.09_55)]",
		heroBody: "text-[oklch(44%_0.02_68)]",
		primaryAction:
			"border-[oklch(62%_0.11_50)] bg-[oklch(60%_0.13_50)] text-[oklch(98%_0.01_80)] hover:bg-[oklch(56%_0.12_50)]",
		secondaryAction:
			"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)] hover:bg-[oklch(94%_0.02_70)]",
		activePrototype:
			"border-[oklch(62%_0.11_50)] bg-[oklch(60%_0.13_50)] text-[oklch(98%_0.01_80)] hover:bg-[oklch(56%_0.12_50)]",
		inactivePrototype:
			"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)] hover:bg-[oklch(94%_0.02_70)]",
		metricCard: "border-[oklch(84%_0.03_55)] bg-[oklch(98%_0.012_70)]",
		metricBadge: "bg-[oklch(94%_0.03_70)] text-[oklch(39%_0.08_55)]",
		metricIcon: "text-[oklch(48%_0.11_55)]",
		surfaceCard: "border-[oklch(84%_0.028_60)] bg-[oklch(99%_0.008_70)]",
		surfaceCardAlt: "border-[oklch(82%_0.03_55)] bg-[oklch(97%_0.015_68)]",
		dashedPanel:
			"border-[oklch(84%_0.03_55)] bg-[oklch(98%_0.012_70)] text-[oklch(44%_0.02_68)]",
		scrollFrame: "border-[oklch(84%_0.028_60)] bg-[oklch(99%_0.008_70)]",
		tableHeader: "bg-[oklch(96%_0.02_68)]",
		tableRow:
			"hover:bg-[oklch(96%_0.02_68)] data-[state=selected]:bg-[oklch(95%_0.03_65)]",
		contextPanel: "border-[oklch(85%_0.03_55)] bg-[oklch(97%_0.018_68)]",
		metaBadge: "bg-[oklch(94%_0.03_70)] text-[oklch(39%_0.08_55)]",
		metaBadgeOutline:
			"border-[oklch(82%_0.03_60)] bg-[oklch(97%_0.01_70)] text-[oklch(34%_0.03_60)]",
		metaText: "text-[oklch(44%_0.02_68)]",
	},
	two: {
		heroShell:
			"border-[oklch(84%_0.03_145)] bg-[oklch(99%_0.008_145)] shadow-[0_24px_60px_oklch(74%_0.05_145/0.12)]",
		heroBadge:
			"border-[oklch(82%_0.03_145)] bg-[oklch(96%_0.02_145)] text-[oklch(38%_0.07_145)]",
		heroBody: "text-[oklch(41%_0.02_145)]",
		primaryAction:
			"border-[oklch(55%_0.09_145)] bg-[oklch(53%_0.1_145)] text-[oklch(98%_0.01_145)] hover:bg-[oklch(49%_0.09_145)]",
		secondaryAction:
			"border-[oklch(81%_0.026_145)] bg-[oklch(97%_0.01_145)] text-[oklch(32%_0.04_145)] hover:bg-[oklch(94%_0.016_145)]",
		activePrototype:
			"border-[oklch(55%_0.09_145)] bg-[oklch(53%_0.1_145)] text-[oklch(98%_0.01_145)] hover:bg-[oklch(49%_0.09_145)]",
		inactivePrototype:
			"border-[oklch(81%_0.026_145)] bg-[oklch(97%_0.01_145)] text-[oklch(32%_0.04_145)] hover:bg-[oklch(94%_0.016_145)]",
		metricCard: "border-[oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)]",
		metricBadge: "bg-[oklch(94%_0.025_145)] text-[oklch(37%_0.065_145)]",
		metricIcon: "text-[oklch(43%_0.08_145)]",
		surfaceCard: "border-[oklch(83%_0.03_145)] bg-[oklch(99%_0.008_145)]",
		surfaceCardAlt: "border-[oklch(82%_0.026_145)] bg-[oklch(97%_0.014_145)]",
		dashedPanel:
			"border-[oklch(83%_0.03_145)] bg-[oklch(98%_0.012_145)] text-[oklch(41%_0.02_145)]",
		scrollFrame: "border-[oklch(83%_0.03_145)] bg-[oklch(99%_0.008_145)]",
		tableHeader: "bg-[oklch(96%_0.02_145)]",
		tableRow:
			"hover:bg-[oklch(96%_0.02_145)] data-[state=selected]:bg-[oklch(95%_0.03_145)]",
		contextPanel: "border-[oklch(84%_0.028_145)] bg-[oklch(97%_0.016_145)]",
		metaBadge: "bg-[oklch(94%_0.025_145)] text-[oklch(37%_0.065_145)]",
		metaBadgeOutline:
			"border-[oklch(81%_0.026_145)] bg-[oklch(97%_0.01_145)] text-[oklch(32%_0.04_145)]",
		metaText: "text-[oklch(41%_0.02_145)]",
	},
	three: {
		heroShell:
			"border-[oklch(84%_0.03_35)] bg-[oklch(99%_0.008_35)] shadow-[0_24px_60px_oklch(75%_0.05_35/0.12)]",
		heroBadge:
			"border-[oklch(82%_0.035_35)] bg-[oklch(96%_0.024_35)] text-[oklch(41%_0.085_35)]",
		heroBody: "text-[oklch(43%_0.02_35)]",
		primaryAction:
			"border-[oklch(61%_0.11_35)] bg-[oklch(59%_0.12_35)] text-[oklch(98%_0.01_40)] hover:bg-[oklch(55%_0.11_35)]",
		secondaryAction:
			"border-[oklch(82%_0.028_35)] bg-[oklch(97%_0.012_35)] text-[oklch(39%_0.07_35)] hover:bg-[oklch(94%_0.02_35)]",
		activePrototype:
			"border-[oklch(61%_0.11_35)] bg-[oklch(59%_0.12_35)] text-[oklch(98%_0.01_40)] hover:bg-[oklch(55%_0.11_35)]",
		inactivePrototype:
			"border-[oklch(82%_0.028_35)] bg-[oklch(97%_0.012_35)] text-[oklch(39%_0.07_35)] hover:bg-[oklch(94%_0.02_35)]",
		metricCard: "border-[oklch(84%_0.03_35)] bg-[oklch(98%_0.014_35)]",
		metricBadge: "bg-[oklch(94%_0.03_35)] text-[oklch(40%_0.085_35)]",
		metricIcon: "text-[oklch(49%_0.12_35)]",
		surfaceCard: "border-[oklch(84%_0.028_35)] bg-[oklch(99%_0.008_35)]",
		surfaceCardAlt: "border-[oklch(82%_0.03_35)] bg-[oklch(97%_0.014_35)]",
		dashedPanel:
			"border-[oklch(84%_0.03_35)] bg-[oklch(98%_0.014_35)] text-[oklch(43%_0.02_35)]",
		scrollFrame: "border-[oklch(84%_0.028_35)] bg-[oklch(99%_0.008_35)]",
		tableHeader: "bg-[oklch(96%_0.02_35)]",
		tableRow:
			"hover:bg-[oklch(96%_0.02_35)] data-[state=selected]:bg-[oklch(95%_0.03_35)]",
		contextPanel: "border-[oklch(84%_0.028_35)] bg-[oklch(97%_0.018_35)]",
		metaBadge: "bg-[oklch(94%_0.03_35)] text-[oklch(40%_0.085_35)]",
		metaBadgeOutline:
			"border-[oklch(82%_0.028_35)] bg-[oklch(97%_0.012_35)] text-[oklch(39%_0.07_35)]",
		metaText: "text-[oklch(43%_0.02_35)]",
	},
	four: {
		heroShell:
			"border-[oklch(84%_0.028_85)] bg-[oklch(99%_0.008_85)] shadow-[0_24px_60px_oklch(78%_0.04_85/0.12)]",
		heroBadge:
			"border-[oklch(82%_0.03_85)] bg-[oklch(96%_0.022_85)] text-[oklch(41%_0.075_85)]",
		heroBody: "text-[oklch(43%_0.02_82)]",
		primaryAction:
			"border-[oklch(63%_0.1_85)] bg-[oklch(61%_0.11_85)] text-[oklch(98%_0.01_90)] hover:bg-[oklch(57%_0.1_85)]",
		secondaryAction:
			"border-[oklch(82%_0.026_85)] bg-[oklch(97%_0.012_85)] text-[oklch(37%_0.06_85)] hover:bg-[oklch(94%_0.018_85)]",
		activePrototype:
			"border-[oklch(63%_0.1_85)] bg-[oklch(61%_0.11_85)] text-[oklch(98%_0.01_90)] hover:bg-[oklch(57%_0.1_85)]",
		inactivePrototype:
			"border-[oklch(82%_0.026_85)] bg-[oklch(97%_0.012_85)] text-[oklch(37%_0.06_85)] hover:bg-[oklch(94%_0.018_85)]",
		metricCard: "border-[oklch(83%_0.025_85)] bg-[oklch(98%_0.012_85)]",
		metricBadge: "bg-[oklch(94%_0.028_85)] text-[oklch(41%_0.075_85)]",
		metricIcon: "text-[oklch(49%_0.09_85)]",
		surfaceCard: "border-[oklch(83%_0.025_85)] bg-[oklch(99%_0.008_85)]",
		surfaceCardAlt: "border-[oklch(82%_0.028_85)] bg-[oklch(97%_0.014_85)]",
		dashedPanel:
			"border-[oklch(83%_0.025_85)] bg-[oklch(98%_0.012_85)] text-[oklch(43%_0.02_82)]",
		scrollFrame: "border-[oklch(83%_0.025_85)] bg-[oklch(99%_0.008_85)]",
		tableHeader: "bg-[oklch(96%_0.02_85)]",
		tableRow:
			"hover:bg-[oklch(96%_0.02_85)] data-[state=selected]:bg-[oklch(95%_0.028_85)]",
		contextPanel: "border-[oklch(84%_0.026_85)] bg-[oklch(97%_0.016_85)]",
		metaBadge: "bg-[oklch(94%_0.028_85)] text-[oklch(41%_0.075_85)]",
		metaBadgeOutline:
			"border-[oklch(82%_0.026_85)] bg-[oklch(97%_0.012_85)] text-[oklch(37%_0.06_85)]",
		metaText: "text-[oklch(43%_0.02_82)]",
	},
	five: {
		heroShell:
			"border-[oklch(84%_0.026_115)] bg-[oklch(99%_0.008_115)] shadow-[0_24px_60px_oklch(75%_0.04_115/0.12)]",
		heroBadge:
			"border-[oklch(82%_0.026_115)] bg-[oklch(96%_0.02_115)] text-[oklch(38%_0.06_115)]",
		heroBody: "text-[oklch(40%_0.02_115)]",
		primaryAction:
			"border-[oklch(56%_0.09_115)] bg-[oklch(54%_0.1_115)] text-[oklch(98%_0.01_120)] hover:bg-[oklch(50%_0.09_115)]",
		secondaryAction:
			"border-[oklch(82%_0.022_115)] bg-[oklch(97%_0.012_115)] text-[oklch(34%_0.045_115)] hover:bg-[oklch(94%_0.018_115)]",
		activePrototype:
			"border-[oklch(56%_0.09_115)] bg-[oklch(54%_0.1_115)] text-[oklch(98%_0.01_120)] hover:bg-[oklch(50%_0.09_115)]",
		inactivePrototype:
			"border-[oklch(82%_0.022_115)] bg-[oklch(97%_0.012_115)] text-[oklch(34%_0.045_115)] hover:bg-[oklch(94%_0.018_115)]",
		metricCard: "border-[oklch(84%_0.025_115)] bg-[oklch(98%_0.012_115)]",
		metricBadge: "bg-[oklch(94%_0.022_115)] text-[oklch(38%_0.06_115)]",
		metricIcon: "text-[oklch(43%_0.075_115)]",
		surfaceCard: "border-[oklch(84%_0.025_115)] bg-[oklch(99%_0.008_115)]",
		surfaceCardAlt: "border-[oklch(82%_0.024_115)] bg-[oklch(97%_0.014_115)]",
		dashedPanel:
			"border-[oklch(84%_0.025_115)] bg-[oklch(98%_0.012_115)] text-[oklch(40%_0.02_115)]",
		scrollFrame: "border-[oklch(84%_0.025_115)] bg-[oklch(99%_0.008_115)]",
		tableHeader: "bg-[oklch(96%_0.018_115)]",
		tableRow:
			"hover:bg-[oklch(96%_0.018_115)] data-[state=selected]:bg-[oklch(95%_0.022_115)]",
		contextPanel: "border-[oklch(84%_0.024_115)] bg-[oklch(97%_0.016_115)]",
		metaBadge: "bg-[oklch(94%_0.022_115)] text-[oklch(38%_0.06_115)]",
		metaBadgeOutline:
			"border-[oklch(82%_0.022_115)] bg-[oklch(97%_0.012_115)] text-[oklch(34%_0.045_115)]",
		metaText: "text-[oklch(40%_0.02_115)]",
	},
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

export function SearchPrototypePage({
	data,
	routePath,
	search,
	title,
	variant,
}: SearchPrototypePageProps) {
	const navigate = useNavigate({ from: routePath });
	const tone = variantTone[variant];
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
	const selectedPrototype = prototypeLinks.find(
		(item) => item.to === routePath,
	);

	function updateSearch(nextDraft: SearchDraft, docid = "") {
		startTransition(() => {
			void navigate({
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
		<main className="min-h-screen bg-background text-foreground">
			<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
				<header
					className={cn(
						"overflow-hidden p-5 sm:p-6",
						variantShell[variant].hero,
						tone.heroShell,
					)}
				>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="max-w-3xl">
								<div
									className={cn(
										"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
										tone.heroBadge,
									)}
								>
									<Layers3 data-icon="inline-start" />
									QMD search lab
								</div>
								<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
									{title}
								</h1>
								<p
									className={cn(
										"mt-3 max-w-2xl text-sm leading-6 sm:text-base",
										tone.heroBody,
									)}
								>
									Five distinct shadcn-heavy prototypes for browsing
									collections, testing retrieval modes, and previewing notes
									without creating query churn.
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<ButtonGroup>
									<ButtonGroupText>
										<GalleryVerticalEnd data-icon="inline-start" />
										{selectedPrototype?.label}
									</ButtonGroupText>
									<Link
										to="/search"
										search={defaultSearchLabRouteState}
										className={cn(
											buttonVariants({ variant: "outline" }),
											tone.secondaryAction,
										)}
									>
										Lab index
									</Link>
								</ButtonGroup>
								<Link
									to="/"
									className={cn(
										buttonVariants({ variant: "outline" }),
										tone.secondaryAction,
									)}
								>
									Home
								</Link>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							{prototypeLinks.map((prototype) => (
								<Link
									key={prototype.to}
									to={prototype.to}
									search={defaultSearchLabRouteState}
									className={cn(
										buttonVariants({
											variant:
												prototype.to === routePath ? "default" : "outline",
											size: "sm",
										}),
										prototype.to === routePath
											? tone.activePrototype
											: tone.inactivePrototype,
									)}
								>
									{prototype.label}
								</Link>
							))}
						</div>

						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<MetricCard
								icon={FolderKanban}
								label="Collections"
								value={String(data.overview.collections.length)}
								copy="Clickable buckets that switch the browse context without extra client fetches."
								tone={tone}
							/>
							<MetricCard
								icon={FileStack}
								label="Indexed notes"
								value={Intl.NumberFormat("en-US").format(
									data.overview.status.totalDocuments,
								)}
								copy="Browse all notes when query is empty, then pivot into exact, vector, or hybrid retrieval."
								tone={tone}
							/>
							<MetricCard
								icon={EqualApproximately}
								label="Embeddings left"
								value={String(data.overview.status.needsEmbedding)}
								copy="A quick signal for whether vector and hybrid runs may be sparse."
								tone={tone}
							/>
							<MetricCard
								icon={Sparkles}
								label="Index ready"
								value={data.overview.status.hasVectorIndex ? "Yes" : "No"}
								copy="Hybrid and vector paths are surfaced, but still safe when the index is unavailable."
								tone={tone}
							/>
						</div>

						{data.errors.length ? (
							<div className="grid gap-3">
								{data.errors.map((error) => (
									<Alert
										key={`${error.command}-${error.message}`}
										className={tone.dashedPanel}
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

				<section className={variantShell[variant].canvas}>
					{variant === "one" ? (
						<>
							<div className="flex min-w-0 flex-col gap-4">
								<ControlsCard
									tone={tone}
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
								<CollectionsRail
									tone={tone}
									collectionSummary={collectionSummary?.description}
									collections={data.overview.collections}
									currentCollection={search.collection}
									onBrowseAllNotes={browseAllNotes}
									onCollectionSelect={browseCollection}
								/>
							</div>
							<div className="min-w-0">
								<SplitWorkbench
									tone={tone}
									errors={data.errors}
									items={filteredItems}
									onDocumentOpen={openDocument}
									onDocumentClose={closeDocument}
									document={data.document}
								/>
							</div>
						</>
					) : null}

					{variant === "two" ? (
						<>
							<div className="min-w-0">
								<ControlsCard
									tone={tone}
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
											tone={tone}
											errors={data.errors}
											items={filteredItems}
											mode={search.mode}
											onDocumentOpen={openDocument}
										/>
									</TabsContent>
									<TabsContent value="collections">
										<CollectionsRail
											tone={tone}
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
								tone={tone}
								document={data.document}
								onDocumentClose={closeDocument}
							/>
						</>
					) : null}

					{variant === "three" ? (
						<div className="min-w-0">
							<ControlsCard
								tone={tone}
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
							<div className="mt-4 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
								<CollectionsRail
									tone={tone}
									collectionSummary={collectionSummary?.description}
									collections={data.overview.collections}
									currentCollection={search.collection}
									onBrowseAllNotes={browseAllNotes}
									onCollectionSelect={browseCollection}
								/>
								<CommandWorkbench
									tone={tone}
									items={filteredItems}
									onDocumentOpen={openDocument}
								/>
							</div>
							<DocumentDrawer
								tone={tone}
								document={data.document}
								onOpenChange={(open) => {
									if (!open) {
										closeDocument();
									}
								}}
							/>
						</div>
					) : null}

					{variant === "four" ? (
						<div className="min-w-0">
							<ControlsCard
								tone={tone}
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
							<div className="mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
								<CollectionsRail
									tone={tone}
									collectionSummary={collectionSummary?.description}
									collections={data.overview.collections}
									currentCollection={search.collection}
									onBrowseAllNotes={browseAllNotes}
									onCollectionSelect={browseCollection}
								/>
								<TableWorkbench
									tone={tone}
									items={filteredItems}
									onDocumentOpen={openDocument}
								/>
							</div>
							<DocumentSheet
								tone={tone}
								document={data.document}
								onOpenChange={(open) => {
									if (!open) {
										closeDocument();
									}
								}}
							/>
						</div>
					) : null}

					{variant === "five" ? (
						<>
							<CollectionsRail
								tone={tone}
								collectionSummary={collectionSummary?.description}
								collections={data.overview.collections}
								currentCollection={search.collection}
								onBrowseAllNotes={browseAllNotes}
								onCollectionSelect={browseCollection}
							/>
							<div className="min-w-0">
								<ControlsCard
									tone={tone}
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
									<TabsList>
										<TabsTrigger value="results">
											<TableOfContents data-icon="inline-start" />
											Results
										</TabsTrigger>
										<TabsTrigger value="preview">
											<PanelRight data-icon="inline-start" />
											Preview
										</TabsTrigger>
									</TabsList>
									<TabsContent value="results">
										<ResultsBoard
											tone={tone}
											errors={data.errors}
											items={filteredItems}
											mode={search.mode}
											onDocumentOpen={openDocument}
										/>
									</TabsContent>
									<TabsContent value="preview">
										<DocumentCard
											tone={tone}
											document={data.document}
											onDocumentClose={closeDocument}
										/>
									</TabsContent>
								</Tabs>
							</div>
						</>
					) : null}
				</section>
			</section>
		</main>
	);
}

function MetricCard({
	copy,
	icon: Icon,
	label,
	tone,
	value,
}: {
	copy: string;
	icon: typeof Layers3;
	label: string;
	tone: PrototypeTone;
	value: string;
}) {
	return (
		<Card className={cn("bg-background/80", tone.metricCard)}>
			<CardHeader className="gap-2">
				<div className="flex items-center justify-between gap-3">
					<Badge variant="secondary" className={tone.metricBadge}>
						{label}
					</Badge>
					<Icon className={tone.metricIcon} />
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
	tone,
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
	tone: PrototypeTone;
}) {
	return (
		<Card className={tone.surfaceCard}>
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
						<Button size="sm" onClick={onSubmit} className={tone.primaryAction}>
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
							<div className={cn("rounded-xl border p-3", tone.surfaceCardAlt)}>
								<div className="flex items-center justify-between gap-3">
									<span className="text-xs text-muted-foreground">
										{draft.limit} results
									</span>
									<Badge variant="outline" className={tone.metaBadgeOutline}>
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
							tone.dashedPanel,
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
	tone,
}: {
	collectionSummary: string | undefined;
	collections: SearchLabLoaderData["overview"]["collections"];
	currentCollection: string;
	onBrowseAllNotes: () => void;
	onCollectionSelect: (collection: string) => void;
	tone: PrototypeTone;
}) {
	return (
		<Card className={cn("min-w-0", tone.surfaceCard)}>
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
								<Badge variant="outline" className={tone.metaBadgeOutline}>
									{collection.documentCount} files
								</Badge>
								{collection.lastModified ? (
									<span className={cn("text-xs", tone.metaText)}>
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
	tone,
}: {
	errors: SearchLabLoaderData["errors"];
	items: Array<SearchLabLoaderData["items"][number]>;
	mode: SearchMode;
	onDocumentOpen: (docid: string) => void;
	tone: PrototypeTone;
}) {
	return (
		<Card className={tone.surfaceCard}>
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
					tone={tone}
				/>
			</CardContent>
		</Card>
	);
}

function SplitWorkbench({
	document,
	errors,
	items,
	onDocumentClose,
	onDocumentOpen,
	tone,
}: {
	document: SearchLabLoaderData["document"];
	errors: SearchLabLoaderData["errors"];
	items: Array<SearchLabLoaderData["items"][number]>;
	onDocumentClose: () => void;
	onDocumentOpen: (docid: string) => void;
	tone: PrototypeTone;
}) {
	return (
		<div className="grid min-h-[68vh] gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
			<Card className={cn("min-w-0", tone.surfaceCard)}>
				<CardHeader>
					<CardTitle>Queue</CardTitle>
					<CardDescription>
						Editorial split view with compact note cards on the left and a
						persistent preview on the right.
					</CardDescription>
				</CardHeader>
				<CardContent className="min-w-0">
					<ResultList
						errors={errors}
						items={items}
						onDocumentOpen={onDocumentOpen}
						tone={tone}
					/>
				</CardContent>
			</Card>
			<DocumentCard
				document={document}
				onDocumentClose={onDocumentClose}
				tone={tone}
			/>
		</div>
	);
}

function ResultList({
	errors,
	items,
	onDocumentOpen,
	tone,
}: {
	errors: SearchLabLoaderData["errors"];
	items: Array<SearchLabLoaderData["items"][number]>;
	onDocumentOpen: (docid: string) => void;
	tone: PrototypeTone;
}) {
	if (errors.length && !items.length) {
		return (
			<div
				className={cn(
					"rounded-2xl border border-dashed p-6 text-sm",
					tone.dashedPanel,
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
					tone.dashedPanel,
				)}
			>
				No visible notes match this view yet. Try a different collection, lower
				the score threshold, or clear the quick filter.
			</div>
		);
	}

	return (
		<ScrollArea className={cn("h-[58vh] rounded-2xl border", tone.scrollFrame)}>
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
							<Badge variant="secondary" className={tone.metaBadge}>
								{item.kind === "search"
									? `${scoreLabel(item.score)} score`
									: item.collectionName}
							</Badge>
							<span className={cn("truncate text-xs", tone.metaText)}>
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
									tone.secondaryAction,
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

function CommandWorkbench({
	items,
	onDocumentOpen,
	tone,
}: {
	items: Array<SearchLabLoaderData["items"][number]>;
	onDocumentOpen: (docid: string) => void;
	tone: PrototypeTone;
}) {
	return (
		<Card className={cn("overflow-hidden", tone.surfaceCard)}>
			<CardHeader>
				<CardTitle>Command deck</CardTitle>
				<CardDescription>
					A command-palette-flavored prototype for quickly drilling into
					results.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Command className={cn("border", tone.surfaceCardAlt)}>
					<CommandInput placeholder="Filter the current results..." />
					<CommandList>
						<CommandEmpty>No results in this command view.</CommandEmpty>
						<CommandGroup heading="Matches">
							{items.map((item) => (
								<CommandItem
									key={`${item.kind}-${item.docid}`}
									onSelect={() => onDocumentOpen(item.docid)}
								>
									<CommandIcon data-icon="inline-start" />
									<div className="min-w-0 flex-1">
										<div className="truncate font-medium">{item.title}</div>
										<div className="truncate text-muted-foreground">
											{item.displayPath}
										</div>
									</div>
									<CommandShortcut>
										{item.kind === "search"
											? scoreLabel(item.score)
											: item.collectionName}
									</CommandShortcut>
								</CommandItem>
							))}
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup heading="Hints">
							<CommandItem disabled>
								<ChevronsUpDown data-icon="inline-start" />
								Move through results
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</CardContent>
		</Card>
	);
}

function TableWorkbench({
	items,
	onDocumentOpen,
	tone,
}: {
	items: Array<SearchLabLoaderData["items"][number]>;
	onDocumentOpen: (docid: string) => void;
	tone: PrototypeTone;
}) {
	return (
		<Card className={tone.surfaceCard}>
			<CardHeader>
				<CardTitle>Operations table</CardTitle>
				<CardDescription>
					Table-first prototype for scanning titles, paths, and scores with very
					little chrome.
				</CardDescription>
			</CardHeader>
			<CardContent className="min-w-0">
				<Table>
					<TableHeader>
						<TableRow className={tone.tableHeader}>
							<TableHead>Title</TableHead>
							<TableHead>Path</TableHead>
							<TableHead>Meta</TableHead>
							<TableHead className="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item) => (
							<TableRow
								key={`${item.kind}-${item.docid}`}
								className={tone.tableRow}
							>
								<TableCell className="max-w-[18rem] truncate font-medium">
									{item.title}
								</TableCell>
								<TableCell className="max-w-md truncate text-muted-foreground">
									{item.displayPath}
								</TableCell>
								<TableCell>
									{item.kind === "search"
										? `${scoreLabel(item.score)} score`
										: item.collectionName}
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onDocumentOpen(item.docid)}
									>
										Open
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function DocumentBody({
	document,
	tone,
}: {
	document: SearchLabLoaderData["document"];
	tone: PrototypeTone;
}) {
	if (!document) {
		return (
			<div
				className={cn(
					"rounded-2xl border border-dashed p-6 text-sm",
					tone.dashedPanel,
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
					tone.dashedPanel,
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
				<Badge variant="secondary" className={tone.metaBadge}>
					{document.collectionName}
				</Badge>
				<Badge variant="outline" className={tone.metaBadgeOutline}>
					{document.docid}
				</Badge>
				<span className={cn("text-xs", tone.metaText)}>
					{formatTimestamp(document.modifiedAt)}
				</span>
			</div>
			<div>
				<h2 className="text-xl font-semibold tracking-tight">
					{document.title}
				</h2>
				<p className={cn("mt-1 wrap-break-word text-sm", tone.metaText)}>
					{document.displayPath}
				</p>
			</div>
			{document.context ? (
				<div
					className={cn(
						"rounded-xl border p-3 text-sm",
						tone.contextPanel,
						tone.metaText,
					)}
				>
					{document.context}
				</div>
			) : null}
			<Separator />
			<ScrollArea
				className={cn("h-[44vh] rounded-2xl border", tone.scrollFrame)}
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
	tone,
}: {
	document: SearchLabLoaderData["document"];
	onDocumentClose: () => void;
	tone: PrototypeTone;
}) {
	return (
		<Card className={cn("min-w-0", tone.surfaceCard)}>
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
					className={tone.secondaryAction}
				>
					Clear
				</Button>
			</CardHeader>
			<CardContent className="min-w-0">
				<DocumentBody document={document} tone={tone} />
			</CardContent>
		</Card>
	);
}

function DocumentSheet({
	document,
	onOpenChange,
	tone,
}: {
	document: SearchLabLoaderData["document"];
	onOpenChange: (open: boolean) => void;
	tone: PrototypeTone;
}) {
	return (
		<Sheet open={document !== null} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-2xl">
				<SheetHeader>
					<SheetTitle>Document preview</SheetTitle>
					<SheetDescription>
						Right-side sheet for scanning a note without leaving the result
						table.
					</SheetDescription>
				</SheetHeader>
				<div className="px-6 pb-6">
					<DocumentBody document={document} tone={tone} />
				</div>
			</SheetContent>
		</Sheet>
	);
}

function DocumentDrawer({
	document,
	onOpenChange,
	tone,
}: {
	document: SearchLabLoaderData["document"];
	onOpenChange: (open: boolean) => void;
	tone: PrototypeTone;
}) {
	return (
		<Sheet open={document !== null} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="max-h-[82vh] w-full">
				<SheetHeader>
					<SheetTitle>Note drawer</SheetTitle>
					<SheetDescription>
						Bottom drawer prototype that keeps the command list in place.
					</SheetDescription>
				</SheetHeader>
				<div className="px-6 pb-6">
					<DocumentBody document={document} tone={tone} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
