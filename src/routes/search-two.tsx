import { createFileRoute } from "@tanstack/react-router";
import { SearchPrototypePage } from "@/components/search-prototype-page";
import { loadSearchLabData, validateSearchLabRoute } from "@/lib/search-lab";

export const Route = createFileRoute("/search-two")({
	validateSearch: validateSearchLabRoute,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadSearchLabData(deps),
	component: SearchTwoRoute,
});

function SearchTwoRoute() {
	return (
		<SearchPrototypePage
			data={Route.useLoaderData()}
			routePath="/search-two"
			search={Route.useSearch()}
			title="Search Two"
			variant="two"
		/>
	);
}
