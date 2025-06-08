import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "YouTube Music lricz",
    description: "Display synced lyrics for YouTube Music songs.",
    version: "1.0.0",
    icons: {
      "16": "icon/lriczy.png",
      "48": "icon/lriczy.png",
      "128": "icon/lriczy.png",
    },
  },
  modules: ["@wxt-dev/module-react"],
});
