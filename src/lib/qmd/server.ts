import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { categoryDefinitions } from "./categories";

type SearchInput = {
	query?: string;
	collection?: string;
	limit?: number;
	mode?: "search" | "vsearch" | "query";
	minScore?: number;
	explain?: boolean;
};

type DocumentInput = {
	docid: string;
};

type BrowseInput = {
	collection?: string;
	limit?: number;
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

const VaultBrowseResultSchema = Schema.mutable(
	Schema.Array(
		Schema.Struct({
			collectionName: Schema.String,
			displayPath: Schema.String,
			title: Schema.String,
			docid: Schema.String,
			modifiedAt: Schema.String,
		}),
	),
);

class VaultRequestError extends Schema.TaggedErrorClass<VaultRequestError>()(
	"VaultRequestError",
	{
		message: Schema.String,
	},
) {}

function readStringProperty(value: unknown, key: string): string | undefined {
	if (typeof value !== "object" || value === null || !(key in value)) {
		return undefined;
	}

	const property = Reflect.get(value, key);
	return typeof property === "string" ? property : undefined;
}

type QmdServerResult<T> =
	| {
			ok: true;
			data: T;
	  }
	| {
			ok: false;
			error: {
				command: string;
				message: string;
				details: string;
			};
	  };

function parseSearchInput(input: SearchInput | undefined) {
	const query = input?.query?.trim();
	const collection = input?.collection?.trim();

	return {
		query: query ? query : undefined,
		collection: collection ? collection : undefined,
		limit: Math.min(Math.max(input?.limit ?? 12, 1), 24),
		mode: input?.mode ?? "search",
		minScore:
			typeof input?.minScore === "number" && Number.isFinite(input.minScore)
				? input.minScore
				: undefined,
		explain: input?.explain === true,
	};
}

function parseBrowseInput(input: BrowseInput | undefined) {
	const collection = input?.collection?.trim();

	return {
		collection: collection ? collection : undefined,
		limit: Math.min(Math.max(input?.limit ?? 24, 1), 50),
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

async function runQmdBridgeResult<
	TPayload,
	TResultSchema extends Schema.Top & { readonly DecodingServices: never },
>(
	command: string,
	payload: TPayload,
	schema: TResultSchema,
): Promise<QmdServerResult<TResultSchema["Type"]>> {
	return Effect.tryPromise({
		try: async () => {
			const { runQmdBridge } = await import("./bridge");
			return runQmdBridge(command, payload, schema);
		},
		catch: (error) => {
			const details =
				error instanceof Error && error.stack ? error.stack : String(error);
			const commandName = readStringProperty(error, "command");
			const message = readStringProperty(error, "message");

			if (commandName && message) {
				return {
					command: commandName,
					message,
					details,
				};
			}

			return {
				command,
				message: error instanceof Error ? error.message : String(error),
				details,
			};
		},
	}).pipe(
		Effect.match({
			onFailure: (error) => ({
				ok: false as const,
				error,
			}),
			onSuccess: (data) => ({
				ok: true as const,
				data,
			}),
		}),
		Effect.runPromise,
	);
}

export const getVaultOverview = createServerFn({ method: "GET" }).handler(
	async () => {
		const result = await runQmdBridgeResult(
			"overview",
			{ limitPerCollection: 10 },
			VaultOverviewSchema,
		);

		if (!result.ok) {
			return result;
		}

		const { status, collections, latestDocuments } = result.data;

		return {
			ok: true as const,
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
			return {
				ok: true as const,
				data: [],
			};
		}

		return runQmdBridgeResult(
			data.mode,
			{
				query: data.query,
				collection: data.collection,
				limit: data.limit,
				minScore: data.minScore,
				explain: data.explain,
			},
			VaultSearchResultSchema,
		);
	});

export const browseVaultNotes = createServerFn({ method: "GET" })
	.inputValidator(parseBrowseInput)
	.handler(async ({ data }) => {
		return runQmdBridgeResult(
			"browse",
			{
				collection: data.collection,
				limit: data.limit,
			},
			VaultBrowseResultSchema,
		);
	});

export const getVaultDocument = createServerFn({ method: "GET" })
	.inputValidator((input: DocumentInput | undefined) => input)
	.handler(async ({ data }) => {
		const documentInput = await Effect.runPromise(parseDocumentInput(data));
		return runQmdBridgeResult(
			"get",
			{ docid: documentInput.docid },
			VaultDocumentSchema,
		);
	});
