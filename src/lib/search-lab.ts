import { categoryDefinitions } from "@/lib/qmd/categories";
import {
	browseVaultNotes,
	getVaultDocument,
	getVaultOverview,
	searchVaultNotes,
} from "@/lib/qmd/server";

export type SearchMode = "search" | "vsearch" | "query";

export type SearchLabRouteState = {
	query: string;
	collection: string;
	limit: number;
	mode: SearchMode;
	minScore: number | undefined;
	explain: boolean;
	docid: string;
};

export type SearchLabItem =
	| {
			kind: "search";
			docid: string;
			title: string;
			displayPath: string;
			score: number;
			context: string | null;
			snippet: string;
	  }
	| {
			kind: "browse";
			docid: string;
			title: string;
			displayPath: string;
			collectionName: string;
			modifiedAt: string;
	  };

export type SearchLabLoaderData = {
	overview: Extract<Awaited<ReturnType<typeof getVaultOverview>>, { ok: true }>;
	items: Array<SearchLabItem>;
	document:
		| Extract<
				Awaited<ReturnType<typeof getVaultDocument>>,
				{ ok: true }
		  >["data"]
		| null;
	errors: Array<{
		command: string;
		message: string;
		details: string;
	}>;
};

export const defaultSearchLabRouteState: SearchLabRouteState = {
	query: "",
	collection: "",
	limit: 12,
	mode: "search",
	minScore: undefined,
	explain: false,
	docid: "",
};

function readSearchValue(value: unknown) {
	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value) && typeof value[0] === "string") {
		return value[0];
	}

	return undefined;
}

function clampNumber(value: number, minimum: number, maximum: number) {
	return Math.min(Math.max(value, minimum), maximum);
}

function parseNumber(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | undefined) {
	return value === "true" || value === "1";
}

function parseMode(value: string | undefined): SearchMode {
	if (value === "search" || value === "vsearch" || value === "query") {
		return value;
	}

	return defaultSearchLabRouteState.mode;
}

export function validateSearchLabRoute(
	input: Record<string, unknown>,
): SearchLabRouteState {
	const query =
		readSearchValue(input["query"])?.trim() ?? defaultSearchLabRouteState.query;
	const collection =
		readSearchValue(input["collection"])?.trim() ??
		defaultSearchLabRouteState.collection;
	const docid =
		readSearchValue(input["docid"])?.trim() ?? defaultSearchLabRouteState.docid;
	const limit = clampNumber(
		parseNumber(readSearchValue(input["limit"])) ??
			defaultSearchLabRouteState.limit,
		1,
		24,
	);
	const minScore = parseNumber(readSearchValue(input["minScore"]));

	return {
		query,
		collection,
		limit,
		mode: parseMode(readSearchValue(input["mode"])),
		minScore,
		explain: parseBoolean(readSearchValue(input["explain"])),
		docid,
	};
}

export async function loadSearchLabData(
	search: SearchLabRouteState,
): Promise<SearchLabLoaderData> {
	const fallbackOverview = {
		ok: true as const,
		status: {
			totalDocuments: 0,
			needsEmbedding: 0,
			hasVectorIndex: false,
		},
		categories: categoryDefinitions,
		collections: categoryDefinitions.map((category) => ({
			name: category.name,
			documentCount: 0,
			lastModified: null,
			description: category.description,
		})),
		latestDocuments: [],
	} satisfies Extract<
		Awaited<ReturnType<typeof getVaultOverview>>,
		{ ok: true }
	>;

	// Avoid overlapping bridge-backed QMD requests during route loads.
	const errors: SearchLabLoaderData["errors"] = [];
	const overviewResult = await getVaultOverview().catch(() => fallbackOverview);
	const overview = overviewResult.ok ? overviewResult : fallbackOverview;

	if (!overviewResult.ok) {
		errors.push(overviewResult.error);
	}

	const itemsResult = await (search.query
		? searchVaultNotes({
				data: {
					query: search.query,
					collection: search.collection || undefined,
					limit: search.limit,
					mode: search.mode,
					minScore: search.minScore,
					explain: search.explain,
				},
			}).then((result) =>
				result.ok
					? result.data.map(
							(item): SearchLabItem => ({
								kind: "search",
								docid: item.docid,
								title: item.title,
								displayPath: item.displayPath,
								score: item.score,
								context: item.context,
								snippet: item.snippet,
							}),
						)
					: result,
			)
		: browseVaultNotes({
				data: {
					collection: search.collection || undefined,
					limit: search.limit,
				},
			}).then((result) =>
				result.ok
					? result.data.map(
							(item): SearchLabItem => ({
								kind: "browse",
								docid: item.docid,
								title: item.title,
								displayPath: item.displayPath,
								collectionName: item.collectionName,
								modifiedAt: item.modifiedAt,
							}),
						)
					: result,
			));

	const items = Array.isArray(itemsResult) ? itemsResult : [];

	if (!Array.isArray(itemsResult)) {
		errors.push(itemsResult.error);
	}

	const documentResult = search.docid
		? getVaultDocument({
				data: {
					docid: search.docid,
				},
			})
		: null;

	const document = documentResult
		? await documentResult.then((result) => {
				if (!result.ok) {
					errors.push(result.error);
					return null;
				}

				return result.data;
			})
		: null;

	return {
		overview,
		items,
		document,
		errors,
	};
}
