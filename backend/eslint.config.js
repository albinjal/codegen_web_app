import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.node,
        },
        plugins: { '@typescript-eslint': tseslint },
        rules: {
            // Add your custom rules here
        },
    },
];
