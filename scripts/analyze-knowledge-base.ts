#!/usr/bin/env bun

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { vaultScriptLayer } from "../src/lib/effect/layers";
import { KnowledgeNotes } from "../src/lib/effect/services/KnowledgeNotes";
import {
	type FileOperationError,
	VaultFileSystem,
} from "../src/lib/effect/services/VaultFileSystem";
import {
	categoryDefinitions,
	classifyKnowledgeNote,
} from "../src/lib/qmd/categories";
import { knowledgeBaseRoot } from "../src/lib/qmd/config";

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
	Effect.fn("analyzeKnowledgeBaseCommand")(function* (args): Effect.fn.Return<
		void,
		FileOperationError,
		KnowledgeNotes | VaultFileSystem
	> {
		const fileSystem = yield* VaultFileSystem;
		const notes = yield* KnowledgeNotes;
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
	}),
).pipe(
	Command.withDescription(
		"Inspect the private markdown knowledge base and summarize the recommended QMD collections.",
	),
);

const analyzeProgram = command
	.pipe(Command.run({ version: "0.0.1" }))
	.pipe(Effect.provide(vaultScriptLayer))
	.pipe(Effect.provide(BunServices.layer));

BunRuntime.runMain(analyzeProgram);
