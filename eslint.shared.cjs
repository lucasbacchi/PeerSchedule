const sharedIgnores = [
    "**/dist/**",
    "**/public/**",
    "**/node_modules/**",
    "**/.react-router/**",
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
