function serialize(state: any) {
    if (!state) return state;

    return JSON.parse(JSON.stringify(state));
}

export function sendMessageToDevTools(
    key: string,
    type: 'NEW_ATOM' | 'UPDATE_ATOM',
    value: any
) {
    if (typeof window === 'undefined') return;

    window.postMessage(
        {
            from: 'state-atom',
            type,
            key,
            value: serialize(value),
        },
        '*'
    );
}
