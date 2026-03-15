import { Effect, type Schema } from "effect";
import { qmdBridgeRuntimeLayer } from "../effect/layers";
import { QmdBridge } from "../effect/services/QmdBridge";

export async function runQmdBridge<
	TPayload,
	TResultSchema extends Schema.Top & { readonly DecodingServices: never },
>(
	command: string,
	payload: TPayload,
	schema: TResultSchema,
): Promise<TResultSchema["Type"]> {
	return Effect.gen(function* () {
		const bridge = yield* QmdBridge;
		return yield* bridge.runAndDecode(command, payload, schema);
	}).pipe(Effect.provide(qmdBridgeRuntimeLayer), Effect.runPromise);
}
