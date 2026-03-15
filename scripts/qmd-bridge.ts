#!/usr/bin/env node
/**
 * Provides a small process boundary around QMD store operations for the app
 * and other scripts.
 *
 * The bridge opens the QMD store, applies the configured collection context,
 * runs a single command such as overview, search, get, or sync, and prints a
 * JSON response to stdout so callers can treat QMD access as a typed request.
 */

import { Cause, Effect, Exit } from "effect";
import { QmdBridgeScript } from "../src/lib/effect/services/QmdBridgeScript";

const program = Effect.gen(function* () {
	const bridge = yield* QmdBridgeScript;
	const payload = yield* bridge.parsePayload(process.argv[3]);
	const output = yield* bridge.runCommand(process.argv[2], payload);

	yield* Effect.sync(() => {
		process.stdout.write(JSON.stringify(output));
	});
}).pipe(Effect.provide(QmdBridgeScript.layer));

const exit = await Effect.runPromiseExit(program);

if (Exit.isFailure(exit)) {
	console.error(Cause.pretty(exit.cause));
	process.exitCode = 1;
}
