import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
	server: {
		handlers: {
			GET: () => {
				return new Response(
					JSON.stringify({
						status: "healthy",
						version: process.env["npm_package_version"],
						bunVersion: Bun.version,
						date: new Date().toString(),
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
