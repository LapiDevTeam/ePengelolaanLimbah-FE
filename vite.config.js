import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 3001,
    historyApiFallback: true,
    allowedHosts: ["host.docker.internal", "localhost", "127.0.0.1"],
  },
  preview: {
    host: "0.0.0.0",
    port: 3001,
    historyApiFallback: true,
    allowedHosts: ["host.docker.internal", "localhost", "127.0.0.1"],
  },
});
