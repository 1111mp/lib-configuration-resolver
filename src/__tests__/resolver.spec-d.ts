import { describe, expectTypeOf, test } from "vitest"
import { configResolver, defineConfig, type ConfigExport, type ConfigResult, type InlineConfig } from ".."

interface Config {
  name: string
  desc: string
  entry: string[]
  minify: boolean
  plugins: VoidFunction[]
}

describe("testing types", () => {
  test("configResolver api", () => {
    expectTypeOf(configResolver).parameter(0).toBeString()
    expectTypeOf(configResolver).parameter(1).toEqualTypeOf<InlineConfig | undefined>()

    expectTypeOf(configResolver<Config>).returns.resolves.toEqualTypeOf<ConfigResult<Config> | null>()
  })

  test("defineConfig api", () => {
    expectTypeOf(defineConfig<Config>).parameters.toEqualTypeOf<[ConfigExport<Config>]>()
    expectTypeOf(defineConfig<Config>).returns.resolves.toEqualTypeOf<Config>()
  })
})
