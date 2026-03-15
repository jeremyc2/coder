#!/usr/bin/env bun

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Effect, Schema } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { vaultScriptLayer } from "../src/lib/effect/layers";
import {
	FileOperationError,
	VaultFileSystem,
} from "../src/lib/effect/services/VaultFileSystem";

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

const VERSION = "0.0.1";
const DEFAULT_OUTPUT_DIR = "private/knowledge-base/keep";
const DEFAULT_ASSETS_DIR_NAME = "_assets";
const JsonValueFromString = Schema.fromJsonString(Schema.Unknown);

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
	Effect.fn("importGoogleKeepCommand")(function* (args): Effect.fn.Return<
		void,
		ImportValidationError | FileOperationError,
		VaultFileSystem
	> {
		const fileSystem = yield* VaultFileSystem;
		const inputDir = fileSystem.resolveFromCwd(args.input);
		const outputDir = fileSystem.resolveFromCwd(args.output);
		const inputStats = yield* fileSystem.statOptional(inputDir);

		if (!inputStats || inputStats.type !== "Directory") {
			return yield* new ImportValidationError({
				message: "Input directory does not exist",
				path: inputDir,
			});
		}

		const sourceFiles = (yield* listFilesRecursively(fileSystem, inputDir))
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
			const result = yield* readKeepNote(fileSystem, sourceFile);
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
			const title = fallbackTitle({ note, sourceBasename: sourceBaseName });
			const outputPath = uniqueFilePath({
				fileSystem,
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
				fileSystem,
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

const listFilesRecursively = Effect.fn("listFilesRecursively")(function* (
	fileSystem: VaultFileSystem["Service"],
	rootDir: string,
) {
	const entries = yield* fileSystem.readDirectory(rootDir, { recursive: true });
	return entries.map((filePath) => fileSystem.join(rootDir, filePath));
});

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
const readKeepNote = Effect.fn("readKeepNote")(function* (
	fileSystem: VaultFileSystem["Service"],
	filePath: string,
) {
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
});

/** Finds and copies attachments associated with a Keep note export. Joke: attached, but not clingy. */
const resolveAttachments = ({
	fileSystem,
	note,
	jsonPath,
	outputAssetsDir,
	outputAssetsDirName,
	dryRun,
}: {
	fileSystem: VaultFileSystem["Service"];
	note: KeepNote;
	jsonPath: string;
	outputAssetsDir: string;
	outputAssetsDirName: string;
	dryRun: boolean;
}) =>
	Effect.fn("resolveAttachments")(function* () {
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
				? (yield* listFilesRecursively(fileSystem, nestedDir)).filter(
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
			const outputPath = fileSystem.join(outputAssetsDir, attachmentBasename);
			const outputRelativePath = fileSystem
				.join(outputAssetsDirName, attachmentBasename)
				.replaceAll(fileSystem.pathSeparator, "/");

			if (!dryRun) {
				yield* fileSystem.makeDirectory(outputAssetsDir, { recursive: true });
				yield* fileSystem.copyFile(attachmentPath, outputPath);
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
	fileSystem,
	targetDir,
	desiredBaseName,
	usedPaths,
}: {
	fileSystem: VaultFileSystem["Service"];
	targetDir: string;
	desiredBaseName: string;
	usedPaths: Set<string>;
}): string {
	const safeBase = slugify(desiredBaseName) || "keep-note";
	let candidate = fileSystem.join(targetDir, `${safeBase}.md`);
	let suffix = 2;

	while (usedPaths.has(candidate)) {
		candidate = fileSystem.join(targetDir, `${safeBase}-${suffix}.md`);
		suffix += 1;
	}

	usedPaths.add(candidate);
	return candidate;
}

const importProgram = Command.runWith(command, { version: VERSION })(
	process.argv.slice(2),
)
	.pipe(Effect.provide(vaultScriptLayer))
	.pipe(Effect.provide(BunServices.layer));

BunRuntime.runMain(importProgram);
