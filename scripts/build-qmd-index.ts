#!/usr/bin/env bun
/**
 * Prepares the local QMD workspace from the markdown vault by classifying
 * notes into collection folders, copying the active source files into the
 * QMD staging area, and then invoking the bridge process to update the index.
 *
 * This is the main script for rebuilding search data after the vault changes
 * or after collection rules are adjusted.
 */

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { vaultScriptLayer } from "../src/lib/effect/layers";
import {
	BuildQmdIndex,
	type BuildQmdIndexArgs,
} from "../src/lib/effect/services/BuildQmdIndex";
import type { QmdBridgeError } from "../src/lib/effect/services/QmdBridge";
import type { FileOperationError } from "../src/lib/effect/services/VaultFileSystem";
import { knowledgeBaseRoot } from "../src/lib/qmd/config";

const command = Command.make(
	"build-qmd-index",
	{
		input: Flag.string("input").pipe(
			Flag.withAlias("i"),
			Flag.withDefault(knowledgeBaseRoot),
			Flag.withDescription("Root directory that contains markdown notes"),
		),
		skipEmbed: Flag.boolean("skip-embed").pipe(
			Flag.withDescription("Skip the embedding pass after indexing"),
		),
		forceEmbed: Flag.boolean("force-embed").pipe(
			Flag.withDescription(
				"Regenerate all embeddings, even if they already exist",
			),
		),
		includeTrashed: Flag.boolean("include-trashed").pipe(
			Flag.withDescription("Include notes marked as trashed in frontmatter"),
		),
	},
	Effect.fn("buildQmdIndexCommand")(function* (args): Effect.fn.Return<
		void,
		FileOperationError | QmdBridgeError,
		BuildQmdIndex
	> {
		const buildQmdIndex = yield* BuildQmdIndex;
		yield* buildQmdIndex.run(args satisfies BuildQmdIndexArgs);
	}),
).pipe(
	Command.withDescription(
		"Build local QMD collections from the private markdown vault, index them, and optionally embed them.",
	),
);

const buildProgram = command.pipe(
	Command.run({ version: "0.0.1" }),
	Effect.provide(vaultScriptLayer),
	Effect.provide(BunServices.layer),
);

BunRuntime.runMain(buildProgram);
