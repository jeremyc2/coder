import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { runQmdBridge } from "./bridge";
import { categoryDefinitions } from "./categories";

type SearchInput = {
	query?: string;
	collection?: string;
	limit?: number;
	mode?: "search" | "vsearch" | "query";
};

type DocumentInput = {
	docid: string;
};

const VaultOverviewSchema = Schema.Struct({
	status: Schema.Struct({
		totalDocuments: Schema.Number,
		needsEmbedding: Schema.Number,
		hasVectorIndex: Schema.Boolean,
	}),
	collections: Schema.mutable(
		Schema.Array(
			Schema.Struct({
				name: Schema.String,
				active_count: Schema.Number,
				last_modified: Schema.NullOr(Schema.String),
			}),
		),
	),
	latestDocuments: Schema.mutable(
		Schema.Array(
			Schema.Struct({
				collectionName: Schema.String,
				path: Schema.String,
				title: Schema.String,
				docid: Schema.String,
				modifiedAt: Schema.String,
			}),
		),
	),
});

const VaultSearchResultSchema = Schema.mutable(
	Schema.Array(
		Schema.Struct({
			docid: Schema.String,
			title: Schema.String,
			displayPath: Schema.String,
			score: Schema.Number,
			context: Schema.NullOr(Schema.String),
			snippet: Schema.String,
		}),
	),
);

const VaultDocumentSchema = Schema.Union([
	Schema.Struct({
		found: Schema.Literal(true),
		docid: Schema.String,
		title: Schema.String,
		displayPath: Schema.String,
		context: Schema.NullOr(Schema.String),
		body: Schema.String,
		collectionName: Schema.String,
		modifiedAt: Schema.String,
	}),
	Schema.Struct({
		found: Schema.Literal(false),
		query: Schema.String,
		similarFiles: Schema.mutable(Schema.Array(Schema.String)),
	}),
]);

class VaultRequestError extends Schema.TaggedErrorClass<VaultRequestError>()(
	"VaultRequestError",
	{
		message: Schema.String,
	},
) {}

function parseSearchInput(input: SearchInput | undefined) {
	const query = input?.query?.trim();
	const collection = input?.collection?.trim();

	return {
		query: query ? query : undefined,
		collection: collection ? collection : undefined,
		limit: Math.min(Math.max(input?.limit ?? 12, 1), 24),
		mode: input?.mode ?? "search",
	};
}

const parseDocumentInput = Effect.fn("parseDocumentInput")(function* (
	input: DocumentInput | undefined,
): Effect.fn.Return<{ docid: string }, VaultRequestError> {
	if (!input?.docid?.trim()) {
		return yield* new VaultRequestError({
			message: "A docid is required.",
		});
	}

	return {
		// Match one optional leading `#` so callers can pass either `abc123` or `#abc123`.
		docid: input.docid.trim().replace(/^#/, ""),
	};
});

export const getVaultOverview = createServerFn({ method: "GET" }).handler(
	async () => {
		const { status, collections, latestDocuments } = await runQmdBridge(
			"overview",
			{ limitPerCollection: 10 },
			VaultOverviewSchema,
		);

		return {
			status,
			categories: categoryDefinitions,
			collections: collections.map((collection) => ({
				name: collection.name,
				documentCount: collection.active_count,
				lastModified: collection.last_modified,
				description:
					categoryDefinitions.find(
						(category) => category.name === collection.name,
					)?.description ?? "",
			})),
			latestDocuments,
		};
	},
);

export const searchVaultNotes = createServerFn({ method: "GET" })
	.inputValidator(parseSearchInput)
	.handler(async ({ data }) => {
		if (!data.query) {
			return [];
		}

		return runQmdBridge(
			data.mode,
			{
				query: data.query,
				collection: data.collection,
				limit: data.limit,
			},
			VaultSearchResultSchema,
		);
	});

export const getVaultDocument = createServerFn({ method: "GET" })
	.inputValidator((input: DocumentInput | undefined) => input)
	.handler(async ({ data }) => {
		const documentInput = await Effect.runPromise(parseDocumentInput(data));
		return runQmdBridge(
			"get",
			{ docid: documentInput.docid },
			VaultDocumentSchema,
		);
	});
