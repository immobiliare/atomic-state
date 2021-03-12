import tap from 'tap';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import {
    useStateAtom,
    AtomsStateProvider,
    createStateAtom,
    createDerivedAtom,
    useAtomSetState,
} from '../src';
import { useCallback } from 'react';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test('[useAtomSetState] should update the atom value', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: false,
    });

    function Test() {
        const setState = useAtomSetState(testAtom);

        return <button onClick={() => setState(true)}>Click me</button>;
    }

    function Listener() {
        const [state] = useStateAtom(testAtom);

        return <div data-value={state.toString()}>Listener</div>;
    }

    await render(
        <AtomsStateProvider>
            <Test />
            <Listener />
        </AtomsStateProvider>
    );

    const button = screen.getByText('Click me');
    const listener = screen.getByText('Listener');

    tap.equal(listener.getAttribute('data-value'), 'false');

    fireEvent.click(button);

    tap.equal(listener.getAttribute('data-value'), 'true');

    t.end();
});

tap.test(
    "[useAtomSetState] shouldn't subscribe to the atom updates",
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: false,
        });

        let count = 0;

        function Test() {
            const setState = useAtomSetState(testAtom);

            count++;

            return <button onClick={() => setState(true)}>Click me</button>;
        }
        await render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        tap.equal(count, 1);

        fireEvent.click(button);

        tap.equal(count, 1);

        t.end();
    }
);

tap.test('[useAtomSetState] should support update callbacks', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: 0,
    });

    function Test() {
        const setState = useAtomSetState(testAtom);

        const clickHandler = useCallback(() => {
            setState((v) => v + 1);
        }, []);

        return <button onClick={clickHandler}>Click me</button>;
    }

    function Listener() {
        const [state] = useStateAtom(testAtom);

        return <div data-value={state}>Listener</div>;
    }

    await render(
        <AtomsStateProvider>
            <Test />
            <Listener />
        </AtomsStateProvider>
    );

    const button = screen.getByText('Click me');
    const listener = screen.getByText('Listener');

    tap.equal(listener.getAttribute('data-value'), '0');

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    tap.equal(listener.getAttribute('data-value'), '3');
    t.end();
});
