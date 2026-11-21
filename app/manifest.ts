import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klin — Your AI Workspace",
    short_name: "Klin",
    description: "Your AI workspace for conversations and projects.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#060913",
    theme_color: "#070b16",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}