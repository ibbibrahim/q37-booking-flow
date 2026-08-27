import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const appBuildId = process.env.VITE_BUILD_ID ?? `${Date.now()}`;

function appVersionPlugin(buildId: string): Plugin {
  return {
    name: "app-version",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(
          {
            buildId,
            builtAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(process.env.NODE_ENV === "production" ? appBuildId : "dev"),
  },
  server: {
    host: "localhost",
    port: 5173,
  },
  plugins: [
    react(),
    appVersionPlugin(appBuildId),
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
