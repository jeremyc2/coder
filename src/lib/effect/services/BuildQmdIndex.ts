import { Console, Effect, Layer, Schema, ServiceMap } from "effect";
import { classifyKnowledgeNote } from "../../qmd/categories";
import {
	qmdCollectionEntries,
	qmdCollectionsRoot,
	qmdRoot,
} from "../../qmd/config";
import { KnowledgeNotes } from "./KnowledgeNotes";
import { QmdBridge, type QmdBridgeError } from "./QmdBridge";
import { type FileOperationError, VaultFileSystem } from "./VaultFileSystem";

export type BuildQmdIndexArgs = {
	input: string;
	skipEmbed: boolean;
	forceEmbed: boolean;
	includeTrashed: boolean;
};

const BridgeResultSchema = Schema.Struct({
	updateResult: Schema.Struct({
		indexed: Schema.Number,
		updated: Schema.Number,
		unchanged: Schema.Number,
	}),
	embedResult: Schema.NullOr(
		Schema.Struct({
			chunksEmbedded: Schema.Number,
			docsProcessed: Schema.Number,
		}),
	),
	status: Schema.Struct({
		totalDocuments: Schema.Number,
		collections: Schema.Array(Schema.Unknown),
	}),
});

/**
 * Orchestrates the end-to-end QMD index rebuild by preparing collection
 * folders from vault notes and then invoking the bridge sync command.
 */
export class BuildQmdIndex extends ServiceMap.Service<
	BuildQmdIndex,
	{
		run(
			args: BuildQmdIndexArgs,
		): Effect.Effect<void, FileOperationError | QmdBridgeError>;
	}
>()("vault/effect/services/BuildQmdIndex") {
	static readonly layer = Layer.effect(
		BuildQmdIndex,
		Effect.gen(function* () {
			const fileSystem = yield* VaultFileSystem;
			const notes = yield* KnowledgeNotes;
			const bridge = yield* QmdBridge;

			const run = Effect.fn("BuildQmdIndex.run")(function* (
				args: BuildQmdIndexArgs,
			): Effect.fn.Return<void, FileOperationError | QmdBridgeError> {
				const inputDir = fileSystem.resolveFromCwd(args.input);
				const markdownFiles = yield* notes.walkMarkdownFiles(inputDir, {
					ignoreDirectories: [qmdRoot],
				});
				let preparedNoteCount = 0;

				yield* fileSystem.remove(qmdCollectionsRoot, {
					recursive: true,
					force: true,
				});
				yield* fileSystem.makeDirectory(qmdCollectionsRoot, {
					recursive: true,
				});
				yield* fileSystem.makeDirectory(qmdRoot, { recursive: true });

				for (const filePath of markdownFiles) {
					const note = yield* notes.read(filePath, inputDir);
					if (!args.includeTrashed && note.trashed) {
						continue;
					}

					const category = classifyKnowledgeNote(note);
					const outputPath = fileSystem.join(
						qmdCollectionsRoot,
						category.category.name,
						note.relativePath,
					);

					yield* fileSystem.makeDirectory(fileSystem.dirname(outputPath), {
						recursive: true,
					});
					yield* fileSystem.copyFile(filePath, outputPath);
					preparedNoteCount += 1;
				}

				yield* Console.log(
					`Prepared ${preparedNoteCount} notes across ${qmdCollectionEntries.length} QMD collections.`,
				);

				const bridgeResult = yield* bridge.runAndDecode(
					"sync",
					{
						embed: !args.skipEmbed,
						forceEmbed: args.forceEmbed,
					},
					BridgeResultSchema,
				);

				yield* Console.log(
					`Indexed ${bridgeResult.updateResult.indexed} new, ${bridgeResult.updateResult.updated} updated, ${bridgeResult.updateResult.unchanged} unchanged.`,
				);

				if (bridgeResult.embedResult) {
					yield* Console.log(
						`Embedded ${bridgeResult.embedResult.chunksEmbedded} chunks from ${bridgeResult.embedResult.docsProcessed} documents.`,
					);
				}

				yield* Console.log(
					`QMD ready: ${bridgeResult.status.totalDocuments} documents in ${bridgeResult.status.collections.length} collections at private/qmd/index.sqlite`,
				);
			});

			return BuildQmdIndex.of({
				run,
			});
		}),
	);
}
