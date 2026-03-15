#!/usr/bin/env node

/**
 * Runs the hybrid QMD `query` path under Node instead of Bun.
 *
 * Bun's bundled SQLite in this environment does not support dynamic extension
 * loading, which sqlite-vec requires for vector and hybrid retrieval. Node
 * uses better-sqlite3 here, so the sqlite-vec extension loads correctly.
 */

import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import * as NodeRuntime from "@effect/platform-node-shared/NodeRuntime";
import * as NodeStdio from "@effect/platform-node-shared/NodeStdio";
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal";
import { createStore } from "@tobilu/qmd";
import { Effect, Layer, Option, Schema } from "effect";
import { Command, Flag } from "effect/unstable/cli";

class QueryHelperError extends Schema.TaggedErrorClass<QueryHelperError>()(
	"QueryHelperError",
	{
		operation: Schema.String,
		message: Schema.String,
	},
) {}

const VERSION = "0.0.1";
const SearchModeSchema = Schema.Literals(["vsearch", "query"]);

const nodeCliLayer = NodeChildProcessSpawner.layer.pipe(
	Layer.provideMerge(
		Layer.mergeAll(
			NodeFileSystem.layer,
			NodePath.layer,
			NodeStdio.layer,
			NodeTerminal.layer,
		),
	),
);

const command = Command.make(
	"qmd-bridge-query",
	{
		mode: Flag.string("mode").pipe(
			Flag.withDefault("query"),
			Flag.withDescription(
				"Internal helper mode: `vsearch` for vector search or `query` for hybrid search",
			),
		),
		query: Flag.string("query").pipe(
			Flag.withDescription(
				"Natural-language query to run through vector or hybrid search",
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
			Flag.withDescription(
				"Include retrieval score traces in the hybrid query run",
			),
		),
	},
	Effect.fn("qmdBridgeQueryHelper")(function* (args) {
		return yield* Effect.scoped(
			Effect.gen(function* () {
				const mode = yield* Schema.decodeUnknownEffect(SearchModeSchema)(
					args.mode,
				).pipe(
					Effect.mapError(
						(error) =>
							new QueryHelperError({
								operation: "decode-mode",
								message: String(error),
							}),
					),
				);
				const store = yield* Effect.acquireRelease(
					Effect.tryPromise({
						try: () =>
							createStore({
								dbPath: "private/qmd/index.sqlite",
							}),
						catch: (error) =>
							new QueryHelperError({
								operation: "create-store",
								message: error instanceof Error ? error.message : String(error),
							}),
					}),
					(store) =>
						Effect.tryPromise({
							try: () => store.close(),
							catch: (error) =>
								new QueryHelperError({
									operation: "close-store",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						}).pipe(Effect.orDie),
				);

				const collection = Option.isSome(args.collection)
					? args.collection.value
					: undefined;
				const minScore = Option.isSome(args.minScore)
					? args.minScore.value
					: undefined;

				const results =
					mode === "query"
						? yield* Effect.tryPromise({
								try: () =>
									store.search({
										query: args.query,
										collection,
										limit: args.limit,
										minScore,
										explain: args.explain,
									}),
								catch: (error) =>
									new QueryHelperError({
										operation: mode,
										message:
											error instanceof Error ? error.message : String(error),
									}),
							})
						: yield* Effect.tryPromise({
								try: () =>
									store.searchVector(args.query, {
										collection,
										limit: args.limit,
									}),
								catch: (error) =>
									new QueryHelperError({
										operation: mode,
										message:
											error instanceof Error ? error.message : String(error),
									}),
							});

				yield* Effect.sync(() => {
					process.stdout.write(JSON.stringify(results));
				});
			}),
		);
	}),
).pipe(
	Command.withDescription(
		"Run vector-only or hybrid retrieval under Node when sqlite-vec is required.",
	),
);

const program = Command.runWith(command, { version: VERSION })(
	process.argv.slice(2),
).pipe(Effect.provide(nodeCliLayer));

NodeRuntime.runMain(program);
