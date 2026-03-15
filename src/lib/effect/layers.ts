import { BunServices } from "@effect/platform-bun";
import { Layer } from "effect";
import { AnalyzeKnowledgeBase } from "./services/AnalyzeKnowledgeBase";
import { BuildQmdIndex } from "./services/BuildQmdIndex";
import { FrontmatterParser } from "./services/FrontmatterParser";
import { ImportGoogleKeep } from "./services/ImportGoogleKeep";
import { KnowledgeNotes } from "./services/KnowledgeNotes";
import { QmdBridge } from "./services/QmdBridge";
import { VaultFileSystem } from "./services/VaultFileSystem";

const frontmatterParserLayer = FrontmatterParser.layer;

const vaultFileSystemLayer = VaultFileSystem.layer.pipe(
	Layer.provide(BunServices.layer),
);

const knowledgeNotesLayer = KnowledgeNotes.layer.pipe(
	Layer.provide([vaultFileSystemLayer, frontmatterParserLayer]),
);

export const qmdBridgeLayer = QmdBridge.layer;

const buildQmdIndexLayer = BuildQmdIndex.layer.pipe(
	Layer.provide([vaultFileSystemLayer, knowledgeNotesLayer, qmdBridgeLayer]),
);

const analyzeKnowledgeBaseLayer = AnalyzeKnowledgeBase.layer.pipe(
	Layer.provide([vaultFileSystemLayer, knowledgeNotesLayer]),
);

const importGoogleKeepLayer = ImportGoogleKeep.layer.pipe(
	Layer.provide(vaultFileSystemLayer),
);

export const vaultScriptLayer = Layer.mergeAll(
	frontmatterParserLayer,
	vaultFileSystemLayer,
	knowledgeNotesLayer,
	qmdBridgeLayer,
	buildQmdIndexLayer,
	analyzeKnowledgeBaseLayer,
	importGoogleKeepLayer,
);

export const qmdBridgeRuntimeLayer = qmdBridgeLayer.pipe(
	Layer.provideMerge(BunServices.layer),
);

export const vaultScriptRuntimeLayer = vaultScriptLayer.pipe(
	Layer.provideMerge(BunServices.layer),
);
