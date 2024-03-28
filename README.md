<p>
<a href="https://www.npmjs.com/package/lib-configuration-resolver" target="_blank"><img src="https://img.shields.io/npm/v/lib-configuration-resolver.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~the1111mp" target="_blank"><img src="https://img.shields.io/npm/l/lib-configuration-resolver.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~the1111mp" target="_blank"><img src="https://img.shields.io/npm/dm/lib-configuration-resolver.svg" alt="NPM Downloads" /></a>
<a href="https://www.npmjs.com/package/lib-configuration-resolver" rel="nofollow"><img src="https://img.shields.io/github/stars/1111mp/lib-configuration-resolver" alt="stars"></a>
</p>

# lib-configuration-resolver

`lib-configuration-resolver` searches for and loads configuration for your library. Inspired by [Vite](https://vitejs.dev/) but supports more file formats.

By default, `lib-configuration-resolver` will check the current working directory for the following:

- JSON `*.json`
- YAML `*.{yml|yaml}`
- JavaScript `*.{js|mjs|cjs}`
- TypeScript `*.{ts|mts|cts}`

For example, if your module's name is `"resolver.config"`, `lib-configuration-resolver` will try to load configuration data from these files:

- `resolver.config.json`
- `resolver.config.yml`, `resolver.config.yaml`
- `resolver.config.js`, `resolver.config.mjs`, `resolver.config.cjs`
- `resolver.config.ts`, `resolver.config.mts`, `resolver.config.cts`

Alternatively you can change the search directory by passing `root`.

## Installation

```
npm install lib-configuration-resolver
```

## Quick Start

#### Basic usage

Use the `configResolver` api to automatically parse configuration files:

```ts
// resolver.config.ts
export default {
  name: "lib-configuration-resolver",
  desc: "This is a template for testing lib-configuration-resolver",
  entry: ["index.ts"],
  minify: true,
  plugins: [() => {}]
}
```

```ts
import { configResolver } from "lib-configuration-resolver"

interface Config {
  name: string
  desc: string
  entry: string[]
  minify: boolean
  plugins: VoidFunction[]
}

configResolver<Config>("resolver.config.ts").then(config => {
  // config: Config | null
  console.log(config)
  /**
   * config: {
      configFile: '/lib-configuration-resolver/resolver.config.ts',
      config: {
        name: 'lib-configuration-resolver',
        desc: 'This is a template for testing lib-configuration-resolver',
        entry: [ 'index.ts' ],
        minify: true,
        plugins: [ [Function (anonymous)] ]
      },
      dependencies: [ 'src/__tests__/configurations/resolver.config.ts' ]
    }
   */
})
```

Or just provide file name:

```ts
const config = await configResolver<Config>("resolver.config")
// config: Config | null
console.log(config)
/**
 * config: {
    configFile: '/lib-configuration-resolver/resolver.config.ts',
    config: {
      name: 'lib-configuration-resolver',
      desc: 'This is a template for testing lib-configuration-resolver',
      entry: [ 'index.ts' ],
      minify: true,
      plugins: [ [Function (anonymous)] ]
    },
    dependencies: [ 'src/__tests__/configurations/resolver.config.ts' ]
  }
 */

if (config === null) {
  // no config file found.
}
```

It will try to search for the following files:

```
[
  `resolver.config.json`,
  `resolver.config.yml`,
  `resolver.config.yaml`,
  `resolver.config.js`,
  `resolver.config.mjs`
  `resolver.config.cjs`,
  `resolver.config.ts`,
  `resolver.config.mts`,
  `resolver.config.cts`
]
```

#### With `defineConfig` helper

You can use the defineConfig helper to export your configuration:

```ts
// resolver.config.ts
import { defineConfig } from "lib-configuration-resolver"

interface Config {
  name: string
  desc: string
  entry: string[]
  minify: boolean
  plugins: VoidFunction[]
}

export default defineConfig<Config>(({ mode }) => {
  console.log(mode)
  // production or development
  // the value of process.env.NODE_ENV

  return {
    name: "lib-configuration-resolver",
    desc: "This is a template for testing lib-configuration-resolver",
    entry: ["index.ts"],
    minify: true,
    plugins: [() => {}]
  }
})
```

```ts
import { configResolver } from "lib-configuration-resolver"

const config = await configResolver<Config>("resolver.config")
// config: Config
console.log(config)
/**
 * config: {
    configFile: '/lib-configuration-resolver/resolver.config.ts',
    config: {
      name: 'lib-configuration-resolver',
      desc: 'This is a template for testing lib-configuration-resolver',
      entry: [ 'index.ts' ],
      minify: true,
      plugins: [ [Function (anonymous)] ]
    },
    dependencies: [ 'src/__tests__/configurations/resolver.config.ts' ]
  }
 */
```

#### Change search directory

Change the directory where configuration files are searched by passing `root`:

```ts
import { resolve } from "node:path"
import { configResolver } from "lib-configuration-resolver"

const config = await configResolver<Config>("resolver.config", {
  root: resolve(process.cwd(), "src", "__tests__", "configurations")
})
// config: Config
console.log(config)
/**
 * config: {
    configFile: '/lib-configuration-resolver/src/__tests__/configurations/resolver.config.ts',
    config: {
      name: 'lib-configuration-resolver',
      desc: 'This is a template for testing lib-configuration-resolver',
      entry: [ 'index.ts' ],
      minify: true,
      plugins: [ [Function (anonymous)] ]
    },
    dependencies: [ 'src/__tests__/configurations/resolver.config.ts' ]
  }
 */
```

## API

#### `configResolver`

```ts
type Config = {
  [key: string]: any
}

interface InlineConfig extends Config {
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

type ConfigResult<T extends Config> = {
  configFile: string
  config: T
  dependencies: string[]
}

declare function configResolver<T extends Config>(
  name: string,
  inlineConfig?: InlineConfig,
  defaultMode: string = "development"
): Promise<ConfigResult<T> | null>
```

#### `defineConfig`

```ts
interface ConfigEnv {
  mode: string
}

type ConfigFnObject<T> = (env: ConfigEnv) => T
type ConfigFnPromise<T> = (env: ConfigEnv) => Promise<T>
type ConfigFn<T> = (env: ConfigEnv) => T | Promise<T>
type ConfigExport<T extends Config> = T | Promise<T> | ConfigFnObject<T> | ConfigFnPromise<T> | ConfigFn<T>

declare function defineConfig<T extends Config>(config: ConfigExport<T>): ConfigExport<T>
```
