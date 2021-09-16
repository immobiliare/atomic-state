import { useEffect, useMemo, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import {
    ATOM_LOG,
    ATOM_LOG_ITEM,
    BACKGROUND_TO_DEVTOOLS_MESSAGE,
} from '../types';

export function useStateAtomLog() {
    const [state, setState] = useState<Record<number, ATOM_LOG_ITEM>>({});

    useEffect(() => {
        const currentPort = browser.runtime.connect(browser.runtime.id, {
            name: 'atomic-state-panel',
        });

        currentPort.onMessage.addListener(
            (payload: BACKGROUND_TO_DEVTOOLS_MESSAGE) => {
                switch (payload.type) {
                    case 'CHUNK':
                        setState((state) =>
                            payload.value.reduce(
                                (acc, item) => {
                                    acc[item.uid] = item;
                                    return acc;
                                },
                                { ...state }
                            )
                        );
                        break;
                    case 'UNLOAD':
                        setState({});
                        break;
                }
            }
        );

        return () => {
            currentPort.disconnect();
        };
    }, []);

    return useMemo(
        () => Object.values(state).sort((a, b) => a.time - b.time),
        [state]
    );
}

export function useStateAtomReducedLog(log: ATOM_LOG) {
    return useMemo(
        () =>
            log.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {} as Record<string, ATOM_LOG_ITEM>),
        [log]
    );
}
