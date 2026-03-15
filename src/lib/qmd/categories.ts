export type KnowledgeNoteSeed = {
	title: string;
	body: string;
	labels: string[];
	relativePath: string;
};

export type CategoryDefinition = {
	name: string;
	label: string;
	description: string;
	context: string;
	accent: string;
};

export type CategoryMatch = {
	category: CategoryDefinition;
	score: number;
	reasons: string[];
};

type Rule = {
	category: string;
	score: number;
	reason: string;
	test: (note: KnowledgeNoteSeed) => boolean;
};

export const categoryDefinitions = [
	{
		name: "spiritual-study",
		label: "Spiritual Study",
		description:
			"Scripture study, devotionals, church talks, faith questions, and gospel reflections.",
		context:
			"Personal spiritual study, church notes, devotionals, scripture references, and religious reflection.",
		accent: "amber",
	},
	{
		name: "family-relationships",
		label: "Family + Relationships",
		description:
			"Family life, marriage, parenting, memories, emotional processing, and social notes.",
		context:
			"Family relationships, marriage, parenting, personal memories, and relationship reflections.",
		accent: "rose",
	},
	{
		name: "home-life",
		label: "Home Life",
		description:
			"Meals, errands, travel, cars, repairs, health, groceries, and daily logistics.",
		context:
			"Household logistics, errands, food, travel, maintenance, vehicles, and day-to-day life management.",
		accent: "emerald",
	},
	{
		name: "admin-finance",
		label: "Admin + Finance",
		description:
			"Accounts, budgets, insurance, payroll, addresses, IDs, service logins, and records.",
		context:
			"Administrative records, finances, credentials, bills, insurance, payroll, and personal account information.",
		accent: "sky",
	},
	{
		name: "work-tech",
		label: "Work + Tech",
		description:
			"Software, engineering, work notes, coding references, interviews, and tooling.",
		context:
			"Software engineering, work references, coding links, technical notes, and career material.",
		accent: "violet",
	},
	{
		name: "culture-ideas",
		label: "Culture + Ideas",
		description:
			"Books, films, politics, history, art, media, quotes, and broader cultural commentary.",
		context:
			"Media references, politics, history, art, quotes, cultural commentary, and broad ideas.",
		accent: "orange",
	},
	{
		name: "scratchpad",
		label: "Scratchpad",
		description:
			"Quick captures, links, fragments, and notes that do not clearly belong elsewhere yet.",
		context:
			"Miscellaneous captures, one-off reminders, raw fragments, and uncategorized references.",
		accent: "stone",
	},
] as const satisfies readonly CategoryDefinition[];

const categoryByName = new Map<string, CategoryDefinition>(
	categoryDefinitions.map((category) => [category.name, category]),
);

function haystack(note: KnowledgeNoteSeed) {
	return [note.title, note.body, note.relativePath, note.labels.join(" ")].join(
		"\n",
	);
}

function matchText(pattern: RegExp, note: KnowledgeNoteSeed) {
	return pattern.test(haystack(note));
}

const rules: Rule[] = [
	{
		category: "spiritual-study",
		score: 10,
		reason: "matched explicit scripture-study label",
		test: (note) =>
			note.labels.some((label) =>
				/(scripture study|devotional|church|seminary)/i.test(label),
			),
	},
	{
		category: "spiritual-study",
		score: 7,
		reason: "matched gospel and scripture language",
		test: (note) =>
			matchText(
				/\b(jesus christ|gospel|temple|book of mormon|scripture|pray(?:er)?|faith|church|conference|elder|sacrament|revelation|apostasy|covenant|lds|mormon)\b/i,
				note,
			),
	},
	{
		category: "family-relationships",
		score: 8,
		reason: "matched family and relationship language",
		test: (note) =>
			matchText(
				/\b(bella|luca|bruno|mozzie|family|marriage|spouse|wife|husband|wedding|date ideas?|parent|parenting|kids?|child|friend|loneliness|divorce)\b/i,
				note,
			),
	},
	{
		category: "home-life",
		score: 8,
		reason: "matched household, errands, or food language",
		test: (note) =>
			matchText(
				/\b(meal|recipe|grocery|toast|tomatoes?|pizza|cauliflower|shampoo|dish soap|oat milk|house|apartment|maintenance|stairs|garage|electric|fiber|pest|car|trip|travel|things to do|adventure)\b/i,
				note,
			),
	},
	{
		category: "admin-finance",
		score: 10,
		reason: "matched credentials or account records",
		test: (note) =>
			matchText(
				/\b(password|username|pin|account|login|icloud|venmo|fidelity|arvest|payroll|budget|salary|insurance|deductible|loan|mailing address|address|vin|title|claim)\b/i,
				note,
			),
	},
	{
		category: "work-tech",
		score: 8,
		reason: "matched software or work topics",
		test: (note) =>
			matchText(
				/\b(react|css|grid|rust|repo|github|api|frontend|view transition|code|developer|interview|m science|work pin|byod|servor|effect|tanstack)\b/i,
				note,
			),
	},
	{
		category: "culture-ideas",
		score: 7,
		reason: "matched media, politics, history, or cultural topics",
		test: (note) =>
			matchText(
				/\b(netflix|max|movie|show|book|music|art|quote|politic|republican|biden|climate|afghanistan|islam|atheism|amendment|history|newsroom)\b/i,
				note,
			),
	},
	{
		category: "culture-ideas",
		score: 4,
		reason: "matched saved external reference link",
		test: (note) =>
			/^https?:\/\//i.test(note.title) ||
			/^https?:\/\//i.test(note.body.trim()),
	},
	{
		category: "scratchpad",
		score: 1,
		reason: "used fallback bucket",
		test: () => true,
	},
];

export function classifyKnowledgeNote(note: KnowledgeNoteSeed): CategoryMatch {
	const totals = new Map<string, { score: number; reasons: string[] }>();
	const fallbackCategory = categoryDefinitions[categoryDefinitions.length - 1];
	if (!fallbackCategory) {
		throw new Error("At least one category definition is required.");
	}

	for (const rule of rules) {
		if (!rule.test(note)) {
			continue;
		}

		const current = totals.get(rule.category) ?? { score: 0, reasons: [] };
		current.score += rule.score;
		current.reasons.push(rule.reason);
		totals.set(rule.category, current);
	}

	const [categoryName, outcome] = [...totals.entries()].sort(
		(left, right) => right[1].score - left[1].score,
	)[0] ?? ["scratchpad", { score: 1, reasons: ["used fallback bucket"] }];

	return {
		category: categoryByName.get(categoryName) ?? fallbackCategory,
		score: outcome.score,
		reasons: outcome.reasons,
	};
}

export function getCategoryDefinition(name: string) {
	return categoryByName.get(name);
}
