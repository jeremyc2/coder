import { Effect, Layer, ServiceMap } from "effect";
import { FrontmatterParser } from "./FrontmatterParser";
import { type FileOperationError, VaultFileSystem } from "./VaultFileSystem";

export type KnowledgeNoteDocument = {
	title: string;
	body: string;
	labels: string[];
	trashed: boolean;
	relativePath: string;
	sourcePath: string;
	updatedAt?: string;
};

/**
 * Builds on the filesystem and frontmatter services to discover markdown notes
 * and decode them into the normalized knowledge-note shape used by scripts.
 */
export class KnowledgeNotes extends ServiceMap.Service<
	KnowledgeNotes,
	{
		walkMarkdownFiles(
			rootDir: string,
			options?: {
				ignoreDirectories?: ReadonlyArray<string>;
			},
		): Effect.Effect<Array<string>, FileOperationError>;
		read(
			filePath: string,
			rootDir: string,
		): Effect.Effect<KnowledgeNoteDocument, FileOperationError>;
	}
>()("vault/effect/services/KnowledgeNotes") {
	static readonly layer = Layer.effect(
		KnowledgeNotes,
		Effect.gen(function* () {
			const fileSystem = yield* VaultFileSystem;
			const frontmatter = yield* FrontmatterParser;

			const walkMarkdownFiles = Effect.fn("KnowledgeNotes.walkMarkdownFiles")(
				function* (
					rootDir: string,
					options?: {
						ignoreDirectories?: ReadonlyArray<string>;
					},
				) {
					const queue = [rootDir];
					const results: string[] = [];
					const ignoredRoots = new Set(
						(options?.ignoreDirectories ?? []).map((directory) =>
							fileSystem.resolveFromCwd(directory),
						),
					);

					while (queue.length > 0) {
						const current = queue.shift();
						if (!current) {
							continue;
						}

						for (const entry of yield* fileSystem.readDirectory(current)) {
							const childPath = fileSystem.join(current, entry);
							const stats = yield* fileSystem.statOptional(childPath);
							if (!stats) {
								continue;
							}

							if (stats.type === "Directory") {
								if (
									[...ignoredRoots].some((root) => childPath.startsWith(root))
								) {
									continue;
								}

								queue.push(childPath);
								continue;
							}

							if (stats.type === "File" && childPath.endsWith(".md")) {
								results.push(childPath);
							}
						}
					}

					return results.sort();
				},
			);

			const read = Effect.fn("KnowledgeNotes.read")(function* (
				filePath: string,
				rootDir: string,
			) {
				const contents = yield* fileSystem.readFileString(filePath);
				const parsed = yield* frontmatter.parse(contents);
				const relativePath = fileSystem
					.relative(rootDir, filePath)
					.replaceAll(fileSystem.pathSeparator, "/");

				return {
					title: frontmatter.normalizeTitle(
						relativePath,
						parsed.data.get("title")?.[0],
					),
					body: parsed.body.trim(),
					labels: parsed.data.get("labels") ?? [],
					trashed: parsed.data.get("trashed")?.[0] === "true",
					sourcePath: filePath,
					relativePath,
					updatedAt: parsed.data.get("updated_at")?.[0],
				} satisfies KnowledgeNoteDocument;
			});

			return KnowledgeNotes.of({
				walkMarkdownFiles,
				read,
			});
		}),
	);
}
