import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const pageImages: Plugin = {
  name: "page-images",
  configureServer(server) {
    server.middlewares.use("/pages", (req, res, next) => {
      const file = resolve(__dirname, "../work/view", (req.url ?? "").replace(/^\/+/, ""));
      if (!/page_\d{4}\.jpg$/.test(file)) return next();
      if (!existsSync(file)) return void res.writeHead(404).end();
      res.setHeader("Content-Type", "image/jpeg");
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({ base: "./", plugins: [react(), pageImages] });
