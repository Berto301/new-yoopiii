import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "GOOGLE_"],
  envDir: "../../",
  resolve: {
    dedupe: ["react", "react-dom"]
  },
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react/jsx-runtime", "three", "three/examples/jsm/controls/OrbitControls.js"]
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
