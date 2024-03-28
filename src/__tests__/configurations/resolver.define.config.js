import { defineConfig } from "../.."

export default defineConfig(async ({ mode }) => {
  console.log(mode)

  return {
    name: "lib-configuration-resolver",
    desc: "This is a template for testing lib-configuration-resolver",
    entry: ["index.ts"],
    minify: true,
    plugins: [() => {}]
  }
})