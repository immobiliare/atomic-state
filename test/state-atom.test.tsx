import tap from 'tap';
import { cleanup, render, fireEvent } from '@testing-library/react';
import React, { useReducer, useState } from 'react';
import {
    AtomicStateProvider,
    createStateAtom,
    useAtomValue,
    useStateAtom,
    createDerivedAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

const nameAtom = createStateAtom({
    key: 'User/Name',
    default: '',
});

const surnameAtom = createStateAtom({
    key: 'User/Surname',
    default: '',
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

tap.test(
    '[StateAtom] State updates should be shared between componets',
    async (t) => {
        function UserProfile() {
            const name = useAtomValue(nameAtom);
            const surname = useAtomValue(surnameAtom);

            return (
                <div data-testid="user-profile">
                    {name} {surname}
                </div>
            );
        }

        const { getByLabelText, getByTestId } = render(
            <AtomicStateProvider>
                <TestForm />
                <UserProfile />
            </AtomicStateProvider>
        );

        const nameInput = getByLabelText('Name');
        const surnameInput = getByLabelText('Surname');

        fireEvent.change(nameInput, {
            target: {
                value: 'Cristina',
            },
        });

        fireEvent.change(surnameInput, {
            target: {
                value: `D'Avena`,
            },
        });

        const userProfile = getByTestId('user-profile');

        t.same(
            userProfile.innerHTML.trim(),
            `Cristina D'Avena`,
            'The UserProfile component has been updated'
        );

        t.end();
    }
);

tap.test('[StateAtom] Initial State is loaded inside atoms', async (t) => {
    function UserProfile() {
        const name = useAtomValue(nameAtom);
        const surname = useAtomValue(surnameAtom);

        return (
            <div data-testid="user-profile">
                {name} {surname}
            </div>
        );
    }

    const { getByTestId } = render(
        <AtomicStateProvider
            state={{ [nameAtom.key]: 'Ken', [surnameAtom.key]: 'Shiro' }}
        >
            <UserProfile />
        </AtomicStateProvider>
    );

    const userProfile = getByTestId('user-profile');

    t.same(
        userProfile.innerHTML.trim(),
        `Ken Shiro`,
        'Initial State is loaded inside atoms'
    );

    t.end();
});

const userFullNameAtom = createDerivedAtom({
    key: 'User/FullName',
    get({ get }) {
        return `${get(nameAtom)} ${get(surnameAtom)}`;
    },
});

tap.test('[StateAtom] Derived atom should be updated on change', async (t) => {
    function UserProfile() {
        const fullName = useAtomValue(userFullNameAtom);

        return <div data-testid="user-profile">{fullName}</div>;
    }

    const { getByLabelText, getByTestId } = render(
        <AtomicStateProvider
            state={{ [nameAtom.key]: 'Ken', [surnameAtom.key]: 'Shiro' }}
        >
            <TestForm />
            <UserProfile />
        </AtomicStateProvider>
    );

    const userProfile = getByTestId('user-profile');

    t.same(
        userProfile.innerHTML.trim(),
        `Ken Shiro`,
        'The UserProfile loads the inital state'
    );

    const nameInput = getByLabelText('Name');
    const surnameInput = getByLabelText('Surname');

    fireEvent.change(nameInput, {
        target: {
            value: 'Cristina',
        },
    });

    fireEvent.change(surnameInput, {
        target: {
            value: `D'Avena`,
        },
    });

    t.same(
        userProfile.innerHTML.trim(),
        `Cristina D'Avena`,
        'The UserProfile component has been updated'
    );

    t.end();
});

tap.test(
    '[StateAtom] The state change updates the referenced atoms',
    async (t) => {
        function UserProfile() {
            const fullName = useAtomValue(userFullNameAtom);

            return <div data-testid="user-profile">{fullName}</div>;
        }

        function App() {
            const [name, setName] = useState('Ken');
            const [surname, setSurname] = useState('Shiro');

            return (
                <AtomicStateProvider
                    state={{ [nameAtom.key]: name, [surnameAtom.key]: surname }}
                >
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
                    <UserProfile />
                </AtomicStateProvider>
            );
        }

        const { getByLabelText, getByTestId } = render(<App />);

        const userProfile = getByTestId('user-profile');

        t.same(
            userProfile.innerHTML.trim(),
            `Ken Shiro`,
            'The UserProfile loads the inital state'
        );

        const nameInput = getByLabelText('Name');
        const surnameInput = getByLabelText('Surname');

        fireEvent.change(nameInput, {
            target: {
                value: 'Cristina',
            },
        });

        fireEvent.change(surnameInput, {
            target: {
                value: `D'Avena`,
            },
        });

        t.same(
            userProfile.innerHTML.trim(),
            `Cristina D'Avena`,
            'The UserProfile component has been updated'
        );

        t.end();
    }
);

tap.test('[StateAtom] The inital state is updated by reference', async (t) => {
    function UserProfile() {
        const fullName = useAtomValue(userFullNameAtom);

        return <div data-testid="user-profile">{fullName}</div>;
    }

    function App() {
        const [, forceUpdate] = useReducer((s) => !s, false);

        return (
            <AtomicStateProvider
                state={{ [nameAtom.key]: 'Ken', [surnameAtom.key]: 'Shiro' }}
            >
                <TestForm />
                <UserProfile />
                <button onClick={forceUpdate}>Refresh</button>
            </AtomicStateProvider>
        );
    }

    const { getByLabelText, getByTestId, getByText } = render(<App />);

    const userProfile = getByTestId('user-profile');

    t.same(
        userProfile.innerHTML.trim(),
        `Ken Shiro`,
        'The UserProfile loads the inital state'
    );

    const nameInput = getByLabelText('Name');
    const surnameInput = getByLabelText('Surname');

    fireEvent.change(nameInput, {
        target: {
            value: 'Cristina',
        },
    });

    fireEvent.change(surnameInput, {
        target: {
            value: `D'Avena`,
        },
    });

    t.same(
        userProfile.innerHTML.trim(),
        `Cristina D'Avena`,
        'The UserProfile component has been updated'
    );

    fireEvent.click(getByText('Refresh'));

    t.same(
        userProfile.innerHTML.trim(),
        `Ken Shiro`,
        'The atoms are been resetted'
    );

    t.end();
});

const userAtom = createDerivedAtom({
    key: 'User',
    get({ get }) {
        return {
            name: get(nameAtom),
            surname: get(surnameAtom),
        };
    },
    set(value: { name: string; surname: string }, { set }) {
        set(nameAtom, value.name);
        set(surnameAtom, value.surname);
    },
});

tap.test('[StateAtom] The atom state is frozen', async (t) => {
    function UserProfile() {
        const user = useAtomValue(userAtom);

        try {
            user.name = 'Raoh';
        } catch (err) {}

        return (
            <div data-testid="user-profile">
                {user.name} {user.surname}
            </div>
        );
    }

    const { getByTestId } = render(
        <AtomicStateProvider
            state={{ [nameAtom.key]: 'Ken', [surnameAtom.key]: 'Shiro' }}
        >
            <UserProfile />
        </AtomicStateProvider>
    );

    const userProfile = getByTestId('user-profile');

    t.same(
        userProfile.innerHTML.trim(),
        `Ken Shiro`,
        'The user name cannot be mutated'
    );

    t.end();
});

//TODO Derived atoms set
//TODO Set another atom thorugh API
