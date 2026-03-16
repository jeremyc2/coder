import { createStore, type QMDStore } from "@tobilu/qmd";
import { Effect, Layer, Schema, ServiceMap, Stream } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";
import { simplifyContext, stripFrontmatter } from "../../qmd/bridgeUtils";
import {
	qmdCollectionEntries,
	qmdDbPath,
	qmdGlobalContext,
} from "../../qmd/config";

const queryHelperScript = new URL(
	"../../../../scripts/qmd-bridge-query.ts",
	import.meta.url,
).pathname;
const workspaceRoot = new URL("../../../../", import.meta.url).pathname;
const explicitNodeBinary = process.env["QMD_NODE_BINARY"];
const pathDelimiter = process.platform === "win32" ? ";" : ":";

const QueryHelperResultsSchema = Schema.fromJsonString(
	Schema.Array(
		Schema.Struct({
			docid: Schema.String,
			title: Schema.String,
			displayPath: Schema.String,
			score: Schema.Number,
			context: Schema.NullOr(Schema.String),
			body: Schema.String,
		}),
	),
);

export class BridgeStoreError extends Schema.TaggedErrorClass<BridgeStoreError>()(
	"BridgeStoreError",
	{
		operation: Schema.String,
		message: Schema.String,
	},
) {}

function isBunBackedBinary(pathLike: string): boolean {
	return (
		pathLike.endsWith("/bun") ||
		pathLike.includes("/.bun/") ||
		pathLike.includes("/private/tmp/bun-node-")
	);
}

export type BridgeOverviewArgs = {
	limitPerCollection: number;
};

export type BridgeSearchArgs = {
	query: string;
	collection?: string;
	limit: number;
};

export type BridgeVectorSearchArgs = {
	query: string;
	collection?: string;
	limit: number;
};

export type BridgeQueryArgs = {
	query: string;
	collection?: string;
	limit: number;
	minScore?: number;
	explain: boolean;
};

export type BridgeBrowseArgs = {
	collection?: string;
	limit: number;
};

export type BridgeGetArgs = {
	docid: string;
};

export type BridgeSyncArgs = {
	embed: boolean;
	forceEmbed: boolean;
};

/**
 * Runs QMD store commands inside Effect so the bridge CLI can stay focused on
 * command parsing and process exit behavior.
 */
export class QmdBridgeScript extends ServiceMap.Service<
	QmdBridgeScript,
	{
		overview(
			args: BridgeOverviewArgs,
		): Effect.Effect<unknown, BridgeStoreError>;
		search(args: BridgeSearchArgs): Effect.Effect<unknown, BridgeStoreError>;
		vsearch(
			args: BridgeVectorSearchArgs,
		): Effect.Effect<unknown, BridgeStoreError>;
		query(args: BridgeQueryArgs): Effect.Effect<unknown, BridgeStoreError>;
		browse(args: BridgeBrowseArgs): Effect.Effect<unknown, BridgeStoreError>;
		getDocument(args: BridgeGetArgs): Effect.Effect<unknown, BridgeStoreError>;
		sync(args: BridgeSyncArgs): Effect.Effect<unknown, BridgeStoreError>;
	}
>()("vault/effect/services/QmdBridgeScript") {
	static readonly layer = Layer.effect(
		QmdBridgeScript,
		Effect.gen(function* () {
			const spawner = yield* ChildProcessSpawner;
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;

			const resolveRealPath = Effect.fn("QmdBridgeScript.resolveRealPath")(
				function* (
					operation: string,
					pathLike: string,
				): Effect.fn.Return<string, BridgeStoreError> {
					return yield* fs.realPath(pathLike).pipe(
						Effect.mapError(
							(error) =>
								new BridgeStoreError({
									operation,
									message: String(error),
								}),
						),
					);
				},
			);

			const isExecutableFile = Effect.fn("QmdBridgeScript.isExecutableFile")(
				function* (
					pathLike: string,
				): Effect.fn.Return<boolean, BridgeStoreError> {
					const pathExists = yield* fs.exists(pathLike).pipe(
						Effect.mapError(
							(error) =>
								new BridgeStoreError({
									operation: "resolve-node-binary-exists",
									message: String(error),
								}),
						),
					);

					if (!pathExists) {
						return false;
					}

					const stats = yield* fs.stat(pathLike).pipe(
						Effect.mapError(
							(error) =>
								new BridgeStoreError({
									operation: "resolve-node-binary-stat",
									message: String(error),
								}),
						),
					);

					// Check if the file is executable
					return stats.type === "File" && (stats.mode & 0o111) !== 0;
				},
			);

			const resolveNodeBinaryPath = Effect.fn(
				"QmdBridgeScript.resolveNodeBinaryPath",
			)(function* (): Effect.fn.Return<string | undefined, BridgeStoreError> {
				if (explicitNodeBinary) {
					const explicitBinaryIsExecutable =
						yield* isExecutableFile(explicitNodeBinary);

					if (explicitBinaryIsExecutable) {
						const resolvedExplicitBinary = yield* resolveRealPath(
							"resolve-node-binary-realpath-explicit",
							explicitNodeBinary,
						);

						if (!isBunBackedBinary(resolvedExplicitBinary)) {
							return resolvedExplicitBinary;
						}
					}
				}

				const pathValue = process.env["PATH"];

				if (!pathValue) {
					return undefined;
				}

				for (const segment of pathValue.split(pathDelimiter)) {
					if (!segment) {
						continue;
					}

					const candidate = path.join(segment, "node");
					const candidateIsExecutable = yield* isExecutableFile(candidate);

					if (!candidateIsExecutable) {
						continue;
					}

					const resolvedCandidate = yield* resolveRealPath(
						"resolve-node-binary-realpath-path",
						candidate,
					);

					if (isBunBackedBinary(resolvedCandidate)) {
						continue;
					}

					return resolvedCandidate;
				}

				return undefined;
			});

			const nodeBinaryPath = yield* resolveNodeBinaryPath();

			const withStore = Effect.fn("QmdBridgeScript.withStore")(function* <T>(
				fn: (store: QMDStore) => Effect.Effect<T, BridgeStoreError>,
			): Effect.fn.Return<T, BridgeStoreError> {
				return yield* Effect.scoped(
					Effect.gen(function* () {
						const store = yield* Effect.acquireRelease(
							Effect.tryPromise({
								try: () =>
									createStore({
										dbPath: qmdDbPath,
										config: {
											collections: Object.fromEntries(
												qmdCollectionEntries.map((collection) => [
													collection.name,
													{
														path: collection.path,
														pattern: collection.pattern,
													},
												]),
											),
										},
									}),
								catch: (error) =>
									new BridgeStoreError({
										operation: "create-store",
										message:
											error instanceof Error ? error.message : String(error),
									}),
							}),
							(store) =>
								Effect.tryPromise({
									try: () => store.close(),
									catch: (error) =>
										new BridgeStoreError({
											operation: "close-store",
											message:
												error instanceof Error ? error.message : String(error),
										}),
								}).pipe(Effect.orDie),
						);
						yield* Effect.tryPromise({
							try: () => store.setGlobalContext(qmdGlobalContext),
							catch: (error) =>
								new BridgeStoreError({
									operation: "set-global-context",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						for (const collection of qmdCollectionEntries) {
							yield* Effect.tryPromise({
								try: () =>
									store.addContext(collection.name, "/", collection.context),
								catch: (error) =>
									new BridgeStoreError({
										operation: "add-context",
										message:
											error instanceof Error ? error.message : String(error),
									}),
							});
						}

						return yield* fn(store);
					}),
				);
			});

			const overview = Effect.fn("QmdBridgeScript.overview")(function* (
				args: BridgeOverviewArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* withStore(
					Effect.fn("QmdBridgeScript.overview.withStore")(function* (store) {
						const [status, collections] = yield* Effect.all([
							Effect.tryPromise({
								try: () => store.getStatus(),
								catch: (error) =>
									new BridgeStoreError({
										operation: "get-status",
										message:
											error instanceof Error ? error.message : String(error),
									}),
							}),
							Effect.tryPromise({
								try: () => store.listCollections(),
								catch: (error) =>
									new BridgeStoreError({
										operation: "list-collections",
										message:
											error instanceof Error ? error.message : String(error),
									}),
							}),
						]);
						const latestDocuments = yield* Effect.try({
							try: () =>
								store.internal.db
									.prepare(
										`
              SELECT
                collection AS collectionName,
                path,
                title,
                substr(hash, 1, 6) AS docid,
                modified_at AS modifiedAt
              FROM (
                SELECT
                  collection,
                  path,
                  title,
                  hash,
                  modified_at,
                  ROW_NUMBER() OVER (
                    PARTITION BY collection
                    ORDER BY modified_at DESC, title ASC
                  ) AS row_number
                FROM documents
                WHERE active = 1
              )
              WHERE row_number <= ?
              ORDER BY collectionName ASC, modifiedAt DESC, title ASC
            `,
									)
									.all(args.limitPerCollection),
							catch: (error) =>
								new BridgeStoreError({
									operation: "latest-documents-query",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						return { status, collections, latestDocuments };
					}),
				);
			});

			const search = Effect.fn("QmdBridgeScript.search")(function* (
				args: BridgeSearchArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* withStore(
					Effect.fn("QmdBridgeScript.search.withStore")(function* (store) {
						const results = yield* Effect.tryPromise({
							try: () =>
								store.searchLex(args.query, {
									collection: args.collection,
									limit: args.limit,
								}),
							catch: (error) =>
								new BridgeStoreError({
									operation: "search",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						return results.map((result) => ({
							docid: result.docid,
							title: result.title,
							displayPath: result.displayPath,
							score: result.score,
							context: simplifyContext(result.context),
							snippet: stripFrontmatter(result.body ?? ""),
						}));
					}),
				);
			});

			const query = Effect.fn("QmdBridgeScript.query")(function* (
				args: BridgeQueryArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* runNodeBackedSearch("query", args);
			});

			const runNodeBackedSearch = Effect.fn(
				"QmdBridgeScript.runNodeBackedSearch",
			)(function* (
				mode: "query" | "vsearch",
				args: BridgeQueryArgs | BridgeVectorSearchArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				if (!nodeBinaryPath) {
					return yield* new BridgeStoreError({
						operation: `${mode}-resolve-node-binary`,
						message:
							"Unable to resolve a Node binary from QMD_NODE_BINARY or PATH.",
					});
				}

				const commandArgs = [
					queryHelperScript,
					"--mode",
					mode,
					"--query",
					args.query,
					"--limit",
					String(args.limit),
				];

				if (args.collection) {
					commandArgs.push("--collection", args.collection);
				}

				if ("minScore" in args && args.minScore !== undefined) {
					commandArgs.push("--min-score", String(args.minScore));
				}

				if ("explain" in args && args.explain) {
					commandArgs.push("--explain");
				}

				const [stdout, stderr, exitCode] = yield* Effect.scoped(
					Effect.gen(function* () {
						const child = yield* spawner.spawn(
							ChildProcess.make(nodeBinaryPath, commandArgs, {
								cwd: workspaceRoot,
							}),
						);

						return yield* Effect.all([
							Stream.decodeText(child.stdout).pipe(
								Stream.runFold(
									() => "",
									(output, chunk) => output + chunk,
								),
							),
							Stream.decodeText(child.stderr).pipe(
								Stream.runFold(
									() => "",
									(output, chunk) => output + chunk,
								),
							),
							child.exitCode,
						]);
					}),
				).pipe(
					Effect.mapError(
						(error) =>
							new BridgeStoreError({
								operation: `${mode}-spawn`,
								message: String(error),
							}),
					),
				);

				if (exitCode !== 0) {
					return yield* new BridgeStoreError({
						operation: mode,
						message:
							stderr.trim() ||
							`qmd ${mode} helper exited with code ${exitCode} (cwd: ${workspaceRoot})`,
					});
				}

				const results = yield* Schema.decodeUnknownEffect(
					QueryHelperResultsSchema,
				)(stdout).pipe(
					Effect.mapError(
						(error) =>
							new BridgeStoreError({
								operation: `${mode}-parse-json`,
								message: String(error),
							}),
					),
				);

				return results.map((result) => ({
					docid: result.docid,
					title: result.title,
					displayPath: result.displayPath,
					score: result.score,
					context:
						result.context === null ? null : simplifyContext(result.context),
					snippet: stripFrontmatter(result.body),
				}));
			});

			const vsearch = Effect.fn("QmdBridgeScript.vsearch")(function* (
				args: BridgeVectorSearchArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* runNodeBackedSearch("vsearch", args);
			});

			const browse = Effect.fn("QmdBridgeScript.browse")(function* (
				args: BridgeBrowseArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* withStore(
					Effect.fn("QmdBridgeScript.browse.withStore")(function* (store) {
						const documents = yield* Effect.try({
							try: () => {
								if (args.collection) {
									return store.internal.db
										.prepare(
											`
                SELECT
                  collection AS collectionName,
                  path,
                  title,
                  substr(hash, 1, 6) AS docid,
                  modified_at AS modifiedAt
                FROM documents
                WHERE active = 1
                  AND collection = ?
                ORDER BY modified_at DESC, title ASC
                LIMIT ?
              `,
										)
										.all(args.collection, args.limit);
								}

								return store.internal.db
									.prepare(
										`
              SELECT
                collection AS collectionName,
                path,
                title,
                substr(hash, 1, 6) AS docid,
                modified_at AS modifiedAt
              FROM documents
              WHERE active = 1
              ORDER BY modified_at DESC, title ASC
              LIMIT ?
            `,
									)
									.all(args.limit);
							},
							catch: (error) =>
								new BridgeStoreError({
									operation: "browse",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						return documents.map((document) => ({
							collectionName: document.collectionName,
							displayPath: document.path,
							title: document.title,
							docid: document.docid,
							modifiedAt: document.modifiedAt,
						}));
					}),
				);
			});

			const getDocument = Effect.fn("QmdBridgeScript.getDocument")(function* (
				args: BridgeGetArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* withStore(
					Effect.fn("QmdBridgeScript.getDocument.withStore")(function* (store) {
						const document = yield* Effect.tryPromise({
							try: () =>
								store.get(
									// Match one leading `#` so callers can send either raw docids or hash-prefixed docids.
									`#${args.docid.replace(/^#/, "")}`,
									{ includeBody: true },
								),
							catch: (error) =>
								new BridgeStoreError({
									operation: "get-document",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						if ("error" in document) {
							return {
								found: false,
								query: document.query,
								similarFiles: document.similarFiles,
							};
						}

						return {
							found: true,
							docid: document.docid,
							title: document.title,
							displayPath: document.displayPath,
							context: simplifyContext(document.context),
							body: stripFrontmatter(document.body ?? ""),
							collectionName: document.collectionName,
							modifiedAt: document.modifiedAt,
						};
					}),
				);
			});

			const sync = Effect.fn("QmdBridgeScript.sync")(function* (
				args: BridgeSyncArgs,
			): Effect.fn.Return<unknown, BridgeStoreError> {
				return yield* withStore(
					Effect.fn("QmdBridgeScript.sync.withStore")(function* (store) {
						const updateResult = yield* Effect.tryPromise({
							try: () => store.update(),
							catch: (error) =>
								new BridgeStoreError({
									operation: "update",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						const embedResult = args.embed
							? yield* Effect.tryPromise({
									try: () =>
										store.embed({
											force: args.forceEmbed,
										}),
									catch: (error) =>
										new BridgeStoreError({
											operation: "embed",
											message:
												error instanceof Error ? error.message : String(error),
										}),
								})
							: null;
						const status = yield* Effect.tryPromise({
							try: () => store.getStatus(),
							catch: (error) =>
								new BridgeStoreError({
									operation: "get-status",
									message:
										error instanceof Error ? error.message : String(error),
								}),
						});
						return {
							updateResult,
							embedResult,
							status,
						};
					}),
				);
			});

			return QmdBridgeScript.of({
				overview,
				search,
				vsearch,
				query,
				browse,
				getDocument,
				sync,
			});
		}),
	);
}
