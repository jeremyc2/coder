#!/usr/bin/env bun

import { BunServices } from "@effect/platform-bun";
import { Console, Effect, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { Command, Flag } from "effect/unstable/cli";

type KeepLabel = {
	name?: string;
};

type KeepListItem = {
	text?: string;
	isChecked?: boolean;
	checkStatus?: string;
};

type KeepAttachment = {
	filePath?: string;
	mimetype?: string;
};

type KeepNote = {
	title?: string;
	textContent?: string;
	textContentHtml?: string;
	listContent?: KeepListItem[];
	labels?: KeepLabel[];
	isPinned?: boolean;
	isArchived?: boolean;
	isTrashed?: boolean;
	color?: string;
	createdTimestampUsec?: string | number;
	userEditedTimestampUsec?: string | number;
	trashedTimestampUsec?: string | number;
	attachments?: KeepAttachment[];
};

type ResolvedAttachment = {
	outputRelativePath: string;
	sourcePath: string;
};

type ReadKeepNoteResult =
	| {
			note: KeepNote;
			skipReason?: undefined;
	  }
	| {
			note?: undefined;
			skipReason: string;
	  };

class ImportValidationError extends Schema.TaggedErrorClass<ImportValidationError>()(
	"ImportValidationError",
	{
		message: Schema.String,
		path: Schema.optional(Schema.String),
	},
) {}

class FileOperationError extends Schema.TaggedErrorClass<FileOperationError>()(
	"FileOperationError",
	{
		operation: Schema.String,
		path: Schema.String,
		cause: Schema.String,
		code: Schema.optional(Schema.String),
	},
) {}

const VERSION = "0.0.1";
const DEFAULT_OUTPUT_DIR = "private/knowledge-base/keep";
const DEFAULT_ASSETS_DIR_NAME = "_assets";

const command = Command.make(
	"import-google-keep",
	{
		input: Flag.string("input")
			.pipe(Flag.withAlias("i"))
			.pipe(Flag.withDescription("Path to the Takeout Keep directory")),
		output: Flag.string("output")
			.pipe(Flag.withAlias("o"))
			.pipe(Flag.withDescription("Output directory for generated markdown"))
			.pipe(Flag.withDefault(DEFAULT_OUTPUT_DIR)),
		assetsDir: Flag.string("assets-dir")
			.pipe(
				Flag.withDescription(
					"Directory name to place copied note attachments into",
				),
			)
			.pipe(Flag.withDefault(DEFAULT_ASSETS_DIR_NAME)),
		dryRun: Flag.boolean("dry-run").pipe(
			Flag.withDescription(
				"Parse notes and print the plan without writing files",
			),
		),
	},
	Effect.fnUntraced(function* (args) {
		const path = yield* Path.Path;
		const inputDir = path.resolve(process.cwd(), args.input);
		const outputDir = path.resolve(process.cwd(), args.output);
		const inputStats = yield* statOptional({ filePath: inputDir });

		if (!inputStats || inputStats.type !== "Directory") {
			yield* Effect.fail(
				new ImportValidationError({
					message: "Input directory does not exist",
					path: inputDir,
				}),
			);
		}

		const sourceFiles = (yield* walkFiles(inputDir))
			.filter(isKeepJsonFile)
			.sort();

		if (sourceFiles.length === 0) {
			yield* Effect.fail(
				new ImportValidationError({
					message: "No JSON files found in input directory",
					path: inputDir,
				}),
			);
		}

		if (!args.dryRun) {
			yield* mkdirEffect(outputDir);
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

			const sourceBaseName = path.basename(
				sourceFile,
				path.extname(sourceFile),
			);
			const title = fallbackTitle({ note, sourceBasename: sourceBaseName });
			const outputPath = uniqueFilePath({
				path,
				targetDir: outputDir,
				desiredBaseName: title,
				usedPaths: usedOutputPaths,
			});
			const noteSlug = path.basename(outputPath, ".md");
			const outputAssetsDir = path.join(outputDir, args.assetsDir, noteSlug);
			const outputAssetsDirName = path
				.join(args.assetsDir, noteSlug)
				.replaceAll(path.sep, "/");
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
				yield* writeTextFile({ filePath: outputPath, contents: markdown });

				const editedAt = timestampToDate(note.userEditedTimestampUsec);
				if (editedAt) {
					yield* touchFile({ filePath: outputPath, at: editedAt });
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
	}),
).pipe(
	Command.withDescription(
		"Convert a Google Keep Takeout export into local Markdown for qmd indexing.",
	),
);

/** Checks whether a value is a plain object-ish record. Joke: we keep records straight. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Narrows unknown input to a string when possible. Joke: string theory, but practical. */
function readString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

/** Narrows unknown input to a boolean when possible. Joke: true story, false ending. */
function readBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

/** Narrows unknown input to a timestamp-like scalar. Joke: timing is everything. */
function readTimestamp(value: unknown): string | number | undefined {
	if (typeof value === "string" || typeof value === "number") {
		return value;
	}

	return undefined;
}

/** Normalizes line endings and spacing artifacts from exported note text. Joke: space case closed. */
function normalizeWhitespace(value: string): string {
	return (
		value
			// Normalize Windows line endings and non-breaking spaces into plain text.
			.replace(/\r\n/g, "\n")
			.replace(/\u00a0/g, " ")
			.trim()
	);
}

/** Converts simple HTML exports into readable plain text. Joke: we tag out early. */
function stripHtml(value: string): string {
	return (
		value
			// Convert common block/line-break tags into newlines before stripping markup.
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
			// Remove any remaining HTML tags once structural breaks are preserved.
			.replace(/<[^>]+>/g, "")
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&#39;/g, "'")
			.replace(/&quot;/g, '"')
	);
}

/** Converts Keep microsecond timestamps into ISO strings. Joke: very date-able output. */
function timestampToIso(
	value: string | number | undefined,
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return undefined;
	}

	return new Date(numeric / 1000).toISOString();
}

/** Converts Keep microsecond timestamps into Date objects. Joke: a second date, still no commitment. */
function timestampToDate(value: string | number | undefined): Date | undefined {
	if (value === undefined) {
		return undefined;
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return undefined;
	}

	return new Date(numeric / 1000);
}

/** Escapes a string for safe YAML scalar output. Joke: scalar? I hardly yam. */
function yamlScalar(value: string): string {
	return JSON.stringify(value);
}

/** Formats a string array as YAML list lines. Joke: listed and loving it. */
function yamlArray({
	name,
	values,
}: {
	name: string;
	values: string[];
}): string[] {
	if (values.length === 0) {
		return [];
	}

	return [`${name}:`, ...values.map((value) => `  - ${yamlScalar(value)}`)];
}

/** Turns free-form text into a filesystem-friendly slug. Joke: slug life chose us. */
function slugify(value: string): string {
	return (
		value
			.normalize("NFKD")
			// Drop punctuation, collapse runs of spaces/dashes, and trim edge separators.
			.replace(/[^\w\s-]/g, "")
			.trim()
			.toLowerCase()
			.replace(/[-\s]+/g, "-")
			.replace(/^-+|-+$/g, "")
	);
}

/** Parses loose Keep export JSON into the note shape this importer expects. Joke: note by note-west. */
function parseKeepNote(value: unknown): KeepNote | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const listContent = Array.isArray(value["listContent"])
		? value["listContent"].flatMap((item) => {
				if (!isRecord(item)) {
					return [];
				}

				return [
					{
						text: readString(item["text"]),
						isChecked: readBoolean(item["isChecked"]),
						checkStatus: readString(item["checkStatus"]),
					},
				];
			})
		: undefined;

	const labels = Array.isArray(value["labels"])
		? value["labels"].flatMap((label) => {
				if (!isRecord(label)) {
					return [];
				}

				return [{ name: readString(label["name"]) }];
			})
		: undefined;

	const attachments = Array.isArray(value["attachments"])
		? value["attachments"].flatMap((attachment) => {
				if (!isRecord(attachment)) {
					return [];
				}

				return [
					{
						filePath: readString(attachment["filePath"]),
						mimetype: readString(attachment["mimetype"]),
					},
				];
			})
		: undefined;

	const note: KeepNote = {
		title: readString(value["title"]),
		textContent: readString(value["textContent"]),
		textContentHtml: readString(value["textContentHtml"]),
		listContent,
		labels,
		isPinned: readBoolean(value["isPinned"]),
		isArchived: readBoolean(value["isArchived"]),
		isTrashed: readBoolean(value["isTrashed"]),
		color: readString(value["color"]),
		createdTimestampUsec: readTimestamp(value["createdTimestampUsec"]),
		userEditedTimestampUsec: readTimestamp(value["userEditedTimestampUsec"]),
		trashedTimestampUsec: readTimestamp(value["trashedTimestampUsec"]),
		attachments,
	};

	if (
		!note.title &&
		!note.textContent &&
		!note.textContentHtml &&
		(!note.listContent || note.listContent.length === 0) &&
		(!note.labels || note.labels.length === 0) &&
		(!note.attachments || note.attachments.length === 0)
	) {
		return undefined;
	}

	return note;
}

/** Explains why a parsed JSON payload was skipped. Joke: skip happens, but we take notes. */
function explainSkippedKeepNote(value: unknown): string {
	if (!isRecord(value)) {
		return "Skipped because the JSON payload was not an object.";
	}

	const attachmentCount = Array.isArray(value["attachments"])
		? value["attachments"].filter(isRecord).length
		: 0;

	if (attachmentCount > 0) {
		return `Skipped unexpectedly despite ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}.`;
	}

	return "Skipped because the note was completely empty: no title, text, checklist items, labels, or attachments.";
}

/** Derives a stable title when Keep leaves one blank. Joke: titling under pressure. */
function fallbackTitle({
	note,
	sourceBasename,
}: {
	note: KeepNote;
	sourceBasename: string;
}): string {
	const title = normalizeWhitespace(note.title ?? "");
	if (title) {
		return title;
	}

	const textContent = normalizeWhitespace(note.textContent ?? "");
	if (textContent) {
		const [firstLine] = textContent.split("\n");
		if (firstLine) {
			return firstLine.slice(0, 80);
		}
	}

	const htmlContent = normalizeWhitespace(
		stripHtml(note.textContentHtml ?? ""),
	);
	if (htmlContent) {
		const [firstLine] = htmlContent.split("\n");
		if (firstLine) {
			return firstLine.slice(0, 80);
		}
	}

	const editedAt = timestampToIso(note.userEditedTimestampUsec);
	if (editedAt) {
		return `keep-note-${editedAt.slice(0, 10)}`;
	}

	return sourceBasename;
}

/** Extracts normalized label names from a note. Joke: labelling it like it is. */
function getLabels(note: KeepNote): string[] {
	return (note.labels ?? [])
		.map((label) => normalizeWhitespace(label.name ?? ""))
		.filter(Boolean);
}

/** Converts Keep checklist items into Markdown task lines. Joke: task and ye shall receive. */
function getChecklistLines(note: KeepNote): string[] {
	return (note.listContent ?? []).flatMap((item) => {
		const text = normalizeWhitespace(item.text ?? "");
		if (!text) {
			return [];
		}

		const isChecked = item.isChecked ?? item.checkStatus === "CHECKED";
		return [`- [${isChecked ? "x" : " "}] ${text}`];
	});
}

/** Builds the YAML frontmatter block for an imported note. Joke: up front and markdownal. */
function frontmatter({
	note,
	title,
	sourcePath,
}: {
	note: KeepNote;
	title: string;
	sourcePath: string;
}): string {
	// Split on either POSIX or Windows path separators to get the final filename.
	const originalFile = sourcePath.split(/[/\\]/).at(-1) ?? sourcePath;
	const lines = [
		"---",
		`title: ${yamlScalar(title)}`,
		"source: google-keep",
		`original_file: ${yamlScalar(originalFile)}`,
	];

	const createdAt = timestampToIso(note.createdTimestampUsec);
	if (createdAt) {
		lines.push(`created_at: ${yamlScalar(createdAt)}`);
	}

	const updatedAt = timestampToIso(note.userEditedTimestampUsec);
	if (updatedAt) {
		lines.push(`updated_at: ${yamlScalar(updatedAt)}`);
	}

	const trashedAt = timestampToIso(note.trashedTimestampUsec);
	if (trashedAt) {
		lines.push(`trashed_at: ${yamlScalar(trashedAt)}`);
	}

	if (note.color) {
		lines.push(`color: ${yamlScalar(note.color)}`);
	}

	lines.push(`pinned: ${note.isPinned === true ? "true" : "false"}`);
	lines.push(`archived: ${note.isArchived === true ? "true" : "false"}`);
	lines.push(`trashed: ${note.isTrashed === true ? "true" : "false"}`);
	lines.push(...yamlArray({ name: "labels", values: getLabels(note) }));
	lines.push("---", "");

	return lines.join("\n");
}

/** Builds the Markdown body content for an imported note. Joke: body of work, solved. */
function buildMarkdownBody({
	note,
	title,
	attachments,
}: {
	note: KeepNote;
	title: string;
	attachments: ResolvedAttachment[];
}): string {
	const sections: string[] = [`# ${title}`];

	const textContent = normalizeWhitespace(note.textContent ?? "");
	if (textContent) {
		sections.push(textContent);
	} else {
		const htmlContent = normalizeWhitespace(
			stripHtml(note.textContentHtml ?? ""),
		);
		if (htmlContent) {
			sections.push(htmlContent);
		}
	}

	const checklistLines = getChecklistLines(note);
	if (checklistLines.length > 0) {
		sections.push(checklistLines.join("\n"));
	}

	if (!textContent && checklistLines.length === 0 && attachments.length > 0) {
		sections.push("_Imported attachment-only Keep note._");
	}

	if (attachments.length > 0) {
		sections.push(
			[
				"## Attachments",
				...attachments.map(
					(attachment) =>
						`- [${attachment.outputRelativePath.split("/").at(-1) ?? attachment.outputRelativePath}](${encodeURI(attachment.outputRelativePath)})`,
				),
			].join("\n"),
		);
	}

	return `${sections.filter(Boolean).join("\n\n")}\n`;
}

/** Pulls a readable message out of an unknown error value. Joke: message received, loudly. */
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

/** Pulls a string error code out of an unknown error value when present. Joke: codependent in a healthy way. */
function getErrorCode(error: unknown): string | undefined {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
	) {
		return error.code;
	}

	return undefined;
}

/** Wraps low-level failures in a structured file operation error. Joke: file and order restored. */
function toFileOperationError({
	operation,
	filePath,
	error,
}: {
	operation: string;
	filePath: string;
	error: unknown;
}): FileOperationError {
	return new FileOperationError({
		operation,
		path: filePath,
		cause: getErrorMessage(error),
		code: getErrorCode(error),
	});
}

/** Creates a directory recursively inside an Effect. Joke: making space, literally. */
const mkdirEffect = (directory: string) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* fs.makeDirectory(directory, { recursive: true }).pipe(
			Effect.mapError((error) =>
				toFileOperationError({
					operation: "mkdir",
					filePath: directory,
					error,
				}),
			),
		);
	})();

/** Stats a path and softens missing-path errors into null. Joke: no stats? no tantrum. */
const statOptional = ({ filePath }: { filePath: string }) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		const exists = yield* fs.exists(filePath).pipe(
			Effect.mapError((error) =>
				toFileOperationError({
					operation: "exists",
					filePath,
					error,
				}),
			),
		);

		if (!exists) {
			return null;
		}

		return yield* fs
			.stat(filePath)
			.pipe(
				Effect.mapError((error) =>
					toFileOperationError({ operation: "stat", filePath, error }),
				),
			);
	})();

/** Writes text content to disk inside an Effect. Joke: write on target. */
const writeTextFile = ({
	filePath,
	contents,
}: {
	filePath: string;
	contents: string;
}) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* fs
			.writeFileString(filePath, contents)
			.pipe(
				Effect.mapError((error) =>
					toFileOperationError({ operation: "write", filePath, error }),
				),
			);
	})();

/** Copies a file using Bun inside an Effect. Joke: copy that, over and out. */
const copyFileWithBun = ({
	sourcePath,
	outputPath,
}: {
	sourcePath: string;
	outputPath: string;
}) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* fs.copyFile(sourcePath, outputPath).pipe(
			Effect.mapError((error) =>
				toFileOperationError({
					operation: "copy",
					filePath: `${sourcePath} -> ${outputPath}`,
					error,
				}),
			),
		);
	})();

/** Removes a file or directory path inside an Effect. Joke: deleting it softly. */
const removePath = ({
	filePath,
	recursive = false,
	force = false,
}: {
	filePath: string;
	recursive?: boolean;
	force?: boolean;
}) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* fs
			.remove(filePath, { recursive, force })
			.pipe(
				Effect.mapError((error) =>
					toFileOperationError({ operation: "remove", filePath, error }),
				),
			);
	})();

/** Applies access and modified timestamps to a file. Joke: a touching update. */
const touchFile = ({ filePath, at }: { filePath: string; at: Date }) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* fs
			.utimes(filePath, at, at)
			.pipe(
				Effect.mapError((error) =>
					toFileOperationError({ operation: "utimes", filePath, error }),
				),
			);
	})();

/** Reads and parses a JSON file using Bun. Joke: JSON and on and on. */
const readJsonFile = (filePath: string) =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		const contents = yield* fs
			.readFileString(filePath)
			.pipe(
				Effect.mapError((error) =>
					toFileOperationError({ operation: "read-json", filePath, error }),
				),
			);

		return yield* Effect.try({
			try: () => JSON.parse(contents),
			catch: (error) =>
				toFileOperationError({ operation: "parse-json", filePath, error }),
		});
	})();

/** Recursively lists files under a directory using Bun globbing. Joke: taking the scenic root. */
const walkFiles = (
	rootDir: string,
): Effect.Effect<
	string[],
	FileOperationError,
	FileSystem.FileSystem | Path.Path
> =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const entries = yield* fs
			.readDirectory(rootDir, { recursive: true })
			.pipe(
				Effect.mapError((error) =>
					toFileOperationError({ operation: "scan", filePath: rootDir, error }),
				),
			);

		return entries.map((filePath) => path.join(rootDir, filePath));
	})();

/** Checks whether a scanned file looks like a Keep note JSON file. Joke: extension audition passed. */
function isKeepJsonFile(filePath: string): boolean {
	return filePath.toLowerCase().endsWith(".json");
}

/** Filters out Keep sidecar note exports from discovered attachment candidates. Joke: sidecars need not apply. */
function isAttachmentCandidate(filePath: string): boolean {
	const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();

	return extension !== ".html" && extension !== ".json";
}

/** Reads a Keep JSON file and parses it into a note when possible. Joke: note sure? now we are. */
const readKeepNote = (filePath: string) =>
	readJsonFile(filePath).pipe(
		Effect.map((value): ReadKeepNoteResult => {
			const note = parseKeepNote(value);
			if (note) {
				return { note };
			}

			return {
				skipReason: explainSkippedKeepNote(value),
			};
		}),
	);

/** Finds and copies attachments associated with a Keep note export. Joke: attached, but not clingy. */
const resolveAttachments = ({
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
}): Effect.Effect<
	ResolvedAttachment[],
	FileOperationError,
	FileSystem.FileSystem | Path.Path
> =>
	Effect.fnUntraced(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const keepDir = path.dirname(jsonPath);
		const sourceStem = path.basename(jsonPath, path.extname(jsonPath));
		const explicitAttachments = (note.attachments ?? [])
			.map((attachment) => attachment.filePath)
			.filter((attachmentPath): attachmentPath is string =>
				Boolean(attachmentPath),
			)
			.map((attachmentPath) => path.resolve(keepDir, attachmentPath));

		const siblingAttachments = (yield* fs.readDirectory(keepDir).pipe(
			Effect.mapError((error) =>
				toFileOperationError({
					operation: "read-directory",
					filePath: keepDir,
					error,
				}),
			),
		))
			.map((entry) => path.join(keepDir, entry))
			.filter((filePath) => {
				if (filePath === jsonPath) {
					return false;
				}

				const basename = path.basename(filePath);
				return (
					(basename.startsWith(`${sourceStem}.`) ||
						basename.startsWith(`${sourceStem} `)) &&
					isAttachmentCandidate(filePath)
				);
			});

		const nestedDir = path.join(keepDir, sourceStem);
		const nestedDirStats = yield* statOptional({ filePath: nestedDir });
		const nestedAttachments =
			nestedDirStats?.type === "Directory"
				? (yield* walkFiles(nestedDir)).filter(isAttachmentCandidate)
				: [];

		const seen = new Set<string>();
		const attachmentPaths = [
			...explicitAttachments,
			...siblingAttachments,
			...nestedAttachments,
		].filter((filePath) => {
			const normalized = path.normalize(filePath);
			if (seen.has(normalized)) {
				return false;
			}
			seen.add(normalized);
			return true;
		});

		const attachments: ResolvedAttachment[] = [];
		if (!dryRun) {
			yield* removePath({
				filePath: outputAssetsDir,
				recursive: true,
				force: true,
			});
		}

		for (const attachmentPath of attachmentPaths) {
			const attachmentBasename = path.basename(attachmentPath);
			const outputPath = path.join(outputAssetsDir, attachmentBasename);
			const outputRelativePath = path
				.join(outputAssetsDirName, attachmentBasename)
				.replaceAll(path.sep, "/");

			if (!dryRun) {
				yield* mkdirEffect(outputAssetsDir);
				yield* copyFileWithBun({ sourcePath: attachmentPath, outputPath });
			}

			attachments.push({
				outputRelativePath,
				sourcePath: attachmentPath,
			});
		}

		return attachments;
	})();

/** Generates a unique markdown file path for a note title slug. Joke: uniqueness is filename property. */
function uniqueFilePath({
	path,
	targetDir,
	desiredBaseName,
	usedPaths,
}: {
	path: Path.Path;
	targetDir: string;
	desiredBaseName: string;
	usedPaths: Set<string>;
}): string {
	const safeBase = slugify(desiredBaseName) || "keep-note";
	let candidate = path.join(targetDir, `${safeBase}.md`);
	let suffix = 2;

	while (usedPaths.has(candidate)) {
		candidate = path.join(targetDir, `${safeBase}-${suffix}.md`);
		suffix += 1;
	}

	usedPaths.add(candidate);
	return candidate;
}

try {
	await Effect.runPromise(
		Command.runWith(command, { version: VERSION })(process.argv.slice(2)).pipe(
			Effect.provide(BunServices.layer),
		),
	);
} catch (error) {
	if (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		typeof error._tag === "string"
	) {
		console.error(`Import failed: ${JSON.stringify(error, null, 2)}`);
	} else {
		console.error(`Import failed: ${getErrorMessage(error)}`);
	}
	process.exit(1);
}
