import { Effect, Layer, Schema, ServiceMap } from "effect";

export type ParsedFrontmatter = {
	data: Map<string, string[]>;
	body: string;
};

type FrontmatterBlock = {
	frontmatter: string;
	body: string;
};

class FrontmatterParseError extends Schema.TaggedErrorClass<FrontmatterParseError>()(
	"FrontmatterParseError",
	{},
) {}

function splitFrontmatter(contents: string): FrontmatterBlock | null {
	const openingMarker = contents.startsWith("---\r\n")
		? "---\r\n"
		: contents.startsWith("---\n")
			? "---\n"
			: "";

	if (!openingMarker) {
		return null;
	}

	const lineEnding = openingMarker === "---\r\n" ? "\r\n" : "\n";
	const closingMarker = `${lineEnding}---${lineEnding}`;
	const endIndex = contents.indexOf(closingMarker, openingMarker.length);
	if (endIndex === -1) {
		return null;
	}

	return {
		frontmatter: contents.slice(openingMarker.length, endIndex),
		body: contents.slice(endIndex + closingMarker.length),
	};
}

function normalizeFrontmatterValue(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry) => {
			if (
				typeof entry === "string" ||
				typeof entry === "number" ||
				typeof entry === "boolean"
			) {
				return [String(entry)];
			}

			return [];
		});
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return [String(value)];
	}

	return [];
}

function normalizeFrontmatterData(value: unknown): Map<string, string[]> {
	const entries = new Map<string, string[]>();
	if (typeof value !== "object" || value === null) {
		return entries;
	}

	for (const [key, entry] of Object.entries(value)) {
		const normalizedValue = normalizeFrontmatterValue(entry);
		entries.set(key, normalizedValue);
	}

	return entries;
}

/**
 * Parses lightweight YAML frontmatter and centralizes title normalization for
 * markdown note ingestion.
 */
export class FrontmatterParser extends ServiceMap.Service<
	FrontmatterParser,
	{
		parse(contents: string): Effect.Effect<ParsedFrontmatter>;
		normalizeTitle(relativePath: string, title: string | undefined): string;
	}
>()("vault/effect/services/FrontmatterParser") {
	static readonly layer = Layer.effect(
		FrontmatterParser,
		Effect.gen(function* () {
			const parse = Effect.fn("FrontmatterParser.parse")(function* (
				contents: string,
			) {
				const frontmatter = splitFrontmatter(contents);
				if (!frontmatter) {
					return { data: new Map<string, string[]>(), body: contents };
				}

				return yield* Effect.try({
					try: () => ({
						data: normalizeFrontmatterData(
							Bun.YAML.parse(frontmatter.frontmatter),
						),
						body: frontmatter.body,
					}),
					catch: () => new FrontmatterParseError({}),
				}).pipe(
					Effect.catchTag("FrontmatterParseError", () =>
						Effect.succeed({
							data: new Map<string, string[]>(),
							body: frontmatter.body,
						}),
					),
				);
			});

			return FrontmatterParser.of({
				parse,
				normalizeTitle(relativePath, title) {
					if (title?.trim()) {
						return title.trim();
					}

					// Matches a trailing `.md` extension when deriving a title from the file name.
					return (
						relativePath.split("/").at(-1)?.replace(/\.md$/i, "") ??
						relativePath
					);
				},
			});
		}),
	);
}
