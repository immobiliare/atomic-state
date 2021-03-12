import tap from 'tap';
import { render, cleanup } from '@testing-library/react';
import {
    useAtom,
    AtomsStateProvider,
    createStateAtom,
    createDerivedAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

tap.test('[DerivedAtom] should load the intial value correctly', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: 'foo',
    });
    const derivedAtom = createDerivedAtom({
        key: 'derived',
        get(use) {
            return use(testAtom) + 'bar';
        },
    });

    function Test() {
        const atom = useAtom(derivedAtom);

        tap.equal(atom.state, 'foobar');

        return null;
    }

    render(
        <AtomsStateProvider>
            <Test />
        </AtomsStateProvider>
    );
    t.end();
});

tap.test('[DerivedAtom] should derive hydrated values correctly', async (t) => {
    const testAtom = createStateAtom({
        key: 'test',
        default: 'foo',
    });
    const derivedAtom = createDerivedAtom({
        key: 'derived',
        get(use) {
            return use(testAtom) + 'bar';
        },
    });

    function Test() {
        const atom = useAtom(derivedAtom);

        tap.equal(atom.state, 'chocolatebar');

        return null;
    }

    render(
        <AtomsStateProvider state={{ [testAtom.key]: 'chocolate' }}>
            <Test />
        </AtomsStateProvider>
    );
    t.end();
});

tap.test('[DerivedAtom] should trigger the effects on startup', async (t) => {
    let executed = 0;

    const testAtom = createStateAtom({
        key: 'test',
        default: 'foo',
    });

    const derivedAtom = createDerivedAtom({
        key: 'derived',
        get(use) {
            return use(testAtom) + 'bar';
        },
        effect() {
            executed++;
        },
    });

    function Test() {
        useAtom(derivedAtom);

        return null;
    }

    render(
        <AtomsStateProvider state={{ [testAtom.key]: 'chocolate' }}>
            <Test />
        </AtomsStateProvider>
    );

    t.equal(executed, 1);

    t.end();
});

tap.test('[DerivedAtom] should detect the circular references', async (t) => {
    const derivedAtom = createDerivedAtom({
        key: 'derived',
        get(use) {
            use(derivedAtom2);
        },
    });
    const derivedAtom2 = createDerivedAtom({
        key: 'derived2',
        get(use) {
            use(derivedAtom);
        },
    });

    function Test() {
        useAtom(derivedAtom);

        return null;
    }

    tap.throws(() => {
        render(
            <AtomsStateProvider>
                <Test />
            </AtomsStateProvider>
        );
    }, new Error(`Detected circular reference from ${derivedAtom.key}`));

    t.end();
});
