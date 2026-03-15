export type KeepLabel = {
	name?: string;
};

export type KeepListItem = {
	text?: string;
	isChecked?: boolean;
	checkStatus?: string;
};

export type KeepAttachment = {
	filePath?: string;
	mimetype?: string;
};

export type KeepNote = {
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

export type ResolvedAttachment = {
	outputRelativePath: string;
	sourcePath: string;
};

export type ReadKeepNoteResult =
	| {
			note: KeepNote;
			skipReason?: undefined;
	  }
	| {
			note?: undefined;
			skipReason: string;
	  };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function readTimestamp(value: unknown): string | number | undefined {
	if (typeof value === "string" || typeof value === "number") {
		return value;
	}

	return undefined;
}

function normalizeWhitespace(value: string): string {
	return (
		value
			// Match Windows-style CRLF line endings so they can be normalized to LF.
			.replace(/\r\n/g, "\n")
			// Match non-breaking spaces from HTML exports and convert them to plain spaces.
			.replace(/\u00a0/g, " ")
			.trim()
	);
}

function stripHtml(value: string): string {
	return (
		value
			// Match `<br>` tags with optional spaces or self-closing slash so they become line breaks.
			.replace(/<br\s*\/?>/gi, "\n")
			// Match closing block tags that should become visible line breaks in plain text.
			.replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
			// Match any remaining HTML tag so the exported body can be reduced to text.
			.replace(/<[^>]+>/g, "")
			// Match the common HTML entities Keep emits and decode them back to characters.
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&#39;/g, "'")
			.replace(/&quot;/g, '"')
	);
}

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

export function timestampToDate(
	value: string | number | undefined,
): Date | undefined {
	if (value === undefined) {
		return undefined;
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return undefined;
	}

	return new Date(numeric / 1000);
}

function yamlScalar(value: string): string {
	return JSON.stringify(value);
}

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

function slugify(value: string): string {
	return (
		value
			.normalize("NFKD")
			// Match punctuation and symbols so the slug keeps only word characters, spaces, and dashes.
			.replace(/[^\w\s-]/g, "")
			.trim()
			.toLowerCase()
			// Match runs of spaces and dashes so they collapse to a single hyphen.
			.replace(/[-\s]+/g, "-")
			// Match leading or trailing hyphens so the slug does not start or end with separators.
			.replace(/^-+|-+$/g, "")
	);
}

export function parseKeepNote(value: unknown): KeepNote | undefined {
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

export function explainSkippedKeepNote(value: unknown): string {
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

export function fallbackTitle({
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

function getLabels(note: KeepNote): string[] {
	return (note.labels ?? [])
		.map((label) => normalizeWhitespace(label.name ?? ""))
		.filter(Boolean);
}

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

export function frontmatter({
	note,
	title,
	sourcePath,
}: {
	note: KeepNote;
	title: string;
	sourcePath: string;
}): string {
	// Match either `/` or `\` so the original filename can be extracted on any platform.
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

export function buildMarkdownBody({
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

export function isKeepJsonFile(filePath: string): boolean {
	return filePath.toLowerCase().endsWith(".json");
}

export function isAttachmentCandidate(filePath: string): boolean {
	const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();

	return extension !== ".html" && extension !== ".json";
}

export function uniqueFilePath({
	join,
	targetDir,
	desiredBaseName,
	usedPaths,
}: {
	join: (...parts: ReadonlyArray<string>) => string;
	targetDir: string;
	desiredBaseName: string;
	usedPaths: Set<string>;
}): string {
	const safeBase = slugify(desiredBaseName) || "keep-note";
	let candidate = join(targetDir, `${safeBase}.md`);
	let suffix = 2;

	while (usedPaths.has(candidate)) {
		candidate = join(targetDir, `${safeBase}-${suffix}.md`);
		suffix += 1;
	}

	usedPaths.add(candidate);
	return candidate;
}
