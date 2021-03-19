import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import tap from 'tap';
import {
    createStateAtom,
    useStateAtom,
    useAtomValue,
    useAtomSetState,
    useAtomSelector,
    AtomsStateProvider,
    createDerivedAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test(
    '[useAtomSelector] should re-render only when the selected key changes',
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: {
                foo: 'bar',
                chocolate: 'shake',
            },
        });

        const renderCalls = [];

        function Test() {
            const setState = useAtomSetState(testAtom);
            const state = useAtomSelector(testAtom, 'foo');

            useEffect(() => {
                setState((state) => ({
                    ...state,
                    newProp: 'value',
                }));
            }, []);

            renderCalls.push(state);

            return (
                <button
                    onClick={() =>
                        setState((state) => ({
                            ...state,
                            foo: 'after-click',
                        }))
                    }
                    data-value={state.toString()}
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

        tap.equal(button.getAttribute('data-value'), 'bar');

        fireEvent.click(button);

        tap.equal(button.getAttribute('data-value'), 'after-click');

        /**
         * The update inside the useEffect shouldn't trigger a re-render
         */
        tap.deepEqual(renderCalls, ['bar', 'after-click']);

        t.end();
    }
);

tap.test('[useAtomSelector] should work with deep paths', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: {
            foo: 'bar',
            chocolate: {
                milk: 'shake',
            },
        },
    });

    const renderCalls = [];

    function Test() {
        const setState = useAtomSetState(testAtom);
        const state = useAtomSelector(testAtom, 'chocolate.milk');

        renderCalls.push(state);

        return (
            <button
                onClick={() =>
                    setState((state) => ({
                        ...state,
                        newProp: 'value',
                    }))
                }
                data-value={state.toString()}
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

    tap.equal(button.getAttribute('data-value'), 'shake');

    t.end();
});

tap.test(
    '[useAtomSelector] should return null with nonexistent paths',
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: {
                foo: 'bar',
                chocolate: {
                    milk: 'shake',
                },
            },
        });

        function Test() {
            const state: null = useAtomSelector(testAtom, 'non.existent.path');

            return <button data-value={state + ''}>Click me</button>;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        const button = screen.getByText('Click me');

        tap.equal(button.getAttribute('data-value'), 'null');

        t.end();
    }
);

tap.test('[useAtomSelector] should also work with derived atoms', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: {
            foo: 'bar',
            chocolate: {
                milk: 'shake',
            },
        },
    });
    const derivedAtom = createDerivedAtom({
        key: 'derived',
        get(use) {
            return use(testAtom);
        },
    });

    const renderCalls = [];

    function Test() {
        const setState = useAtomSetState(testAtom);
        const state = useAtomSelector(derivedAtom, 'foo');

        useEffect(() => {
            setState((state) => ({
                ...state,
                newProp: 'value',
            }));
        }, []);

        renderCalls.push(state);

        return (
            <button
                onClick={() =>
                    setState((state) => ({
                        ...state,
                        foo: 'after-click',
                    }))
                }
                data-value={state.toString()}
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

    tap.equal(button.getAttribute('data-value'), 'bar');

    fireEvent.click(button);

    tap.equal(button.getAttribute('data-value'), 'after-click');

    /**
     * The update inside the useEffect shouldn't trigger a re-render
     */
    tap.deepEqual(renderCalls, ['bar', 'after-click']);

    t.end();
});
