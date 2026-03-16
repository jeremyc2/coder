import { createFileRoute } from "@tanstack/react-router";
import { SearchPrototypePage } from "@/components/search-prototype-page";
import { loadSearchLabData, validateSearchLabRoute } from "@/lib/search-lab";

export const Route = createFileRoute("/search-one")({
	validateSearch: validateSearchLabRoute,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadSearchLabData(deps),
	component: SearchOneRoute,
});

function SearchOneRoute() {
	return (
		<SearchPrototypePage
			data={Route.useLoaderData()}
			routePath="/search-one"
			search={Route.useSearch()}
			title="Search One"
			variant="one"
		/>
	);
}
