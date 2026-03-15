import { Console, Effect, Layer, ServiceMap } from "effect";
import {
	categoryDefinitions,
	classifyKnowledgeNote,
} from "../../qmd/categories";
import { KnowledgeNotes } from "./KnowledgeNotes";
import { type FileOperationError, VaultFileSystem } from "./VaultFileSystem";

export type AnalyzeKnowledgeBaseArgs = {
	input: string;
	includeTrashed: boolean;
};

/**
 * Summarizes how vault notes map onto the current category definitions,
 * including counts and a few representative examples for each bucket.
 */
export class AnalyzeKnowledgeBase extends ServiceMap.Service<
	AnalyzeKnowledgeBase,
	{
		run(
			args: AnalyzeKnowledgeBaseArgs,
		): Effect.Effect<void, FileOperationError>;
	}
>()("vault/effect/services/AnalyzeKnowledgeBase") {
	static readonly layer = Layer.effect(
		AnalyzeKnowledgeBase,
		Effect.gen(function* () {
			const fileSystem = yield* VaultFileSystem;
			const notes = yield* KnowledgeNotes;

			const run = Effect.fn("AnalyzeKnowledgeBase.run")(function* (
				args: AnalyzeKnowledgeBaseArgs,
			): Effect.fn.Return<void, FileOperationError> {
				const inputDir = fileSystem.resolveFromCwd(args.input);
				const markdownFiles = yield* notes.walkMarkdownFiles(inputDir);
				const counts = new Map<string, number>();
				const examples = new Map<string, string[]>();
				let total = 0;

				for (const filePath of markdownFiles) {
					const note = yield* notes.read(filePath, inputDir);
					if (!args.includeTrashed && note.trashed) {
						continue;
					}

					const match = classifyKnowledgeNote(note);
					counts.set(
						match.category.name,
						(counts.get(match.category.name) ?? 0) + 1,
					);
					if (!examples.has(match.category.name)) {
						examples.set(match.category.name, []);
					}
					const bucket = examples.get(match.category.name) ?? [];
					if (bucket.length < 4) {
						bucket.push(note.title);
						examples.set(match.category.name, bucket);
					}
					total += 1;
				}

				yield* Console.log(`Analyzed ${total} markdown notes in ${inputDir}\n`);

				for (const category of categoryDefinitions) {
					const count = counts.get(category.name) ?? 0;
					yield* Console.log(`${category.label}: ${count}`);
					yield* Console.log(`  ${category.description}`);
					for (const example of examples.get(category.name) ?? []) {
						yield* Console.log(`  - ${example}`);
					}
					yield* Console.log("");
				}
			});

			return AnalyzeKnowledgeBase.of({
				run,
			});
		}),
	);
}
