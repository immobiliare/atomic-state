/* istanbul ignore file */
import type { StateAtom } from '.';

function getAtomState(atom: StateAtom<any>) {
    if (!atom.state) return atom.state;

    return JSON.parse(JSON.stringify(atom.state));
}

export function debugAtom(key: string, atom: StateAtom<any>) {
    postMessage(
        {
            from: 'state-atom',
            type: 'NEW_ATOM',
            key,
            value: getAtomState(atom),
        },
        '*'
    );

    atom.add(() => {
        postMessage(
            {
                from: 'state-atom',
                type: 'UPDATE_ATOM',
                key,
                value: getAtomState(atom),
            },
            '*'
        );
    });
}
