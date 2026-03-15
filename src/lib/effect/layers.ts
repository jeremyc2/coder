import { BunServices } from "@effect/platform-bun";
import { Layer } from "effect";
import { FrontmatterParser } from "./services/FrontmatterParser";
import { KnowledgeNotes } from "./services/KnowledgeNotes";
import { QmdBridge } from "./services/QmdBridge";
import { VaultFileSystem } from "./services/VaultFileSystem";

const knowledgeNotesLayer = KnowledgeNotes.layer.pipe(
	Layer.provide(VaultFileSystem.layer),
	Layer.provide(FrontmatterParser.layer),
);

export const vaultScriptLayer = Layer.mergeAll(
	BunServices.layer,
	FrontmatterParser.layer,
	VaultFileSystem.layer,
	knowledgeNotesLayer,
	QmdBridge.layer,
);

export const qmdBridgeLayer = Layer.mergeAll(QmdBridge.layer);
