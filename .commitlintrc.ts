import conventional from "@commitlint/config-conventional"

const Configuration = {
  extends: ["@commitlint/config-conventional"],
  plugins: ["commitlint-plugin-function-rules"],
  helpUrl: "https://github.com/1111mp/lib-configuration-resolver",
  rules: {
    ...conventional.rules,
    "type-enum": [2, "always", ["feat", "feature", "fix", "refactor", "docs", "build", "test", "ci", "chore"]],
    "function-rules/header-max-length": [0]
  }
}

export default Configuration
