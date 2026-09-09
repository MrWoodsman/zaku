import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest", // wlasny service worker (src/sw.ts) zamiast auto-generowanego, zeby dopisac obsluge push
      srcDir: "src",
      filename: "sw.ts",
      // Service worker wylaczony w dev: vite-plugin-pwa ma znany problem
      // z rejestracja dev-sw jako modulu na wlasnej domenie (dev.mrwoodsman.pl) -
      // rejestracja konczy sie bledem "Unexpected token export" i nic nie dziala.
      // Produkcyjny build (npm run build) nie jest tym dotkniety - service worker
      // i push notifications tam dzialaja normalnie, wiec tam warto testowac push.
      devOptions: {
        enabled: false,
      },
      registerType: "autoUpdate", // automatycznie odświeża apkę, jak zmienisz kod
      manifest: {
        name: "Zaku",
        short_name: "Zaku",
        description: "Domowa lista zakupów",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone", // wymusza tryb pełnoekranowy (bez przeglądarki)
        icons: [
          {
            src: "/192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable", // pozwala systemom na ładne przycinanie/zaokrąglanie ikony
          },
          {
            src: "/512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["dev.mrwoodsman.pl"],
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/images": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
