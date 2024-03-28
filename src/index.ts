import { dirname, extname, isAbsolute, resolve } from "node:path"
import { existsSync, realpath, unlink } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { createRequire } from "node:module"
import { promisify } from "node:util"
import { build } from "esbuild"
import { isBuiltin, isFilePathESM, isObject, loadJson, loadYaml, normalizePath } from "./utils"

const promisifiedRealpath = promisify(realpath)

export interface ConfigEnv {
  mode: string
}

type Config = {
  [key: string]: any
}

export interface InlineConfig extends Config {
  /**
   * Project root directory. Can be an absolute path, or a path relative from
   * the location of the config file itself.
   * @default process.cwd()
   */
  root?: string
  /**
   * Explicitly set a mode to run in. This will override the default mode.
   */
  mode?: string
}
export type ConfigResult<T extends Config> = {
  configFile: string
  config: T
  dependencies: string[]
}

export type ConfigFnObject<T> = (env: ConfigEnv) => T
export type ConfigFnPromise<T> = (env: ConfigEnv) => Promise<T>
export type ConfigFn<T> = (env: ConfigEnv) => T | Promise<T>

export type ConfigExport<T extends Config> = T | Promise<T> | ConfigFnObject<T> | ConfigFnPromise<T> | ConfigFn<T>

export function defineConfig<T extends Config>(config: ConfigExport<T>): ConfigExport<T> {
  return config
}

export async function configResolver<T extends Config>(
  name: string,
  inlineConfig: InlineConfig = {},
  defaultMode = "development"
): Promise<ConfigResult<T> | null> {
  let config = inlineConfig

  process.env.NODE_ENV = inlineConfig.mode || defaultMode

  const configEnv: ConfigEnv = {
    mode: process.env.NODE_ENV || "development"
  }

  const loadResult = await loadConfigFromFile<T>(name, configEnv, config.root)

  return loadResult
}

async function loadConfigFromFile<T extends Config>(
  name: string,
  configEnv: ConfigEnv,
  configRoot: string = process.cwd()
): Promise<ConfigResult<T> | null> {
  const resolvedPath = getConfigFilePath(name, configRoot)

  if (!resolvedPath) return null

  // *.json
  if (resolvedPath.endsWith(".json")) {
    const config = await loadJson(resolvedPath)
    return {
      configFile: normalizePath(resolvedPath),
      config,
      dependencies: []
    }
  }

  // *.{yml|yaml}
  if (resolvedPath.endsWith(".yml") || resolvedPath.endsWith(".yaml")) {
    const config = await loadYaml(resolvedPath)
    return {
      configFile: normalizePath(resolvedPath),
      config,
      dependencies: []
    }
  }

  const isESM = isFilePathESM(resolvedPath)

  try {
    const bundled = await bundleConfigFile(resolvedPath, isESM)
    const userConfig = await loadConfigFromBundledFile<T>(resolvedPath, bundled.code, isESM)

    const config = await (typeof userConfig === "function" ? userConfig(configEnv) : userConfig)

    if (!isObject(config)) {
      throw new Error(`config must export or return an object.`)
    }

    return {
      configFile: normalizePath(resolvedPath),
      config,
      dependencies: bundled.dependencies
    }
  } catch (err) {
    throw err
  }
}

async function bundleConfigFile(fileName: string, isESM: boolean) {
  const dirnameVarName = "__configuration_resolver_injected_dirname"
  const filenameVarName = "__configuration_resolver_injected_filename"
  const importMetaUrlVarName = "__configuration_resolver_injected_import_meta_url"
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [fileName],
    write: false,
    target: "node18",
    platform: "node",
    bundle: true,
    format: isESM ? "esm" : "cjs",
    sourcemap: false,
    metafile: true,
    define: {
      __dirname: dirnameVarName,
      __filename: filenameVarName,
      "import.meta.url": importMetaUrlVarName
    },
    plugins: [
      {
        name: "externalize-deps",
        setup(build): void {
          build.onResolve({ filter: /.*/ }, ({ path: id, kind }) => {
            if (isBuiltin(id)) {
              return { external: true }
            }

            if (id[0] !== "." && !isAbsolute(id)) {
              return {
                external: true
              }
            }
            return null
          })
        }
      },
      {
        name: "inject-file-scope-variables",
        setup(build): void {
          build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async args => {
            const contents = await readFile(args.path, "utf8")
            const injectValues =
              `const ${dirnameVarName} = ${JSON.stringify(dirname(args.path))};` +
              `const ${filenameVarName} = ${JSON.stringify(args.path)};` +
              `const ${importMetaUrlVarName} = ${JSON.stringify(pathToFileURL(args.path).href)};`

            return {
              loader: args.path.endsWith("ts") ? "ts" : "js",
              contents: injectValues + contents
            }
          })
        }
      }
    ]
  })

  const { text } = result.outputFiles[0]
  return {
    code: text,
    dependencies: result.metafile ? Object.keys(result.metafile.inputs) : []
  }
}

interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any
}

const _require = createRequire(import.meta.url)
async function loadConfigFromBundledFile<T extends Config>(
  fileName: string,
  bundledCode: string,
  isESM: boolean
): Promise<ConfigExport<T>> {
  // for esm, before we can register loaders without requiring users to run node
  // with --experimental-loader themselves, we have to do a hack here:
  // write it to disk, load it with native Node ESM, then delete the file.
  if (isESM) {
    const fileBase = `${fileName}.timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const fileNameTmp = `${fileBase}.mjs`
    const fileUrl = `${pathToFileURL(fileBase)}.mjs`
    await writeFile(fileNameTmp, bundledCode)
    try {
      return (await import(fileUrl)).default
    } finally {
      unlink(fileNameTmp, () => {}) // Ignore errors
    }
  }
  // for cjs, we can register a custom loader via `_require.extensions`
  else {
    const extension = extname(fileName)
    // We don't use fsp.realpath() here because it has the same behaviour as
    // fs.realpath.native. On some Windows systems, it returns uppercase volume
    // letters (e.g. "C:\") while the Node.js loader uses lowercase volume letters.
    const realFileName = await promisifiedRealpath(fileName)
    const loaderExt = extension in _require.extensions ? extension : ".js"
    const defaultLoader = _require.extensions[loaderExt]!
    _require.extensions[loaderExt] = (module: NodeModule, filename: string) => {
      if (filename === realFileName) {
        ;(module as NodeModuleWithCompile)._compile(bundledCode, filename)
      } else {
        defaultLoader(module, filename)
      }
    }
    // clear cache in case of server restart
    delete _require.cache[_require.resolve(fileName)]
    const raw = _require(fileName)
    _require.extensions[loaderExt] = defaultLoader
    return raw.__esModule ? raw.default : raw
  }
}

const DEFAULT_EXTENSIONS = [".js", ".ts", ".mjs", ".cjs", ".mts", ".cts", ".json", ".yml", ".yaml"]

function getConfigFilePath(name: string, configRoot: string): string {
  if (DEFAULT_EXTENSIONS.includes(extname(name))) {
    const filePath = resolve(configRoot, name)
    if (existsSync(filePath)) {
      return filePath
    }
  }

  for (const extension of DEFAULT_EXTENSIONS) {
    const filePath = resolve(configRoot, `${name}${extension}`)
    if (existsSync(filePath)) {
      return filePath
    }
  }

  return ""
}
