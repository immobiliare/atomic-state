module.exports = {
    '*.{ts,tsx,js,css,json,md,yaml,yml}': ['prettier --write'],
    '*.md': (filenames) =>
        filenames.map((filename) => `'markdown-toc -i ${filename}`),
    '*.{ts,tsx,js}': ['eslint --fix'],
};
