import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import eslintConfigPrettier from "eslint-config-prettier";
import sharedConfig from "./eslint.shared.cjs";

const { sharedIgnores, sharedRules } = sharedConfig;

export default [
    // Global ignores
    {
        ignores: [
            ...sharedIgnores,
            "eslint.shared.cjs",
            "functions/eslint.config.cjs",
            "functions/.eslintrc.js",
            "functions/src/**",
            "functions/lib/**",
            "functions/generated/**",
        ],
    },

    // Base configs
    {
        files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    },

    // Apply recommended configs
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,

    // React configuration
    {
        files: ["**/*.{jsx,tsx}"],
        plugins: {
            "react-hooks": pluginReactHooks,
            "react-refresh": pluginReactRefresh,
            "jsx-a11y": pluginJsxA11y,
        },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
            ...pluginJsxA11y.configs.recommended.rules,

            // Data-fetching effects intentionally update loading and result state.
            "react-hooks/set-state-in-effect": "off",
            "jsx-a11y/no-onchange": "off",

            // React Refresh
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
        },
    },

    // TypeScript source files with type-aware linting
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    ...tseslint.configs.recommendedTypeChecked
        .filter((c) => !c.files)
        .map((c) => ({ ...c, files: ["src/**/*.{ts,tsx}"] })),
    ...tseslint.configs.stylisticTypeChecked
        .filter((c) => !c.files)
        .map((c) => ({ ...c, files: ["src/**/*.{ts,tsx}"] })),

    // TypeScript for config files (no type checking)
    {
        files: ["vite.config.ts", "react-router.config.ts", "eslint.config.js"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Custom project rules
    {
        rules: {
            ...sharedRules,
        },
    },

    // Prettier integration (must be last)
    eslintConfigPrettier,
];
