import tap from 'tap';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { StateAtomProvider, createStateAtom, useStateAtom } from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

const fakeLocalStorage = {
    storage: {},
    getItem(key: string) {
        return this.storage[key] || null;
    },
    setItem(key: string, value: string) {
        this.storage[key] = value;
    },
    reset() {
        this.storage = {};
    },
};
tap.afterEach(() => fakeLocalStorage.reset());

const cookiePolicyAtom = createStateAtom<boolean>({
    key: 'CookiePolicy/Accepted',
    default: () => {
        return (
            JSON.parse(fakeLocalStorage.getItem(cookiePolicyAtom.key)) || false
        );
    },
    setup(self, { effect, get }) {
        effect(() => {
            fakeLocalStorage.setItem(self.key, JSON.stringify(get(self)));
        }, [self]);
    },
});

function CookieBar() {
    const [policyAccepted, setIsPolicyAccepted] =
        useStateAtom(cookiePolicyAtom);

    if (policyAccepted) return null;

    return (
        <div onClick={() => setIsPolicyAccepted(true)} data-testid="cookiebar">
            Click here to accept the cookie policy
        </div>
    );
}

tap.test(
    '[StateAtom/effects] The atom effects are executed on startup',
    async (t) => {
        render(
            <StateAtomProvider>
                <CookieBar />
            </StateAtomProvider>
        );

        t.same(
            fakeLocalStorage.getItem(cookiePolicyAtom.key),
            'false',
            'The atom effects are executed on startup'
        );

        t.end();
    }
);

tap.test(
    '[StateAtom/effects] The atom effects are executed on state change',
    async (t) => {
        const { getByTestId } = render(
            <StateAtomProvider>
                <CookieBar />
            </StateAtomProvider>
        );

        fireEvent.click(getByTestId('cookiebar'));

        t.same(
            fakeLocalStorage.getItem(cookiePolicyAtom.key),
            'true',
            'The atom effects are executed on change'
        );

        t.end();
    }
);
