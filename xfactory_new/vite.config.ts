import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const V0_API_KEY = env.V0_API_KEY || env.VITE_V0_API_KEY || "";
  const V0_PROJECT_ID = env.V0_PROJECT_ID || env.VITE_V0_PROJECT_ID || "";
  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
    define: {
      // Expose only the required env keys for libs that read process.env
      'process.env.V0_API_KEY': JSON.stringify(V0_API_KEY),
      'process.env.V0_PROJECT_ID': JSON.stringify(V0_PROJECT_ID),
    }
  }
});
