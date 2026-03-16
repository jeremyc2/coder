import * as BunChildProcessSpawner from "@effect/platform-bun/BunChildProcessSpawner";
import { Effect, Layer, Schema, ServiceMap } from "effect";
import { QmdBridgeScript } from "./QmdBridgeScript";

export class QmdBridgeError extends Schema.TaggedErrorClass<QmdBridgeError>()(
	"QmdBridgeError",
	{
		command: Schema.String,
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

function describeUnknownError(error: unknown): string {
	const message =
		readStringProperty(error, "message") ??
		readStringProperty(error, "cause") ??
		(error instanceof Error ? error.message : undefined);

	if (message) {
		const operation = readStringProperty(error, "operation");
		const tag = readStringProperty(error, "_tag");

		if (operation && tag) {
			return `${tag} (${operation}): ${message}`;
		}

		if (operation) {
			return `${operation}: ${message}`;
		}

		if (tag) {
			return `${tag}: ${message}`;
		}

		return message;
	}

	return String(error);
}

const OverviewPayloadSchema = Schema.Struct({
	limitPerCollection: Schema.optional(Schema.Number),
});

const SearchPayloadSchema = Schema.Struct({
	query: Schema.String,
	collection: Schema.optional(Schema.String),
	limit: Schema.optional(Schema.Number),
});

const VectorSearchPayloadSchema = Schema.Struct({
	query: Schema.String,
	collection: Schema.optional(Schema.String),
	limit: Schema.optional(Schema.Number),
});

const QueryPayloadSchema = Schema.Struct({
	query: Schema.String,
	collection: Schema.optional(Schema.String),
	limit: Schema.optional(Schema.Number),
	minScore: Schema.optional(Schema.Number),
	explain: Schema.optional(Schema.Boolean),
});

const BrowsePayloadSchema = Schema.Struct({
	collection: Schema.optional(Schema.String),
	limit: Schema.optional(Schema.Number),
});

const GetPayloadSchema = Schema.Struct({
	docid: Schema.String,
});

const SyncPayloadSchema = Schema.Struct({
	embed: Schema.optional(Schema.Boolean),
	forceEmbed: Schema.optional(Schema.Boolean),
});

export class QmdBridge extends ServiceMap.Service<
	QmdBridge,
	{
		run(
			command: string,
			payload: unknown,
		): Effect.Effect<string, QmdBridgeError>;
		runAndDecode<
			TResultSchema extends Schema.Top & { readonly DecodingServices: never },
		>(
			command: string,
			payload: unknown,
			schema: TResultSchema,
		): Effect.Effect<TResultSchema["Type"], QmdBridgeError>;
	}
>()("vault/effect/services/QmdBridge") {
	static readonly layer = Layer.effect(
		QmdBridge,
		Effect.gen(function* () {
			const bridgeScript = yield* QmdBridgeScript;
			const decodePayload = Effect.fn("QmdBridge.decodePayload")(function* <
				TSchema extends Schema.Top & { readonly DecodingServices: never },
			>(
				command: string,
				payload: unknown,
				schema: TSchema,
			): Effect.fn.Return<TSchema["Type"], QmdBridgeError> {
				return yield* Schema.decodeUnknownEffect(schema)(payload).pipe(
					Effect.mapError(
						(error) =>
							new QmdBridgeError({
								command,
								message: describeUnknownError(error),
							}),
					),
				);
			});

			const mapScriptError = (command: string) =>
				Effect.mapError(
					(error: unknown) =>
						new QmdBridgeError({
							command,
							message: describeUnknownError(error),
						}),
				);

			const execute = Effect.fn("QmdBridge.execute")(function* (
				command: string,
				payload: unknown,
			): Effect.fn.Return<unknown, QmdBridgeError> {
				switch (command) {
					case "overview": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							OverviewPayloadSchema,
						);
						return yield* bridgeScript
							.overview({
								limitPerCollection: decodedPayload.limitPerCollection ?? 10,
							})
							.pipe(mapScriptError(command));
					}

					case "search": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							SearchPayloadSchema,
						);
						return yield* bridgeScript
							.search({
								query: decodedPayload.query,
								collection: decodedPayload.collection,
								limit: decodedPayload.limit ?? 10,
							})
							.pipe(mapScriptError(command));
					}

					case "vsearch": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							VectorSearchPayloadSchema,
						);
						return yield* bridgeScript
							.vsearch({
								query: decodedPayload.query,
								collection: decodedPayload.collection,
								limit: decodedPayload.limit ?? 10,
							})
							.pipe(mapScriptError(command));
					}

					case "query": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							QueryPayloadSchema,
						);
						return yield* bridgeScript
							.query({
								query: decodedPayload.query,
								collection: decodedPayload.collection,
								limit: decodedPayload.limit ?? 10,
								minScore: decodedPayload.minScore,
								explain: decodedPayload.explain ?? false,
							})
							.pipe(mapScriptError(command));
					}

					case "browse": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							BrowsePayloadSchema,
						);
						return yield* bridgeScript
							.browse({
								collection: decodedPayload.collection,
								limit: decodedPayload.limit ?? 24,
							})
							.pipe(mapScriptError(command));
					}

					case "get": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							GetPayloadSchema,
						);
						return yield* bridgeScript
							.getDocument({
								docid: decodedPayload.docid,
							})
							.pipe(mapScriptError(command));
					}

					case "sync": {
						const decodedPayload = yield* decodePayload(
							command,
							payload,
							SyncPayloadSchema,
						);
						return yield* bridgeScript
							.sync({
								embed: decodedPayload.embed ?? false,
								forceEmbed: decodedPayload.forceEmbed ?? false,
							})
							.pipe(mapScriptError(command));
					}

					default:
						return yield* new QmdBridgeError({
							command,
							message: "Unknown qmd-bridge command.",
						});
				}
			});

			const run = Effect.fn("QmdBridge.run")(function* (
				command: string,
				payload: unknown,
			) {
				const result = yield* execute(command, payload);

				return yield* Schema.encodeUnknownEffect(Schema.UnknownFromJsonString)(
					result,
				).pipe(
					Effect.mapError(
						(error) =>
							new QmdBridgeError({
								command,
								message: describeUnknownError(error),
							}),
					),
				);
			});

			const runAndDecode = Effect.fn("QmdBridge.runAndDecode")(function* <
				TResultSchema extends Schema.Top & { readonly DecodingServices: never },
			>(command: string, payload: unknown, schema: TResultSchema) {
				const result = yield* execute(command, payload);

				return yield* Schema.decodeUnknownEffect(schema)(result).pipe(
					Effect.mapError(
						(error) =>
							new QmdBridgeError({
								command,
								message: describeUnknownError(error),
							}),
					),
				);
			});

			return QmdBridge.of({
				run,
				runAndDecode,
			});
		}),
	).pipe(
		Layer.provide(QmdBridgeScript.layer),
		Layer.provide(BunChildProcessSpawner.layer),
	);
}
