import { resolve } from "node:path"
import { describe, expect, test } from "vitest"
import { configResolver } from ".."

interface Config {
  name: string
  desc: string
  entry: string[]
  minify: boolean
  plugins: VoidFunction[]
}

const root = resolve(process.cwd(), "src", "__tests__", "configurations")
const runner = async (name: string) => {
  const resolver = await configResolver<Config>(name, { root })
  console.log("resolver: ", resolver)
  expect(resolver).not.toBeNull()

  const { configFile, config, dependencies } = resolver!
  expect(configFile).toBeTypeOf("string")
  expect(Array.isArray(dependencies)).toBeTruthy()
  expect(config).toBeDefined()

  expect(config).toHaveProperty("name")
  expect(config).toHaveProperty("desc")
  expect(config).toHaveProperty("entry")
  expect(config).toHaveProperty("minify")
  expect(config).toHaveProperty("plugins")
}

describe("configuration language: json", () => {
  test("file extension: '.json'", async () => {
    await runner("resolver.config.json")
  })
})

describe("configuration language: yaml", () => {
  test("file extension: '.yml'", async () => {
    await runner("resolver.config.yml")
  })

  test("file extension: '.yaml'", async () => {
    await runner("resolver.config.yaml")
  })
})

describe("configuration language: typescript", () => {
  test("file extension: '.ts'", async () => {
    await runner("resolver.config.ts")
  })

  test("file extension: '.mts'", async () => {
    await runner("resolver.esmodule.config")
  })

  test("file extension: '.cts'", async () => {
    await runner("resolver.common.config")
  })

  test("get configuration data through defineConfig method", async () => {
    await runner("resolver.define.config.ts")
  })
})

describe("configuration language: javascript", () => {
  test("file extension: '.js'", async () => {
    await runner("resolver.config.js")
  })

  test("file extension: '.mjs'", async () => {
    await runner("resolver.config.mjs")
  })

  test("file extension: '.cjs'", async () => {
    await runner("resolver.config.cjs")
  })

  test("get configuration data through defineConfig method", async () => {
    await runner("resolver.define.config.js")
  })
})
