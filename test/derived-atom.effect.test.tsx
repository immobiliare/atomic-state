import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import tap from 'tap';
import {
    AtomsStateProvider,
    createDerivedAtom,
    createStateAtom,
    useAtom,
    useAtomSetState,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test(
    '[DerivedAtom/effect] should be triggered on first load',
    async (t) => {
        const effectCalls = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
        });

        const derivedAtom = createDerivedAtom({
            key: 'derived',
            get(use) {
                return use(testAtom) + 'bar';
            },
            effect: (state) => {
                effectCalls.push(state);
            },
        });

        function Test() {
            useAtom(derivedAtom);

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.deepEqual(effectCalls, ['foobar']);

        t.end();
    }
);
tap.test(
    '[DerivedAtom/effect] should be triggered on every update',
    async (t) => {
        const effectCalls = [];

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
        });

        const derivedAtom = createDerivedAtom({
            key: 'derived',
            get(use) {
                return use(testAtom) + 'bar';
            },
            effect: (state) => {
                effectCalls.push(state);
            },
        });

        function Test() {
            const setState = useAtomSetState(testAtom);

            useEffect(() => {
                setState('chocolate');
            }, []);

            useAtom(derivedAtom);

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.deepEqual(effectCalls, ['foobar', 'chocolatebar']);

        t.end();
    }
);
tap.test(
    '[DerivedAtom/effect] should run the cleanup before every update',
    async (t) => {
        const effectCalls: [number, string][] = [];
        const cleanupCalls: [number, string][] = [];

        let count = 0;

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
        });

        const derivedAtom = createDerivedAtom({
            key: 'derived',
            get(use) {
                return use(testAtom) + 'bar';
            },
            effect: (state) => {
                effectCalls.push([++count, state]);

                return () => {
                    cleanupCalls.push([++count, state]);
                };
            },
        });

        function Test() {
            const setState = useAtomSetState(testAtom);

            useEffect(() => {
                setState('chocolate');
            }, []);

            useAtom(derivedAtom);

            return null;
        }

        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );

        t.deepEqual(effectCalls, [
            [1, 'foobar'],
            [3, 'chocolatebar'],
        ]);
        t.deepEqual(cleanupCalls, [[2, 'foobar']]);

        t.end();
    }
);
