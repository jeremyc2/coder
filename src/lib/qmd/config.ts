import { categoryDefinitions } from "./categories";

export const knowledgeBaseRoot = "private/knowledge-base";
export const qmdRoot = "private/qmd";
export const qmdCollectionsRoot = `${qmdRoot}/collections`;
export const qmdDbPath = `${qmdRoot}/index.sqlite`;

export const qmdCollectionEntries = categoryDefinitions.map((category) => ({
	...category,
	path: `${qmdCollectionsRoot}/${category.name}`,
	pattern: "**/*.md",
}));

export const qmdGlobalContext =
	"Jeremy's private markdown vault with personal notes, household admin, technical references, spiritual study, and family life.";
