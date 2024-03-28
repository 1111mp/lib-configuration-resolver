import { defineConfig } from "../../"

interface Config {
  name: string
  desc: string
  entry: string[]
  minify: boolean
  plugins: VoidFunction[]
}

export default defineConfig<Config>(({ mode }) => {
  console.log(mode)

  return {
    name: "lib-configuration-resolver",
    desc: "This is a template for testing lib-configuration-resolver",
    entry: ["index.ts"],
    minify: true,
    plugins: [() => {}]
  }
})
