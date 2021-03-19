import tap from 'tap';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import {
    useStateAtom,
    AtomsStateProvider,
    createStateAtom,
    createDerivedAtom,
    useAtomValue,
} from '../src';
import { useCallback, useState } from 'react';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test(
    '[useStateAtom] should update the subscribed components on change',
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: false,
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            return (
                <button
                    onClick={() => setState(true)}
                    data-value={state.toString()}
                >
                    Click me
                </button>
            );
        }

        function Listener() {
            const state = useAtomValue(testAtom);

            return <div data-value={state.toString()}>Listener</div>;
        }

        render(
            <AtomsStateProvider>
                <Test />
                <Listener />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');
        const listener = screen.getByText('Listener');

        tap.equal(button.getAttribute('data-value'), 'false');
        tap.equal(listener.getAttribute('data-value'), 'false');

        fireEvent.click(button);

        tap.equal(button.getAttribute('data-value'), 'true');
        tap.equal(listener.getAttribute('data-value'), 'true');

        t.end();
    }
);

tap.test('[useStateAtom] should update the derived atoms', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: 'foo',
    });

    const derivedAtom = createDerivedAtom({
        key: 'derived',
        get(use) {
            return use(testAtom) + '-bar';
        },
    });

    function Test() {
        const [state, setState] = useStateAtom(testAtom);

        return (
            <button
                onClick={() => setState('chocolate')}
                data-value={state.toString()}
            >
                Click me
            </button>
        );
    }

    function Listener() {
        const state = useAtomValue(derivedAtom);

        return <div data-value={state.toString()}>Listener</div>;
    }

    render(
        <AtomsStateProvider>
            <Test />
            <Listener />
        </AtomsStateProvider>
    );

    const button = screen.getByText('Click me');
    const listener = screen.getByText('Listener');

    tap.equal(button.getAttribute('data-value'), 'foo');
    tap.equal(listener.getAttribute('data-value'), 'foo-bar');

    fireEvent.click(button);

    tap.equal(button.getAttribute('data-value'), 'chocolate');
    tap.equal(listener.getAttribute('data-value'), 'chocolate-bar');

    t.end();
});

tap.test('[useStateAtom] should support update callbacks', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: 0,
    });

    function Test() {
        const [state, setState] = useStateAtom(testAtom);

        const clickHandler = useCallback(() => {
            setState((v) => v + 1);
        }, []);

        return (
            <button onClick={clickHandler} data-value={state}>
                Click me
            </button>
        );
    }

    render(
        <AtomsStateProvider>
            <Test />
        </AtomsStateProvider>
    );

    const button = screen.getByText('Click me');

    tap.equal(button.getAttribute('data-value'), '0');

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    tap.equal(button.getAttribute('data-value'), '3');

    t.end();
});

tap.test(
    "[useStateAtom] should skip render when the state doesn't change",
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: 0,
        });

        let renders = 0;

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            renders++;

            const clickHandler = useCallback(() => {
                setState((v) => v);
            }, []);

            return (
                <button onClick={clickHandler} data-value={state}>
                    Click me
                </button>
            );
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        tap.equal(renders, 1);

        t.end();
    }
);

tap.test(
    '[StateAtom/effect] should skip the render when the atom does deepEqual checks and the content is the same',
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: { value: 0 },
            deepEqualityCheck: true,
        });

        let renders = 0;

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            const clickHandler = useCallback(() => {
                setState({ value: 0 });
            }, []);

            renders++;

            return (
                <button onClick={clickHandler} data-value={state}>
                    Click me
                </button>
            );
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        tap.equal(renders, 1);

        t.end();
    }
);

tap.test(
    '[StateAtom/effect] should render the root state updates',
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: { value: 0 },
        });

        function Test() {
            const [state] = useStateAtom(testAtom);

            return <button data-value={state.value}>Current state</button>;
        }

        function App() {
            const [state, setState] = useState({ value: 1 });

            const clickHandler = () => {
                setState({ value: state.value + 1 });
            };

            return (
                <>
                    <button onClick={clickHandler} data-value={state}>
                        Click me
                    </button>
                    <AtomsStateProvider state={{ [testAtom.key]: state }}>
                        <Test />
                    </AtomsStateProvider>
                </>
            );
        }

        render(<App />);

        const button = screen.getByText('Click me');
        const state = screen.getByText('Current state');

        tap.equal(state.getAttribute('data-value'), '1');

        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        tap.equal(state.getAttribute('data-value'), '4');

        t.end();
    }
);
