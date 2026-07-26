const globals = require("globals");
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const importPlugin = require("eslint-plugin-import");
const { sharedIgnores, sharedRules } = require("../eslint.shared.cjs");

module.exports = [
    {
        ignores: [...sharedIgnores, "lib/**/*", "generated/**/*", "eslint.config.cjs", "tsconfig.eslint.json"],
    },
    js.configs.recommended,
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parser: tsParser,
            parserOptions: {
                project: ["./tsconfig.json", "./tsconfig.dev.json"],
                tsconfigRootDir: __dirname,
                sourceType: "module",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            import: importPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            ...importPlugin.configs.recommended.rules,
            ...importPlugin.configs.warnings.rules,
            ...sharedRules,
            quotes: ["error", "double"],
            indent: ["error", 4],
            "import/no-unresolved": 0,
        },
    },
];
