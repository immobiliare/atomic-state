import tap from 'tap';
import { render, cleanup } from '@testing-library/react';
import { useAtom, AtomsStateProvider, createStateAtom } from '../src';
import { useEffect, useState } from 'react';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test(
    '[StateAtom] should be initalized with the default value',
    async (t) => {
        const testAtom = createStateAtom({
            key: 'test',
            default: false,
        });

        function Test() {
            const atom = useAtom(testAtom);

            tap.equal(atom.state, false);

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

tap.test('[StateAtom] should prefer the hydrated value', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: false,
    });

    function Test() {
        const atom = useAtom(testAtom);

        tap.equal(atom.state, true);

        return null;
    }

    render(
        <AtomsStateProvider state={{ [testAtom.key]: true }}>
            <Test />
        </AtomsStateProvider>
    );
    t.end();
});

tap.test('[StateAtom] should trigger the effects on startup', async (t) => {
    let executed = 0;
    const testAtom = createStateAtom({
        key: 'test',
        default: false,
        effect() {
            executed++;
        },
    });

    function Test() {
        useAtom(testAtom);

        return null;
    }

    render(
        <AtomsStateProvider state={{ [testAtom.key]: true }}>
            <Test />
        </AtomsStateProvider>
    );

    t.equal(executed, 1);

    t.end();
});

tap.test(
    '[StateAtom] should init the atom with the last provided state',
    async (t) => {
        let atomValue = null;

        const testAtom = createStateAtom({
            key: 'test',
            default: false,
        });

        function Test() {
            const atom = useAtom(testAtom);

            atomValue = atom.state;

            return null;
        }

        function App() {
            const [active, setActive] = useState(false);
            const [visible, setVisible] = useState(false);

            useEffect(() => {
                setActive(true);
            }, []);

            useEffect(() => {
                setVisible(active);
            }, [active]);

            return (
                <AtomsStateProvider state={{ [testAtom.key]: active }}>
                    {visible && <Test />}
                </AtomsStateProvider>
            );
        }

        render(<App />);

        t.equal(atomValue, true);

        t.end();
    }
);
