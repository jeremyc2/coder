import * as BunChildProcessSpawner from "@effect/platform-bun/BunChildProcessSpawner";
import { Effect, Layer, Schema, ServiceMap, Stream } from "effect";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner";

const bridgeScript = new URL(
	"../../../../scripts/qmd-bridge.ts",
	import.meta.url,
).pathname;

export class QmdBridgeError extends Schema.TaggedErrorClass<QmdBridgeError>()(
	"QmdBridgeError",
	{
		command: Schema.String,
		message: Schema.String,
	},
) {}

/**
 * Runs the QMD bridge process through Effect's child-process abstractions and
 * decodes structured JSON responses for callers.
 */
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
			const spawner = yield* ChildProcessSpawner;
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
								message: String(error),
							}),
					),
				);
			});

			const buildCommandArgs = Effect.fn("QmdBridge.buildCommandArgs")(
				function* (
					command: string,
					payload: unknown,
				): Effect.fn.Return<Array<string>, QmdBridgeError> {
					switch (command) {
						case "overview": {
							const decodedPayload = yield* decodePayload(
								command,
								payload,
								OverviewPayloadSchema,
							);
							const args = [bridgeScript, "overview"];
							if (decodedPayload.limitPerCollection !== undefined) {
								args.push(
									"--limit-per-collection",
									String(decodedPayload.limitPerCollection),
								);
							}
							return args;
						}

						case "search": {
							const decodedPayload = yield* decodePayload(
								command,
								payload,
								SearchPayloadSchema,
							);
							const args = [
								bridgeScript,
								"search",
								"--query",
								decodedPayload.query,
							];
							if (decodedPayload.collection) {
								args.push("--collection", decodedPayload.collection);
							}
							if (decodedPayload.limit !== undefined) {
								args.push("--limit", String(decodedPayload.limit));
							}
							return args;
						}

						case "vsearch": {
							const decodedPayload = yield* decodePayload(
								command,
								payload,
								VectorSearchPayloadSchema,
							);
							const args = [
								bridgeScript,
								"vsearch",
								"--query",
								decodedPayload.query,
							];
							if (decodedPayload.collection) {
								args.push("--collection", decodedPayload.collection);
							}
							if (decodedPayload.limit !== undefined) {
								args.push("--limit", String(decodedPayload.limit));
							}
							return args;
						}

						case "query": {
							const decodedPayload = yield* decodePayload(
								command,
								payload,
								QueryPayloadSchema,
							);
							const args = [
								bridgeScript,
								"query",
								"--query",
								decodedPayload.query,
							];
							if (decodedPayload.collection) {
								args.push("--collection", decodedPayload.collection);
							}
							if (decodedPayload.limit !== undefined) {
								args.push("--limit", String(decodedPayload.limit));
							}
							if (decodedPayload.minScore !== undefined) {
								args.push("--min-score", String(decodedPayload.minScore));
							}
							if (decodedPayload.explain === true) {
								args.push("--explain");
							}
							return args;
						}

						case "get": {
							const decodedPayload = yield* decodePayload(
								command,
								payload,
								GetPayloadSchema,
							);
							return [bridgeScript, "get", "--docid", decodedPayload.docid];
						}

						case "sync": {
							const decodedPayload = yield* decodePayload(
								command,
								payload,
								SyncPayloadSchema,
							);
							const args = [bridgeScript, "sync"];
							if (decodedPayload.embed === true) {
								args.push("--embed");
							}
							if (decodedPayload.forceEmbed === true) {
								args.push("--force-embed");
							}
							return args;
						}

						default:
							return yield* new QmdBridgeError({
								command,
								message: "Unknown qmd-bridge command.",
							});
					}
				},
			);

			const run = Effect.fn("QmdBridge.run")(function* (
				command: string,
				payload: unknown,
			) {
				return yield* Effect.scoped(
					Effect.gen(function* () {
						const commandArgs = yield* buildCommandArgs(command, payload);
						const child = yield* spawner.spawn(
							ChildProcess.make("bun", commandArgs, {
								cwd: process.cwd(),
							}),
						);

						const [stdout, stderr, exitCode] = yield* Effect.all([
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

						if (exitCode !== 0) {
							return yield* new QmdBridgeError({
								command,
								message:
									stderr.trim() || `qmd-bridge exited with code ${exitCode}`,
							});
						}

						if (stderr.trim()) {
							return yield* new QmdBridgeError({
								command,
								message: stderr.trim(),
							});
						}

						return stdout;
					}).pipe(
						Effect.mapError(
							(error) =>
								new QmdBridgeError({
									command,
									message: String(error),
								}),
						),
					),
				);
			});

			const runAndDecode = Effect.fn("QmdBridge.runAndDecode")(function* <
				TResultSchema extends Schema.Top & { readonly DecodingServices: never },
			>(command: string, payload: unknown, schema: TResultSchema) {
				const response = yield* run(command, payload);
				const responseSchema = Schema.fromJsonString(schema);

				return yield* Schema.decodeUnknownEffect(responseSchema)(response).pipe(
					Effect.mapError(
						(error) =>
							new QmdBridgeError({
								command,
								message: String(error),
							}),
					),
				);
			});

			return QmdBridge.of({
				run,
				runAndDecode,
			});
		}),
	).pipe(Layer.provide(BunChildProcessSpawner.layer));
}
