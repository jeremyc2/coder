import { createFileRoute } from "@tanstack/react-router";
import { SearchPrototypePage } from "@/components/search-prototype-page";
import { loadSearchLabData, validateSearchLabRoute } from "@/lib/search-lab";

export const Route = createFileRoute("/search-four")({
	validateSearch: validateSearchLabRoute,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadSearchLabData(deps),
	component: SearchFourRoute,
});

function SearchFourRoute() {
	return (
		<SearchPrototypePage
			data={Route.useLoaderData()}
			routePath="/search-four"
			search={Route.useSearch()}
			title="Search Four"
			variant="four"
		/>
	);
}
