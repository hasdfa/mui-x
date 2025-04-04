import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

const repoRootDir = path.resolve(moduleDir, "..");
const docsRootDir = path.join(repoRootDir, "docs");
const docsDataDir = path.join(docsRootDir, "data");
const apiDataDir = path.join(docsRootDir, "pages/x/api");

const readPackageJson = (filepath) => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(repoRootDir, filepath, "package.json"), "utf8"));
  return {
    name: pkgJson.name,
    version: pkgJson.version,
  };
};

const rootPackageJson = readPackageJson(".");

export default {
  upload: {
    apiToken: "abc-token",
  },
  entities: [
    {
      package: {
        name: "mui-x-common-concepts",
        version: rootPackageJson.version,
      },
      repoRootDir,
      docsRootDir,
      docs: {
        dataRootDir: path.join(docsDataDir, "common-concepts"),
        componentsRoot: path.join(docsRootDir, "src"),
      },
    },
    {
      package: readPackageJson("packages/x-data-grid"),
      repoRootDir,
      docsRootDir,
      docs: {
        dataRootDir: path.join(docsDataDir, "data-grid"),
        componentsRoot: path.join(docsRootDir, "src"),
      },
      api: {
        dataRootDir: path.join(apiDataDir, "data-grid"),
        exclude: [
          'selectors.json',
        ]
      },
    },
    {
      package: readPackageJson("packages/x-charts"),
      repoRootDir,
      docsRootDir,
      docs: {
        dataRootDir: path.join(docsDataDir, "charts"),
        componentsRoot: path.join(docsRootDir, "src"),
      },
      api: {
        dataRootDir: path.join(apiDataDir, "charts"),
      },
    },
    {
      package: readPackageJson("packages/x-tree-view"),
      repoRootDir,
      docsRootDir,
      docs: {
        dataRootDir: path.join(docsDataDir, "tree-view"),
        componentsRoot: path.join(docsRootDir, "src"),
      },
      api: {
        dataRootDir: path.join(apiDataDir, "tree-view"),
      },
    },
    {
      package: readPackageJson("packages/x-date-pickers"),
      repoRootDir,
      docsRootDir,
      docs: {
        dataRootDir: path.join(docsDataDir, "date-pickers"),
        componentsRoot: path.join(docsRootDir, "src"),
        exclude: [
          /playground\/playground\.md$/,
        ],
      },
      api: {
        dataRootDir: path.join(apiDataDir, "date-pickers"),
      },
    },
  ]
};
