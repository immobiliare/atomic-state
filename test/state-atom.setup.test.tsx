import tap from 'tap';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import {
    AtomicStateProvider,
    createStateAtom,
    useAtom,
    useAtomValue,
    useStateAtom,
    createDerivedAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

const nameAtom = createStateAtom({
    key: 'TestForm/Name',
    default: '',
});

const surnameAtom = createStateAtom({
    key: 'TestForm/Surname',
    default: '',
});

const formTouchedAtom = createStateAtom({
    key: 'TestForm/Touched',
    default: false,
    setup(self, { watch, set, get }) {
        watch(() => {
            if (!get(self)) {
                const touched = Boolean(get(nameAtom) || get(surnameAtom));

                set(self, touched);
            }
        }, [nameAtom, surnameAtom]);
    },
});

function TestForm() {
    const [name, setName] = useStateAtom(nameAtom);
    const [surname, setSurname] = useStateAtom(surnameAtom);

    return (
        <form>
            <label htmlFor="name">Name</label>
            <input
                id="name"
                name="name"
                onChange={(evt) => setName(evt.target.value)}
                value={name}
            />
            <label htmlFor="surname">Surname</label>
            <input
                id="surname"
                name="surname"
                onChange={(evt) => setSurname(evt.target.value)}
                value={surname}
            />
        </form>
    );
}

function FormTouchedDisclamer() {
    const touched = useAtomValue(formTouchedAtom);

    return touched ? <div>The form has been touched</div> : null;
}

tap.test(
    '[StateAtom/setup] Watch callback should be triggered during setup',
    async (t) => {
        const { queryByText } = render(
            <AtomicStateProvider state={{ [nameAtom.key]: 'Guido' }}>
                <TestForm />
                <FormTouchedDisclamer />
            </AtomicStateProvider>
        );

        t.true(
            Boolean(queryByText('The form has been touched')),
            'The watch callback has been called during setup'
        );

        t.end();
    }
);

tap.test(
    '[StateAtom/setup] Watch callback should be triggered when the target atom is updated',
    async (t) => {
        const { queryByText, getByLabelText } = render(
            <AtomicStateProvider>
                <TestForm />
                <FormTouchedDisclamer />
            </AtomicStateProvider>
        );

        t.false(
            Boolean(queryByText('The form has been touched')),
            'The default state is false'
        );

        const input = getByLabelText('Name');

        fireEvent.change(input, {
            target: {
                value: 'Guido',
            },
        });

        t.true(
            Boolean(queryByText('The form has been touched')),
            'The watch callback has been called after the nameAtom update'
        );

        t.end();
    }
);

tap.test(
    '[StateAtom/setup] should detect the circular references',
    async (t) => {
        const strangeCountAAtom = createStateAtom({
            key: 'StrangeCountA',
            default: 0,
            setup(self, { watch, set }) {
                watch(() => {
                    set(self, (curr) => curr + 1);
                }, [strangeCountBAtom]);
            },
        });

        const strangeCountBAtom = createStateAtom({
            key: 'StrangeCountB',
            default: 0,
            setup(self, { watch, set }) {
                watch(() => {
                    set(self, (curr) => curr + 1);
                }, [strangeCountAAtom]);
            },
        });

        function CicurlarReferenceComponent() {
            useAtomValue(strangeCountAAtom);

            return null;
        }

        tap.throws(() => {
            render(
                <AtomicStateProvider>
                    <CicurlarReferenceComponent />
                </AtomicStateProvider>
            );
        }, new Error(`Detected circular reference from ${strangeCountAAtom.key}`));

        t.end();
    }
);

tap.test(
    '[StateAtom/setup] should detect the circular references with derived atoms',
    async (t) => {
        const strangeCountAAtom = createStateAtom({
            key: 'StrangeCountA',
            default: 0,
            setup(self, { watch, set }) {
                watch(() => {
                    set(self, (curr) => curr + 1);
                }, [strangeCountBAtom]);
            },
        });

        const strangeCountBAtom = createDerivedAtom({
            key: 'StrangeCountB',
            get({ get }) {
                return get(strangeCountAAtom);
            },
        });

        function CicurlarReference2Component() {
            useAtomValue(strangeCountAAtom);

            return null;
        }

        tap.throws(() => {
            render(
                <AtomicStateProvider>
                    <CicurlarReference2Component />
                </AtomicStateProvider>
            );
        }, new Error(`Detected circular reference from ${strangeCountAAtom.key}`));

        t.end();
    }
);

tap.test(
    '[StateAtom/setup] should send a warning when the watch calls are nested',
    async (t) => {
        const nestedWatchAtom = createStateAtom({
            key: 'NestedWatch',
            default: null,
            setup(_, { watch }) {
                watch(() => {
                    watch(() => {}, []);
                }, []);
            },
        });

        function NestedWatchComponent() {
            useAtomValue(nestedWatchAtom);

            return null;
        }

        const warn = console.warn;
        const warnings = [];
        console.warn = (value: string) => warnings.push(value);

        render(
            <AtomicStateProvider>
                <NestedWatchComponent />
            </AtomicStateProvider>
        );

        console.warn = warn;

        tap.deepEquals(warnings, [
            `Watch calls should not be nested. Check the setup function of ${nestedWatchAtom.key}`,
        ]);

        t.end();
    }
);

tap.test(
    '[StateAtom/setup] should run the cleanup when the Provider is unmounted',
    async (t) => {
        let cleanupCalls = 0;

        const testAtom = createStateAtom({
            key: 'test',
            default: 'foo',
            setup: (_, { watch, effect }) => {
                watch(() => {
                    return () => {
                        cleanupCalls++;
                    };
                }, []);

                effect(() => {
                    return () => {
                        cleanupCalls++;
                    };
                }, []);

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
                    <AtomicStateProvider>
                        <Test />
                    </AtomicStateProvider>
                </>
            );
        }

        function Test() {
            useAtom(testAtom);

            return null;
        }

        render(<App />);

        fireEvent.click(screen.getByText('Click me'));

        t.deepEqual(cleanupCalls, 3);

        t.end();
    }
);
