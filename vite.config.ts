import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert"; // plugin for local HTTPS

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    port: 5173,
    https: {}, // ✅ Empty object → mkcert will inject HTTPS certs automatically
  },
  plugins: [
    react(),
    mkcert(), // ✅ Automatically generates and trusts certificates
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
