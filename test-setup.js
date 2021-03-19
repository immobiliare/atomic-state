const { addHook } = require('pirates');
const { transform } = require('sucrase');

const { JSDOM } = require('jsdom');

const dom = new JSDOM(
    '<!doctype html><html><head><meta charset="utf-8">' +
        '</head><body></body></html>',
    { pretendToBeVisual: true }
);

global.window = dom.window;

const apis = new Set(Object.keys(dom.window));

/**
 * These does not work by default and we don't need them ATM
 */
apis.delete('localStorage');
apis.delete('sessionStorage');

apis.forEach(function (key) {
    if (!global[key]) {
        global[key] = dom.window[key];
    }
});

addHook((code) => `import React from 'react';${code}`, {
    exts: ['.tsx'],
    ignoreNodeModules: false,
});

addHook(
    (code, filePath) => {
        const { code: transformedCode, sourceMap } = transform(code, {
            sourceMapOptions: { compiledFilename: filePath },
            transforms: ['imports', 'typescript', 'jsx'],
            filePath,
        });
        const mapBase64 = Buffer.from(JSON.stringify(sourceMap)).toString(
            'base64'
        );
        const suffix = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${mapBase64}`;
        return `${transformedCode}\n${suffix}`;
    },
    { exts: ['.ts', '.tsx'], ignoreNodeModules: false }
);
