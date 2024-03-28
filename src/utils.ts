import { join, posix, relative } from "node:path"
import { existsSync } from "node:fs"
import { builtinModules, createRequire } from "node:module"
import { readFile } from "node:fs/promises"

interface PackageData {
  main?: string
  type?: "module" | "commonjs"
  dependencies?: Record<string, string>
}

let packageCached: PackageData | null = null

export function loadPackageData(root = process.cwd()): PackageData | null {
  if (packageCached) return packageCached
  const pkg = join(root, "package.json")
  if (existsSync(pkg)) {
    const _require = createRequire(import.meta.url)
    const data = _require(pkg)
    packageCached = {
      main: data.main,
      type: data.type,
      dependencies: data.dependencies
    }
    return packageCached
  }
  return null
}

export function isFilePathESM(filePath: string): boolean {
  if (/\.m[jt]s$/.test(filePath) || filePath.endsWith(".ts")) {
    return true
  } else if (/\.c[jt]s$/.test(filePath)) {
    return false
  } else {
    const pkg = loadPackageData()
    return pkg?.type === "module"
  }
}

export const isWindows = typeof process !== "undefined" && process.platform === "win32"

const windowsSlashRE = /\\/g
export function slash(p: string): string {
  return p.replace(windowsSlashRE, "/")
}

export function normalizePath(id: string): string {
  return posix.normalize(isWindows ? slash(id) : id)
}

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]"
}

// Supported by Node, Deno, Bun
const NODE_BUILTIN_NAMESPACE = "node:"
// Supported by Deno
const NPM_BUILTIN_NAMESPACE = "npm:"
// Supported by Bun
const BUN_BUILTIN_NAMESPACE = "bun:"
// Some runtimes like Bun injects namespaced modules here, which is not a node builtin
const nodeBuiltins = builtinModules.filter(id => !id.includes(":"))

// TODO: Use `isBuiltin` from `node:module`, but Deno doesn't support it
export function isBuiltin(id: string): boolean {
  if (process.versions.deno && id.startsWith(NPM_BUILTIN_NAMESPACE)) return true
  if (process.versions.bun && id.startsWith(BUN_BUILTIN_NAMESPACE)) return true
  return isNodeBuiltin(id)
}

export function isNodeBuiltin(id: string): boolean {
  if (id.startsWith(NODE_BUILTIN_NAMESPACE)) return true
  return nodeBuiltins.includes(id)
}

export async function loadJson(filepath: string) {
  const strip = (await import("strip-json-comments")).default
  try {
    return JSON.parse(strip(await readFile(filepath, "utf8")).trim())
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to parse ${relative(process.cwd(), filepath)}: ${err.message}`)
    } else {
      throw err
    }
  }
}

export async function loadYaml(filepath: string) {
  const { parse } = (await import("yaml")).default
  try {
    return parse(await readFile(filepath, "utf8"))
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to parse ${relative(process.cwd(), filepath)}: ${err.message}`)
    } else {
      throw err
    }
  }
}
