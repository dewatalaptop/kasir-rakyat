// Runs the REAL app in a real browser against fake Google (Sheets/Drive/login) and a
// fake payment server, so UI/layout/tour behaviour can be exercised without touching
// anyone's real spreadsheet.   npm run sim   ->   http://localhost:5199/sim?biz=warung&nopw=1&tour=1&reset=1
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const fake = (f: string) => path.resolve(__dirname, "sim", f);

// Every browser navigation (the app uses real paths like /kasir/riwayat, and a reload
// must keep working) is answered with sim.html, never the real index.html.
const simHtmlFallback: Plugin = {
  name: "sim-html-fallback",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? "/";
      const isPage = req.method === "GET" && (req.headers.accept ?? "").includes("text/html");
      if (isPage && !/^\/(@|node_modules|src|sim\/)/.test(url)) req.url = "/sim.html";
      next();
    });
  },
};

export default defineConfig({
  plugins: [simHtmlFallback, react()],
  resolve: {
    alias: {
      "firebase/app": fake("fakeApp.ts"),
      "firebase/auth": fake("fakeAuth.ts"),
      "firebase/functions": fake("fakeFunctions.ts"),
      "@capacitor-firebase/authentication": fake("fakeNativeAuth.ts"),
    },
  },
  server: { port: 5199, strictPort: true },
});
