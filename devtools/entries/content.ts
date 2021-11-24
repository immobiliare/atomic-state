import { browser, Runtime } from 'webextension-polyfill-ts';
import {
    ATOM_LOG,
    ATOM_LOG_ITEM,
    CONTENT_TO_BACKGROUND_MESSAGE,
} from '../types';

type ATOM_EVENT = {
    from: string;
    type: ATOM_LOG_ITEM['type'];
    key: string;
    value: any;
};

const log: ATOM_LOG = [];

let port: Runtime.Port;

const sendData = (data: CONTENT_TO_BACKGROUND_MESSAGE) =>
    port.postMessage(data);

let id = 0;

window.onmessage = ({ data }: { data: ATOM_EVENT }) => {
    if (data && data.from === 'state-atom') {
        const payload = {
            type: data.type,
            key: data.key,
            value: data.value,
            uid: id++,
            time: Date.now(),
        };

        if (!port) {
            port = browser.runtime.connect(browser.runtime.id, {
                name: 'atomic-state-devtool',
            });

            port.onMessage.addListener(() => {
                sendData({ type: 'HYDRATION', value: log });
            });
        }

        log.push(payload);
        sendData(payload);
    }
};
