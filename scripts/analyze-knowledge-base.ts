#!/usr/bin/env bun

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Effect } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { Command, Flag } from "effect/unstable/cli";
import {
	categoryDefinitions,
	classifyKnowledgeNote,
} from "../src/lib/qmd/categories";
import { knowledgeBaseRoot } from "../src/lib/qmd/config";

type ParsedNote = {
	title: string;
	body: string;
	labels: string[];
	trashed: boolean;
	relativePath: string;
};

const command = Command.make(
	"analyze-knowledge-base",
	{
		input: Flag.string("input")
			.pipe(Flag.withAlias("i"))
			.pipe(Flag.withDefault(knowledgeBaseRoot))
			.pipe(
				Flag.withDescription("Root directory that contains markdown notes"),
			),
		includeTrashed: Flag.boolean("include-trashed").pipe(
			Flag.withDescription("Include notes marked as trashed in frontmatter"),
		),
	},
	Effect.fn(function* (args) {
		const path = yield* Path.Path;
		const inputDir = path.resolve(process.cwd(), args.input);
		const markdownFiles = yield* walkMarkdownFiles(inputDir);
		const counts = new Map<string, number>();
		const examples = new Map<string, string[]>();
		let total = 0;

		for (const filePath of markdownFiles) {
			const note = yield* readNote(filePath, inputDir);
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
	}),
).pipe(
	Command.withDescription(
		"Inspect the private markdown knowledge base and summarize the recommended QMD collections.",
	),
);

function parseFrontmatter(contents: string) {
	if (!contents.startsWith("---\n")) {
		return { data: new Map<string, string[]>(), body: contents };
	}

	const endIndex = contents.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		return { data: new Map<string, string[]>(), body: contents };
	}

	const data = new Map<string, string[]>();
	let currentKey = "";

	for (const line of contents.slice(4, endIndex).split("\n")) {
		// Match a list item with optional double-quoted content.
		const listMatch = line.match(/^\s*-\s+"?(.*?)"?\s*$/);
		if (listMatch && currentKey) {
			const values = data.get(currentKey) ?? [];
			values.push(listMatch[1] ?? "");
			data.set(currentKey, values);
			continue;
		}

		// Match a key-value pair.
		const entryMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
		if (!entryMatch) {
			continue;
		}

		currentKey = entryMatch[1] ?? "";
		// Remove double quotes from the value.
		const rawValue = (entryMatch[2] ?? "").replace(/^"|"$/g, "");
		data.set(currentKey, rawValue ? [rawValue] : []);
	}

	return {
		data,
		body: contents.slice(endIndex + 5),
	};
}

function normalizeTitle(relativePath: string, title: string | undefined) {
	if (title?.trim()) {
		return title.trim();
	}

	return relativePath.split("/").at(-1)?.replace(/\.md$/i, "") ?? relativePath;
}

const walkMarkdownFiles = Effect.fn(function* (rootDir: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const queue = [rootDir];
	const results: string[] = [];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) {
			continue;
		}
		for (const entry of yield* fs.readDirectory(current)) {
			const childPath = path.join(current, entry);
			const stats = yield* fs.stat(childPath);
			if (stats.type === "Directory") {
				queue.push(childPath);
				continue;
			}
			if (stats.type === "File" && childPath.endsWith(".md")) {
				results.push(childPath);
			}
		}
	}

	return results.sort();
});

const readNote = Effect.fn(function* (filePath: string, rootDir: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const contents = yield* fs.readFileString(filePath);
	const parsedFrontmatter = parseFrontmatter(contents);

	return {
		title: normalizeTitle(
			path.relative(rootDir, filePath).replaceAll(path.sep, "/"),
			parsedFrontmatter.data.get("title")?.[0],
		),
		body: parsedFrontmatter.body.trim(),
		labels: parsedFrontmatter.data.get("labels") ?? [],
		trashed: parsedFrontmatter.data.get("trashed")?.[0] === "true",
		relativePath: path.relative(rootDir, filePath).replaceAll(path.sep, "/"),
	} satisfies ParsedNote;
});

const analyzeProgram = command
	.pipe(Command.run({ version: "0.0.1" }))
	.pipe(Effect.provide(BunServices.layer));

BunRuntime.runMain(analyzeProgram);
