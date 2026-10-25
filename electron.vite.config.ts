import react from "@vitejs/plugin-react";
import {
  defineConfig,
  externalizeDepsPlugin,
  loadEnv,
  swcPlugin,
} from "electron-vite";
import { resolve } from "path";
import svgr from "vite-plugin-svgr";
import { scopeBigPictureCss } from "./src/big-picture/vite-scope-big-picture-css";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig(({ mode }) => {
  loadEnv(mode);

  return {
    main: {
      build: {
        sourcemap: true,
        minify: false, // <--- ДОБАВЛЕНО: Отключаем сжатие, чтобы Vite не падал на циклах
        rollupOptions: {
          external: [
            "7zip-bin",
            "hydra-native.node",
            "electron",
            /^7zip-bin\/.*/
          ],
          // <--- ДОБАВЛЕНО: Игнорируем предупреждения о циклических зависимостях
          onwarn(warning, warn) {
            if (warning.code === 'CIRCULAR_DEPENDENCY') return;
            warn(warning);
          }
        },
      },
      resolve: {
        alias: {
          "@main": resolve("src/main"),
          "@locales": resolve("src/locales"),
          "@resources": resolve("resources"),
          "@shared": resolve("src/shared"),
        },
      },
      plugins: [
        externalizeDepsPlugin({
          exclude: ["7zip-bin", "hydra-native.node"]
        }), 
        swcPlugin()
      ],
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
    },
    bigPicture: {
      root: "src/big-picture",
      build: {
        outDir: "out/big-picture",
        rollupOptions: {
          input: resolve("src/big-picture/index.html"),
        },
      },
      css: {
        postcss: {
          plugins: [scopeBigPictureCss()],
        },
      },
      resolve: {
        alias: {
          "@renderer": resolve("src/renderer/src"),
          "@locales": resolve("src/locales"),
          "@shared": resolve("src/shared"),
        },
      },
      plugins: [svgr(), react()],
    },
    renderer: {
      build: {
        sourcemap: true,
      },
      esbuild: {
        keepNames: true,
      },
      css: {
        postcss: {
          plugins: [
            tailwindcss(),
            autoprefixer(),
            scopeBigPictureCss()
          ],
        },
        preprocessorOptions: {
          scss: {
            api: "modern",
          },
        },
      },
      resolve: {
        alias: {
          "@renderer": resolve("src/renderer/src"),
          "@locales": resolve("src/locales"),
          "@shared": resolve("src/shared"),
        },
      },
      plugins: [svgr(), react()],
    },
  };
});