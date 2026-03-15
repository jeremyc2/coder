import { Console, Effect, Layer, Schema, ServiceMap } from "effect";
import {
	buildMarkdownBody,
	explainSkippedKeepNote,
	fallbackTitle,
	frontmatter,
	isAttachmentCandidate,
	isKeepJsonFile,
	type KeepNote,
	parseKeepNote,
	type ReadKeepNoteResult,
	type ResolvedAttachment,
	timestampToDate,
	uniqueFilePath,
} from "../../googleKeep/utils";
import { FileOperationError, VaultFileSystem } from "./VaultFileSystem";

export class ImportValidationError extends Schema.TaggedErrorClass<ImportValidationError>()(
	"ImportValidationError",
	{
		message: Schema.String,
		path: Schema.optional(Schema.String),
	},
) {}

export type ImportGoogleKeepArgs = {
	input: string;
	output: string;
	assetsDir: string;
	dryRun: boolean;
};

const JsonValueFromString = Schema.fromJsonString(Schema.Unknown);

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

/**
 * Imports Google Keep Takeout data into markdown files and copied attachments
 * using the shared vault filesystem service.
 */
export class ImportGoogleKeep extends ServiceMap.Service<
	ImportGoogleKeep,
	{
		run(
			args: ImportGoogleKeepArgs,
		): Effect.Effect<void, ImportValidationError | FileOperationError>;
	}
>()("vault/effect/services/ImportGoogleKeep") {
	static readonly layer = Layer.effect(
		ImportGoogleKeep,
		Effect.gen(function* () {
			const fileSystem = yield* VaultFileSystem;

			const listFilesRecursively = Effect.fn(
				"ImportGoogleKeep.listFilesRecursively",
			)(function* (rootDir: string) {
				const entries = yield* fileSystem.readDirectory(rootDir, {
					recursive: true,
				});
				return entries.map((filePath) => fileSystem.join(rootDir, filePath));
			});

			const readKeepNote = Effect.fn("ImportGoogleKeep.readKeepNote")(
				function* (filePath: string) {
					const contents = yield* fileSystem.readFileString(filePath);
					const value = yield* Effect.try({
						try: () => Schema.decodeUnknownSync(JsonValueFromString)(contents),
						catch: (error) =>
							new FileOperationError({
								operation: "parse-json",
								path: filePath,
								cause: getErrorMessage(error),
							}),
					});

					const note = parseKeepNote(value);
					if (note) {
						return { note } satisfies ReadKeepNoteResult;
					}

					return {
						skipReason: explainSkippedKeepNote(value),
					} satisfies ReadKeepNoteResult;
				},
			);

			const resolveAttachments = Effect.fn(
				"ImportGoogleKeep.resolveAttachments",
			)(function* ({
				note,
				jsonPath,
				outputAssetsDir,
				outputAssetsDirName,
				dryRun,
			}: {
				note: KeepNote;
				jsonPath: string;
				outputAssetsDir: string;
				outputAssetsDirName: string;
				dryRun: boolean;
			}) {
				const keepDir = fileSystem.dirname(jsonPath);
				const sourceStem = fileSystem.basename(
					jsonPath,
					fileSystem.extname(jsonPath),
				);
				const explicitAttachments = (note.attachments ?? [])
					.map((attachment) => attachment.filePath)
					.filter((attachmentPath): attachmentPath is string =>
						Boolean(attachmentPath),
					)
					.map((attachmentPath) =>
						fileSystem.resolveFromCwd(fileSystem.join(keepDir, attachmentPath)),
					);

				const siblingAttachments = (yield* fileSystem.readDirectory(keepDir))
					.map((entry) => fileSystem.join(keepDir, entry))
					.filter((filePath) => {
						if (filePath === jsonPath) {
							return false;
						}

						const basename = fileSystem.basename(filePath);
						return (
							(basename.startsWith(`${sourceStem}.`) ||
								basename.startsWith(`${sourceStem} `)) &&
							isAttachmentCandidate(filePath)
						);
					});

				const nestedDir = fileSystem.join(keepDir, sourceStem);
				const nestedDirStats = yield* fileSystem.statOptional(nestedDir);
				const nestedAttachments =
					nestedDirStats?.type === "Directory"
						? (yield* listFilesRecursively(nestedDir)).filter(
								isAttachmentCandidate,
							)
						: [];

				const seen = new Set<string>();
				const attachmentPaths = [
					...explicitAttachments,
					...siblingAttachments,
					...nestedAttachments,
				].filter((filePath) => {
					const normalized = fileSystem.normalize(filePath);
					if (seen.has(normalized)) {
						return false;
					}
					seen.add(normalized);
					return true;
				});

				const attachments: ResolvedAttachment[] = [];
				if (!dryRun) {
					yield* fileSystem.remove(outputAssetsDir, {
						recursive: true,
						force: true,
					});
				}

				for (const attachmentPath of attachmentPaths) {
					const attachmentBasename = fileSystem.basename(attachmentPath);
					const outputPath = fileSystem.join(
						outputAssetsDir,
						attachmentBasename,
					);
					const outputRelativePath = fileSystem
						.join(outputAssetsDirName, attachmentBasename)
						.replaceAll(fileSystem.pathSeparator, "/");

					if (!dryRun) {
						yield* fileSystem.makeDirectory(outputAssetsDir, {
							recursive: true,
						});
						yield* fileSystem.copyFile(attachmentPath, outputPath);
					}

					attachments.push({
						outputRelativePath,
						sourcePath: attachmentPath,
					});
				}

				return attachments;
			});

			const run = Effect.fn("ImportGoogleKeep.run")(function* (
				args: ImportGoogleKeepArgs,
			): Effect.fn.Return<void, ImportValidationError | FileOperationError> {
				const inputDir = fileSystem.resolveFromCwd(args.input);
				const outputDir = fileSystem.resolveFromCwd(args.output);
				const inputStats = yield* fileSystem.statOptional(inputDir);

				if (!inputStats || inputStats.type !== "Directory") {
					return yield* new ImportValidationError({
						message: "Input directory does not exist",
						path: inputDir,
					});
				}

				const sourceFiles = (yield* listFilesRecursively(inputDir))
					.filter(isKeepJsonFile)
					.sort();

				if (sourceFiles.length === 0) {
					return yield* new ImportValidationError({
						message: "No JSON files found in input directory",
						path: inputDir,
					});
				}

				if (!args.dryRun) {
					yield* fileSystem.makeDirectory(outputDir, { recursive: true });
				}

				const usedOutputPaths = new Set<string>();
				let convertedCount = 0;
				let skippedCount = 0;
				let attachmentCount = 0;
				const skipDetails: string[] = [];

				for (const sourceFile of sourceFiles) {
					const result = yield* readKeepNote(sourceFile);
					if (!result.note) {
						skippedCount += 1;
						skipDetails.push(`${sourceFile}: ${result.skipReason}`);
						continue;
					}
					const note = result.note;

					const sourceBaseName = fileSystem.basename(
						sourceFile,
						fileSystem.extname(sourceFile),
					);
					const title = fallbackTitle({
						note,
						sourceBasename: sourceBaseName,
					});
					const outputPath = uniqueFilePath({
						join: (...parts) => fileSystem.join(...parts),
						targetDir: outputDir,
						desiredBaseName: title,
						usedPaths: usedOutputPaths,
					});
					const noteSlug = fileSystem.basename(outputPath, ".md");
					const outputAssetsDir = fileSystem.join(
						outputDir,
						args.assetsDir,
						noteSlug,
					);
					const outputAssetsDirName = fileSystem
						.join(args.assetsDir, noteSlug)
						.replaceAll(fileSystem.pathSeparator, "/");
					const attachments = yield* resolveAttachments({
						note,
						jsonPath: sourceFile,
						outputAssetsDir,
						outputAssetsDirName,
						dryRun: args.dryRun,
					});

					attachmentCount += attachments.length;

					const markdown = [
						frontmatter({ note, title, sourcePath: sourceFile }),
						buildMarkdownBody({ note, title, attachments }),
					].join("");

					if (!args.dryRun) {
						yield* fileSystem.writeFileString(outputPath, markdown);

						const editedAt = timestampToDate(note.userEditedTimestampUsec);
						if (editedAt) {
							yield* fileSystem.utimes(outputPath, editedAt, editedAt);
						}
					}

					convertedCount += 1;
					yield* Console.log(
						`${args.dryRun ? "Would write" : "Wrote"} ${outputPath}`,
					);
				}

				yield* Console.log(
					`\nConverted ${convertedCount} note${convertedCount === 1 ? "" : "s"}${attachmentCount > 0 ? ` with ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}` : ""}.`,
				);

				if (skippedCount > 0) {
					yield* Console.log(
						`Skipped ${skippedCount} JSON file${skippedCount === 1 ? "" : "s"}.`,
					);
					for (const detail of skipDetails) {
						yield* Console.log(`  - ${detail}`);
					}
				}
			});

			return ImportGoogleKeep.of({
				run,
			});
		}),
	);
}
