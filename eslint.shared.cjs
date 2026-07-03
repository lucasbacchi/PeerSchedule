const sharedIgnores = [
    "**/dist/**",
    "**/public/**",
    "**/node_modules/**",
    "**/.react-router/**",
    "**/*.config.js",
    "**/*.config.ts",
    "**/components/ui/**",
];

const sharedRules = {
    "no-var": "error",
    "prefer-const": "warn",
    eqeqeq: ["error", "always"],
    "sort-imports": [
        "error",
        {
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
        },
    ],
};

module.exports = {
    sharedIgnores,
    sharedRules,
};
