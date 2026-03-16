/// <reference types="vite/client" />

import {
	createRootRoute,
	DefaultGlobalNotFound,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Vault",
			},
			{
				name: "description",
				content:
					"A private stash for useful things you were never supposed to lose.",
			},
			{
				name: "theme-color",
				content: "#fbfafa",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-title",
				content: "Vault",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/icon.svg",
			},
			{
				rel: "mask-icon",
				href: "/mask-icon.svg",
				color: "#1f312a",
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
			},
			{ rel: "stylesheet", href: appCss },
		],
	}),
	component: RootComponent,
	notFoundComponent: DefaultGlobalNotFound,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
