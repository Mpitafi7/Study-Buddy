import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { handleVerify, handleChatStream } from "./server/api";

// Load .env into process.env so server API can read GEMINI_API_KEY
const env = loadEnv(process.env.MODE ?? "development", process.cwd(), "");
const key = env.GEMINI_API_KEY?.trim();
if (key) process.env.GEMINI_API_KEY = key;

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: ["es2022", "chrome89", "edge89", "firefox89", "safari15"],
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    {
      name: "gemini-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0];
          if (url === "/api/verify") {
            handleVerify(req, res).catch(next);
            return;
          }
          if (url === "/api/chat/stream") {
            handleChatStream(req, res).catch(next);
            return;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0];
          if (url === "/api/verify") {
            handleVerify(req, res).catch(next);
            return;
          }
          if (url === "/api/chat/stream") {
            handleChatStream(req, res).catch(next);
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
