import { browser } from 'webextension-polyfill-ts';

browser.devtools.panels.create(
    'AtomicState',
    '/assets/icons/logo.svg',
    '/devtools-panel.html'
);
