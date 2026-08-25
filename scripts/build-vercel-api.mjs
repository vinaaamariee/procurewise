import { build } from "esbuild";

await build({
  entryPoints: ["server/vercelApiEntrypoint.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: "api/index.mjs",
  sourcemap: false,
});
