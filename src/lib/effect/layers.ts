import { BunServices } from "@effect/platform-bun";
import { Layer } from "effect";
import { AnalyzeKnowledgeBase } from "./services/AnalyzeKnowledgeBase";
import { BuildQmdIndex } from "./services/BuildQmdIndex";
import { FrontmatterParser } from "./services/FrontmatterParser";
import { ImportGoogleKeep } from "./services/ImportGoogleKeep";
import { KnowledgeNotes } from "./services/KnowledgeNotes";
import { QmdBridge } from "./services/QmdBridge";
import { VaultFileSystem } from "./services/VaultFileSystem";

const knowledgeNotesLayer = KnowledgeNotes.layer.pipe(
	Layer.provide(VaultFileSystem.layer),
	Layer.provide(FrontmatterParser.layer),
);

const buildQmdIndexLayer = BuildQmdIndex.layer.pipe(
	Layer.provide(VaultFileSystem.layer),
	Layer.provide(knowledgeNotesLayer),
	Layer.provide(QmdBridge.layer),
);

const analyzeKnowledgeBaseLayer = AnalyzeKnowledgeBase.layer.pipe(
	Layer.provide(VaultFileSystem.layer),
	Layer.provide(knowledgeNotesLayer),
);

const importGoogleKeepLayer = ImportGoogleKeep.layer.pipe(
	Layer.provide(VaultFileSystem.layer),
);

export const vaultScriptLayer = Layer.mergeAll(
	BunServices.layer,
	FrontmatterParser.layer,
	VaultFileSystem.layer,
	knowledgeNotesLayer,
	QmdBridge.layer,
	buildQmdIndexLayer,
	analyzeKnowledgeBaseLayer,
	importGoogleKeepLayer,
);

export const qmdBridgeLayer = Layer.mergeAll(QmdBridge.layer);
