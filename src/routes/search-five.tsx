import { createFileRoute } from "@tanstack/react-router";
import { SearchPrototypePage } from "@/components/search-prototype-page";
import { loadSearchLabData, validateSearchLabRoute } from "@/lib/search-lab";

export const Route = createFileRoute("/search-five")({
	validateSearch: validateSearchLabRoute,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadSearchLabData(deps),
	component: SearchFiveRoute,
});

function SearchFiveRoute() {
	return (
		<SearchPrototypePage
			data={Route.useLoaderData()}
			routePath="/search-five"
			search={Route.useSearch()}
			title="Search Five"
			variant="five"
		/>
	);
}
