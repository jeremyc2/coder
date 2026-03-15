#!/usr/bin/env bun
/**
 * Imports a Google Keep Takeout export into the local markdown knowledge base.
 *
 * The script reads Keep JSON payloads, normalizes note content into markdown,
 * preserves metadata in frontmatter, copies attachments into a predictable
 * assets folder, and optionally runs as a dry run to preview the import plan
 * before writing files.
 */

import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { vaultScriptRuntimeLayer } from "../src/lib/effect/layers";
import {
	ImportGoogleKeep,
	type ImportGoogleKeepArgs,
	type ImportValidationError,
} from "../src/lib/effect/services/ImportGoogleKeep";
import type { FileOperationError } from "../src/lib/effect/services/VaultFileSystem";

const VERSION = "0.0.1";
const DEFAULT_OUTPUT_DIR = "private/knowledge-base/keep";
const DEFAULT_ASSETS_DIR_NAME = "_assets";

const command = Command.make(
	"import-google-keep",
	{
		input: Flag.string("input").pipe(
			Flag.withAlias("i"),
			Flag.withDescription("Path to the Takeout Keep directory"),
		),
		output: Flag.string("output").pipe(
			Flag.withAlias("o"),
			Flag.withDescription("Output directory for generated markdown"),
			Flag.withDefault(DEFAULT_OUTPUT_DIR),
		),
		assetsDir: Flag.string("assets-dir").pipe(
			Flag.withDescription(
				"Directory name to place copied note attachments into",
			),
			Flag.withDefault(DEFAULT_ASSETS_DIR_NAME),
		),
		dryRun: Flag.boolean("dry-run").pipe(
			Flag.withDescription(
				"Parse notes and print the plan without writing files",
			),
		),
	},
	Effect.fn("importGoogleKeepCommand")(function* (args): Effect.fn.Return<
		void,
		ImportValidationError | FileOperationError,
		ImportGoogleKeep
	> {
		const importGoogleKeep = yield* ImportGoogleKeep;
		yield* importGoogleKeep.run(args satisfies ImportGoogleKeepArgs);
	}),
).pipe(
	Command.withDescription(
		"Convert a Google Keep Takeout export into local Markdown for qmd indexing.",
	),
);

const importProgram = Command.runWith(command, { version: VERSION })(
	process.argv.slice(2),
).pipe(Effect.provide(vaultScriptRuntimeLayer));

BunRuntime.runMain(importProgram);
