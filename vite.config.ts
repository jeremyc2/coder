import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const port = Number.parseInt(process.env["PORT"] ?? "3000", 10);

export default defineConfig({
	server: {
		port,
		host: process.env["HOST"],
	},
	optimizeDeps: {
		exclude: ["@tobilu/qmd", "node-llama-cpp", "ipull"],
	},
	plugins: [
		tailwindcss(),
		tanstackStart(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: "auto",
			includeAssets: ["icon.svg", "mask-icon.svg", "apple-touch-icon.png"],
			manifest: {
				name: "Vault",
				short_name: "Vault",
				description:
					"A private stash for useful things you were never supposed to lose.",
				theme_color: "#f97316",
				background_color: "#f97316",
				display: "fullscreen",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/pwa-192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/pwa-512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "/maskable-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				display_override: ["window-controls-overlay"],
			},
			devOptions: {
				enabled: true,
			},
		}),
		// react's vite plugin must come after start's vite plugin
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
	},
});
