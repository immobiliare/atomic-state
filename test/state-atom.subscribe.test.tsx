import tap from 'tap';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import {
    AtomsStateProvider,
    createDerivedAtom,
    createStateAtom,
    useAtom,
    useAtomSetState,
    useAtomValue,
    useStateAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test(
    '[StateAtom/subscribe] should be triggered only on first load',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 'foo',
        });

        let subscribeCalls = 0;

        const testAtom = createStateAtom({
            key: 'test',
            default: 'bar',
            subscribe(dispatch, { watch }) {
                subscribeCalls++;
                watch(sourceAtom, (state) => {
                    dispatch((curr) => state + curr);
                });
            },
        });

        function Test() {
            const setState = useAtomSetState(testAtom);

            useEffect(() => {
                setState('bar2');
            }, []);

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.equals(subscribeCalls, 1);

        t.end();
    }
);
tap.test(
    '[StateAtom/subscribe] watch should be triggered on first load',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 'foo',
        });

        const testAtom = createStateAtom({
            key: 'test',
            default: 'bar',
            subscribe(dispatch, { watch }) {
                watch(sourceAtom, (state) => {
                    dispatch((curr) => state + curr);
                });
            },
        });

        function Test() {
            const atom = useAtom(testAtom);

            tap.equal(atom.state, 'foobar');

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.end();
    }
);
tap.test(
    '[StateAtom/subscribe] watch should be triggered on every update',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 0,
        });

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            subscribe(dispatch, { watch }) {
                watch(sourceAtom, (state) => {
                    dispatch((curr) => curr + state);
                });
            },
        });

        function Test() {
            const setSourceState = useAtomSetState(sourceAtom);
            const subscribedState = useAtomValue(testAtom);

            return (
                <button
                    onClick={() => setSourceState((v) => v + 1)}
                    data-value={subscribedState}
                >
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

        tap.equal(button.getAttribute('data-value'), 'foo0');

        fireEvent.click(button);

        tap.equal(button.getAttribute('data-value'), 'foo01');

        fireEvent.click(button);

        tap.equal(button.getAttribute('data-value'), 'foo012');

        t.end();
    }
);
tap.test(
    '[StateAtom/subscribe] setState should overwrite the last dispatched value',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 0,
        });

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            subscribe(dispatch, { watch }) {
                watch(sourceAtom, (state) => {
                    dispatch((curr) => curr + state);
                });
            },
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            return (
                <button
                    onClick={() => setState('chocolate')}
                    data-value={state}
                >
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

        tap.equal(button.getAttribute('data-value'), 'foo0');

        fireEvent.click(button);

        tap.equal(button.getAttribute('data-value'), 'chocolate');

        t.end();
    }
);

tap.test(
    '[StateAtom/subscribe] should detect the circular references',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 0,
            subscribe(dispatch, { watch }) {
                watch(testAtom, () => {
                    dispatch((curr) => curr + 1);
                });
            },
        });

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            subscribe(dispatch, { watch }) {
                watch(sourceAtom, (state) => {
                    dispatch((curr) => curr + state);
                });
            },
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            return (
                <button
                    onClick={() => setState('chocolate')}
                    data-value={state}
                >
                    Click me
                </button>
            );
        }

        tap.throws(() => {
            render(
                <AtomsStateProvider>
                    <Test />
                </AtomsStateProvider>
            );
        }, new Error(`Detected circular reference from ${testAtom.key}`));

        t.end();
    }
);

tap.test(
    '[StateAtom/subscribe] should detect the circular references with derived atoms',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 0,
            subscribe(dispatch, { watch }) {
                watch(testAtom, () => {
                    dispatch((curr) => curr + 1);
                });
            },
        });

        const testAtom = createDerivedAtom({
            key: 'test',
            get(use) {
                use(sourceAtom);
            },
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            return <button data-value={state}>Click me</button>;
        }

        tap.throws(() => {
            render(
                <AtomsStateProvider>
                    <Test />
                </AtomsStateProvider>
            );
        }, new Error(`Detected circular reference from ${testAtom.key}`));

        t.end();
    }
);

tap.test(
    '[StateAtom/subscribe] should send a warning when the watch calls are nested',
    async (t) => {
        const sourceAtom = createStateAtom({
            key: 'source',
            default: 0,
        });
        const sourceAtom2 = createStateAtom({
            key: 'source2',
            default: 0,
        });

        const testAtom = createStateAtom({
            key: 'nested-watch',
            default: 'foo',
            subscribe(dispatch, { watch }) {
                watch(sourceAtom, () => {
                    watch(sourceAtom2, (state) => {
                        dispatch((curr) => curr + state);
                    });
                });
            },
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            return (
                <button
                    onClick={() => setState('chocolate')}
                    data-value={state}
                >
                    Click me
                </button>
            );
        }

        const warn = console.warn;
        const warnings = [];
        console.warn = (value: string) => warnings.push(value);

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        console.warn = warn;

        tap.deepEquals(warnings, [
            `Watch calls should not be nested. Check the subscribe function of ${testAtom.key}`,
        ]);

        t.end();
    }
);

tap.test(
    '[StateAtom/subscribe] should run the cleanup when the Provider is unmounted',
    async (t) => {
        let cleanupCalls = 0;

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            subscribe: () => {
                return () => {
                    cleanupCalls++;
                };
            },
        });

        function App() {
            const [mounted, setMounted] = useState(true);

            if (!mounted) return null;

            return (
                <>
                    <div onClick={() => setMounted(false)}>Click me</div>
                    <AtomsStateProvider>
                        <Test />
                    </AtomsStateProvider>
                </>
            );
        }

        function Test() {
            useAtom(testAtom);

            return null;
        }

        render(<App />);

        fireEvent.click(screen.getByText('Click me'));

        t.deepEqual(cleanupCalls, 1);

        t.end();
    }
);
