import tap from 'tap';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React, { useCallback, useEffect, useState } from 'react';
import {
    AtomsStateProvider,
    createStateAtom,
    useAtom,
    useAtomSetState,
    useStateAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test('[StateAtom/effect] should be triggered on first load', async (t) => {
    const effectCalls = [];

    const testAtom = createStateAtom({
        key: 'test',
        default: 'foo',
        effect: (state) => {
            effectCalls.push(state);
        },
    });

    function Test() {
        useAtom(testAtom);

        return null;
    }

    render(
        <AtomsStateProvider>
            <Test />
        </AtomsStateProvider>
    );

    t.deepEqual(effectCalls, ['foo']);

    t.end();
});
tap.test(
    '[StateAtom/effect] should be triggered on every update',
    async (t) => {
        const effectCalls = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            effect: (state) => {
                effectCalls.push(state);
            },
        });

        function Test() {
            const setState = useAtomSetState(testAtom);

            useEffect(() => {
                setState('chocolate');
            }, []);

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.deepEqual(effectCalls, ['foo', 'chocolate']);

        t.end();
    }
);
tap.test(
    '[StateAtom/effect] should run the cleanup before every update',
    async (t) => {
        const calls: ['effect' | 'cleanup', string][] = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            effect: (state) => {
                calls.push(['effect', state]);

                return () => {
                    calls.push(['cleanup', state]);
                };
            },
        });

        function Test() {
            const setState = useAtomSetState(testAtom);

            useEffect(() => {
                setState('chocolate');
            }, []);

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.deepEqual(calls, [
            ['effect', 'foo'],
            ['cleanup', 'foo'],
            ['effect', 'chocolate'],
        ]);

        t.end();
    }
);

tap.test(
    '[StateAtom/effect] should works with subseguent updates',
    async (t) => {
        const calls: ['effect' | 'cleanup', number][] = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 0,
            effect: (state) => {
                calls.push(['effect', state]);

                return () => {
                    calls.push(['cleanup', state]);
                };
            },
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

        await render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        t.deepEqual(calls, [
            ['effect', 0],
            ['cleanup', 0],
            ['effect', 1],
            ['cleanup', 1],
            ['effect', 2],
            ['cleanup', 2],
            ['effect', 3],
        ]);

        t.end();
    }
);

tap.test(
    "[StateAtom/effect] should skip effect when the state doesn't change",
    async (t) => {
        const calls: ['effect' | 'cleanup', number][] = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 0,
            effect: (state) => {
                calls.push(['effect', state]);

                return () => {
                    calls.push(['cleanup', state]);
                };
            },
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            const clickHandler = useCallback(() => {
                setState((v) => v);
            }, []);

            return (
                <button onClick={clickHandler} data-value={state}>
                    Click me
                </button>
            );
        }

        await render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        t.deepEqual(calls, [['effect', 0]]);

        t.end();
    }
);

tap.test(
    '[StateAtom/effect] should skip effect when the atom does deepEqual checks and the content is the same',
    async (t) => {
        const calls: ['effect' | 'cleanup', any][] = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: { value: 0 },
            deepEqualityCheck: true,
            effect: (state) => {
                calls.push(['effect', state]);

                return () => {
                    calls.push(['cleanup', state]);
                };
            },
        });

        function Test() {
            const [state, setState] = useStateAtom(testAtom);

            const clickHandler = useCallback(() => {
                setState({ value: 0 });
            }, []);

            return (
                <button onClick={clickHandler} data-value={state}>
                    Click me
                </button>
            );
        }

        await render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        t.deepEqual(calls, [['effect', { value: 0 }]]);

        t.end();
    }
);

tap.test(
    '[StateAtom/effect] should run the cleanup when the Provider is unmounted',
    async (t) => {
        const cleanupCalls: string[] = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            effect: (state) => {
                return () => {
                    cleanupCalls.push(state);
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

        t.deepEqual(cleanupCalls, ['foo']);

        t.end();
    }
);
