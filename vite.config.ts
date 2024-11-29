import { copyFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { version } from "pyodide";
import { fileURLToPath } from "url";
import { defineConfig } from 'vite';

function getCdnUrl(filename: string) {
  return `https://cdn.jsdelivr.net/pyodide/v${version}/full/${filename}`;
}

const bundlePyodide = !!process.env.BUNDLE_PYODIDE;

export default defineConfig(({ command }) => ({
  optimizeDeps: { exclude: ["pyodide"] },
  build: bundlePyodide ? {
    rollupOptions: {
      external(source, importer, isResolved) {
        if (!isResolved && importer?.endsWith('pyodide/pyodide.mjs') && source.startsWith('node:')) {
          return true;
        }
      },
    }
  } : undefined,
  resolve: !bundlePyodide && command === 'build' ? {
    alias: {
      'pyodide': `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    }
  } : undefined,
  plugins: [
    {
      name: "slidev-addon-python-runner",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          let match = req.url?.match(/\/node_modules\/pyodide\/(.+)$/);
          if (!match || !match[1].endsWith(".whl")) {
            return next();
          }
          const url = getCdnUrl(match[1]);
          res.writeHead(302, { Location: url });
          res.end();
        })
      },

      async generateBundle(options, bundle, isWrite) {
        if (!bundlePyodide) {
          return;
        }

        if (!isWrite) {
          console.log("Skipping pyodide assets copying");
          return;
        }

        const modulePath = fileURLToPath(import.meta.resolve("pyodide"))

        // Get where the "pyodide" module is located
        let path: string | null = null
        for (const file in bundle) {
          const chunk = bundle[file]
          if (chunk.type === "chunk" && chunk.modules) {
            for (const module of Object.keys(chunk.modules)) {
              if (module.includes("pyodide")) {
                if (path) {
                  throw new Error("Found multiple pyodide modules")
                }
                path = file
                break
              }
            }
          }
        }
        if (!path) {
          throw new Error("Could not find the pyodide module")
        }

        const assetsDir = dirname(join(options.dir!, path));
        await mkdir(assetsDir, { recursive: true });
        const files = [
          "pyodide-lock.json",
          "pyodide.asm.js",
          "pyodide.asm.wasm",
          "python_stdlib.zip",
        ];
        for (const file of files) {
          await copyFile(
            join(dirname(modulePath), file),
            join(assetsDir, file),
          );
        }
      },
    },
  ],
}))
