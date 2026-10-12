import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    // Uses src/server.ts as the server entry (our error-page wrapper).
    tanstackStart({ server: { entry: "server" } }),
    // Builds the server for Vercel.
    nitro({ preset: "vercel" }),
    viteReact(),
    tailwindcss(),
  ],
});
