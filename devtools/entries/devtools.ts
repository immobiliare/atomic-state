import { browser } from 'webextension-polyfill-ts';

browser.devtools.panels.create(
    'State Atom',
    '/assets/icons/logo.svg',
    '/devtools-panel.html'
);
