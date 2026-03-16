import { createFileRoute } from "@tanstack/react-router";
import { SearchPrototypePage } from "@/components/search-prototype-page";
import { loadSearchLabData, validateSearchLabRoute } from "@/lib/search-lab";

export const Route = createFileRoute("/search-three")({
	validateSearch: validateSearchLabRoute,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => loadSearchLabData(deps),
	component: SearchThreeRoute,
});

function SearchThreeRoute() {
	return (
		<SearchPrototypePage
			data={Route.useLoaderData()}
			routePath="/search-three"
			search={Route.useSearch()}
			title="Search Three"
			variant="three"
		/>
	);
}
