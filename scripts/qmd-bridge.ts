#!/usr/bin/env bun
/**
 * Provides a small process boundary around QMD store operations for the app
 * and other scripts.
 *
 * The bridge opens the QMD store, applies the configured collection context,
 * runs a single command such as overview, search, get, or sync, and prints a
 * JSON response to stdout so callers can treat QMD access as a typed request.
 */

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { QmdBridgeScript } from "../src/lib/effect/services/QmdBridgeScript";

const VERSION = "0.0.1";

const overview = Command.make(
	"overview",
	{
		limitPerCollection: Flag.integer("limit-per-collection").pipe(
			Flag.withDefault(10),
			Flag.withDescription(
				"Maximum number of recent documents to return per collection",
			),
		),
	},
	Effect.fn("qmdBridgeOverview")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.overview(args);
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(
	Command.withDescription(
		"Return index status, collections, and recent notes.",
	),
);

// `search` is the fast BM25 / FTS-only path. Use it for exact keywords when
// speed matters more than semantic matching or reranking quality.
const search = Command.make(
	"search",
	{
		query: Flag.string("query").pipe(
			Flag.withDescription("Search query to run against the local QMD index"),
		),
		collection: Flag.optional(
			Flag.string("collection").pipe(
				Flag.withDescription("Optional collection name to scope the search to"),
			),
		),
		limit: Flag.integer("limit").pipe(
			Flag.withDefault(10),
			Flag.withDescription("Maximum number of search results to return"),
		),
	},
	Effect.fn("qmdBridgeSearch")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.search({
			query: args.query,
			collection: Option.getOrUndefined(args.collection),
			limit: args.limit,
		});
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(Command.withDescription("Run a lexical search against indexed notes."));

// `query` is the higher-quality hybrid path. QMD expands the query, combines
// lexical and vector retrieval, and reranks the best candidates locally.
// `vsearch` sits between the two: semantic/vector retrieval only, with no
// reranking, so it is usually slower than `search` and faster than `query`.
const vsearch = Command.make(
	"vsearch",
	{
		query: Flag.string("query").pipe(
			Flag.withDescription(
				"Semantic search query to run against the local QMD index",
			),
		),
		collection: Flag.optional(
			Flag.string("collection").pipe(
				Flag.withDescription(
					"Optional collection name to scope the vector search to",
				),
			),
		),
		limit: Flag.integer("limit").pipe(
			Flag.withDefault(10),
			Flag.withDescription("Maximum number of vector search results to return"),
		),
	},
	Effect.fn("qmdBridgeVsearch")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.vsearch({
			query: args.query,
			collection: Option.getOrUndefined(args.collection),
			limit: args.limit,
		});
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(
	Command.withDescription(
		"Run semantic vector retrieval without hybrid reranking.",
	),
);

// `query` is the higher-quality hybrid path. QMD expands the query, combines
// lexical and vector retrieval, and reranks the best candidates locally.
const query = Command.make(
	"query",
	{
		query: Flag.string("query").pipe(
			Flag.withDescription(
				"Natural-language query to run through hybrid search",
			),
		),
		collection: Flag.optional(
			Flag.string("collection").pipe(
				Flag.withDescription("Optional collection name to scope the query to"),
			),
		),
		limit: Flag.integer("limit").pipe(
			Flag.withDefault(10),
			Flag.withDescription("Maximum number of hybrid search results to return"),
		),
		minScore: Flag.optional(
			Flag.float("min-score").pipe(
				Flag.withDescription("Optional minimum score threshold"),
			),
		),
		explain: Flag.boolean("explain").pipe(
			Flag.withDescription("Include retrieval score traces in the query run"),
		),
	},
	Effect.fn("qmdBridgeQuery")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.query({
			query: args.query,
			collection: Option.getOrUndefined(args.collection),
			limit: args.limit,
			minScore: Option.getOrUndefined(args.minScore),
			explain: args.explain,
		});
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(
	Command.withDescription(
		"Run hybrid retrieval with query expansion, vector search, and reranking.",
	),
);

const browse = Command.make(
	"browse",
	{
		collection: Flag.optional(
			Flag.string("collection").pipe(
				Flag.withDescription(
					"Optional collection name to scope the browse view",
				),
			),
		),
		limit: Flag.integer("limit").pipe(
			Flag.withDefault(24),
			Flag.withDescription("Maximum number of notes to return"),
		),
	},
	Effect.fn("qmdBridgeBrowse")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.browse({
			collection: Option.getOrUndefined(args.collection),
			limit: args.limit,
		});
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(
	Command.withDescription(
		"List recent notes across the vault or a collection.",
	),
);

// `get` retrieves a single note by docid, which is the follow-up step after
// either lexical `search` or hybrid `query`.
const getDocument = Command.make(
	"get",
	{
		docid: Flag.string("docid").pipe(
			Flag.withDescription("Document id to fetch, with or without a leading #"),
		),
	},
	Effect.fn("qmdBridgeGet")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.getDocument(args);
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(Command.withDescription("Fetch a single note by docid."));

const sync = Command.make(
	"sync",
	{
		embed: Flag.boolean("embed").pipe(
			Flag.withDescription("Run embeddings after the index update"),
		),
		forceEmbed: Flag.boolean("force-embed").pipe(
			Flag.withDescription("Force regeneration of embeddings"),
		),
	},
	Effect.fn("qmdBridgeSync")(function* (args) {
		const bridge = yield* QmdBridgeScript;
		const output = yield* bridge.sync(args);
		yield* Effect.sync(() => {
			process.stdout.write(JSON.stringify(output));
		});
	}),
).pipe(Command.withDescription("Update the QMD index and optionally embed."));

const command = Command.make("qmd-bridge").pipe(
	Command.withDescription("Run typed QMD bridge commands for the app."),
	Command.withSubcommands([
		overview,
		search,
		vsearch,
		query,
		browse,
		getDocument,
		sync,
	]),
);

const bridgeLayer = QmdBridgeScript.layer.pipe(
	Layer.provide(BunServices.layer),
);

const program = Command.runWith(command, { version: VERSION })(
	process.argv.slice(2),
).pipe(Effect.provide(Layer.mergeAll(BunServices.layer, bridgeLayer)));

BunRuntime.runMain(program);
