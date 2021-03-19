module.exports = {
    parser: '@typescript-eslint/parser',
    env: {
        es6: true,
        node: true,
        commonjs: true,
        browser: true,
    },
    parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    extends: [
        'eslint:recommended',
        'plugin:prettier/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
    ],
    rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/jsx-no-target-blank': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'no-unused-vars': 0,
        'no-undef': 0, // see https://github.com/typescript-eslint/typescript-eslint/issues/342#issuecomment-484739065
        'no-empty': 0,
    },
    globals: {
        React: 'writable',
        EventListenerOrEventListenerObject: false,
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
};
