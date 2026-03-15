export function stripFrontmatter(markdown: string) {
	if (!markdown.startsWith("---\n")) {
		return markdown.trim();
	}

	const endIndex = markdown.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		return markdown.trim();
	}

	return markdown.slice(endIndex + 5).trim();
}

export function simplifyContext(context: string | null) {
	if (!context) {
		return null;
	}

	const segments = context
		// Match paragraph breaks with optional indentation so context blocks can be split cleanly.
		.split(/\n\s*\n/g)
		.map((segment) => segment.trim())
		.filter(Boolean);

	return segments.at(-1) ?? context.trim();
}
