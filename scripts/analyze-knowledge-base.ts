#!/usr/bin/env bun
/**
 * Inspects the markdown knowledge base and reports how the current
 * categorization rules distribute notes across the QMD collection buckets.
 *
 * This is a read-only analysis tool for tuning categorization logic,
 * reviewing examples per category, and understanding the current vault mix
 * before reindexing or changing collection definitions.
 */

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { vaultScriptLayer } from "../src/lib/effect/layers";
import {
	AnalyzeKnowledgeBase,
	type AnalyzeKnowledgeBaseArgs,
} from "../src/lib/effect/services/AnalyzeKnowledgeBase";
import type { FileOperationError } from "../src/lib/effect/services/VaultFileSystem";
import { knowledgeBaseRoot } from "../src/lib/qmd/config";

const command = Command.make(
	"analyze-knowledge-base",
	{
		input: Flag.string("input").pipe(
			Flag.withAlias("i"),
			Flag.withDefault(knowledgeBaseRoot),
			Flag.withDescription("Root directory that contains markdown notes"),
		),
		includeTrashed: Flag.boolean("include-trashed").pipe(
			Flag.withDescription("Include notes marked as trashed in frontmatter"),
		),
	},
	Effect.fn("analyzeKnowledgeBaseCommand")(function* (args): Effect.fn.Return<
		void,
		FileOperationError,
		AnalyzeKnowledgeBase
	> {
		const analyzeKnowledgeBase = yield* AnalyzeKnowledgeBase;
		yield* analyzeKnowledgeBase.run(args satisfies AnalyzeKnowledgeBaseArgs);
	}),
).pipe(
	Command.withDescription(
		"Inspect the private markdown knowledge base and summarize the recommended QMD collections.",
	),
);

const analyzeProgram = command.pipe(
	Command.run({ version: "0.0.1" }),
	Effect.provide(vaultScriptLayer),
	Effect.provide(BunServices.layer),
);

BunRuntime.runMain(analyzeProgram);
