import { browser, Runtime } from 'webextension-polyfill-ts';
import {
    ATOM_LOG,
    BACKGROUND_TO_DEVTOOLS_MESSAGE,
    CONTENT_TO_BACKGROUND_MESSAGE,
} from '../types';

function connected(currentPort: Runtime.Port) {
    switch (currentPort.name) {
        case 'atomic-state-panel':
            handleDevToolPanel(currentPort);
            break;
        case 'atomic-state-devtool':
            handleContent(currentPort);
    }
}

const emitters = new Map<Runtime.Port, ATOM_LOG>();
let listeners = new Set<Runtime.Port>();

function handleDevToolPanel(port: Runtime.Port) {
    const log = Array.from(emitters.values())[0];

    // Sync the initial state
    port.postMessage({ type: 'CHUNK', value: log || [] });
    listeners.add(port);

    port.onDisconnect.addListener(() => {
        listeners.delete(port);
    });
}

function handleContent(port: Runtime.Port) {
    let log: ATOM_LOG = [];
    let chunk: ATOM_LOG = [];

    let timer: ReturnType<typeof setTimeout>;

    emitters.set(port, log);

    port.onMessage.addListener((payload: CONTENT_TO_BACKGROUND_MESSAGE) => {
        switch (payload.type) {
            case 'NEW_ATOM':
            case 'UPDATE_ATOM':
                log.push(payload);

                chunk.push(payload);
                break;
            case 'HYDRATION':
                log = payload.value || [];
                emitters.set(port, log);
                chunk.push(...log);
                break;
            default:
                return;
        }

        clearTimeout(timer);
        timer = setTimeout(sendChunk, 100);
    });

    function sendChunk() {
        listeners.forEach((p) =>
            p.postMessage({
                type: 'CHUNK',
                value: chunk,
            } as BACKGROUND_TO_DEVTOOLS_MESSAGE)
        );
        chunk = [];
    }

    // Requests the initial data
    port.postMessage({ type: 'MOLLA_IL_MALLOPPO' });

    port.onDisconnect.addListener(() => {
        emitters.delete(port);
        listeners.forEach((p) => p.postMessage({ type: 'UNLOAD' }));
    });
}

browser.runtime.onConnect.addListener(connected);
