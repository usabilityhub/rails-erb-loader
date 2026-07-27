import { defineConfig } from "eslint/config"
// import {fixupConfigRules} from "@eslint/compat"
import eslint from "@eslint/js"
import importX from "eslint-plugin-import-x"
// import node from "eslint-plugin-n"
// import pluginPromise from "eslint-plugin-promise"
import neostandard from "neostandard"
import pluginPromise from "eslint-plugin-promise"

export default defineConfig([
  ...neostandard({
    noStyle: true,
  }),
  eslint.configs.recommended,
  importX.flatConfigs.recommended,
  pluginPromise.configs['flat/recommended'],
  {
    rules: {
      'no-var': "off",
    }
  }
])
