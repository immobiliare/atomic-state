import tap from 'tap';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React, { useReducer, useRef, useState } from 'react';
import {
    AtomicStateProvider,
    createStateAtom,
    useAtomValue,
    createDerivedAtom,
    useAtomSetState,
    useStateAtom,
} from '../src';

// this because DOM is shared between tests
tap.afterEach(() => cleanup());

const userAtom = createStateAtom({
    key: 'User',
    default: { name: 'Ken', surname: 'Shiro' },
});

const userFullNameAtom = createDerivedAtom({
    key: 'User/FullName',
    get({ get }) {
        return `${get(userAtom).name} ${get(userAtom).surname}`;
    },
});

function RenderCount(props) {
    const count = useRef(0);
    count.current++;

    return <div {...props}>{count.current}</div>;
}

function TestForm() {
    const setUser = useAtomSetState(userAtom);

    function handleNameChange(evt) {
        setUser((user) => ({ ...user, name: evt.target.value }));
    }

    function handleSurnameChange(evt) {
        setUser((user) => ({ ...user, surname: evt.target.value }));
    }

    return (
        <form>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" onChange={handleNameChange} />
            <label htmlFor="surname">Surname</label>
            <input id="surname" name="surname" onChange={handleSurnameChange} />
            <RenderCount data-testid="form-render-count" />
        </form>
    );
}

tap.test(
    '[StateAtom/RenderOptimizations] useAtomSetState does not subscribe to the atom updates',
    async (t) => {
        function UserProfile() {
            const name = useAtomValue(userFullNameAtom);

            return <div data-testid="user-profile">{name}</div>;
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

        const formRenderCount = getByTestId('form-render-count');

        t.same(
            formRenderCount.innerHTML.trim(),
            `1`,
            'The form has been rendered only once'
        );

        t.end();
    }
);

tap.test(
    '[StateAtom] State atom triggers updates only when the value changes',
    async (t) => {
        function UserProfile() {
            const fullName = useAtomValue(userFullNameAtom);

            return (
                <div data-testid="user-profile">
                    {fullName}
                    <RenderCount data-testid="user-profile-render-count" />
                </div>
            );
        }

        const { getByLabelText, getByTestId } = render(
            <AtomicStateProvider
                state={{ [userAtom.key]: { name: 'Ken', surname: 'Shiro' } }}
            >
                <TestForm />
                <UserProfile />
            </AtomicStateProvider>
        );

        const nameInput = getByLabelText('Name');

        fireEvent.change(nameInput, {
            target: {
                value: 'Ken',
            },
        });

        const formRenderCount = getByTestId('user-profile-render-count');

        t.same(
            formRenderCount.innerHTML.trim(),
            `1`,
            'The form has been rendered only once'
        );

        fireEvent.change(nameInput, {
            target: {
                value: 'Raoh',
            },
        });

        t.same(
            formRenderCount.innerHTML.trim(),
            `2`,
            'The form has been re-rendered after the value change'
        );

        t.end();
    }
);

tap.test(
    '[StateAtom] When deepEqualityCheck is enabled, the atom triggers the update only when the content changes',
    async (t) => {
        const descriptionFormAtom = createStateAtom({
            key: 'DescriptionForm',
            default: { description: 'Hello world!' },
            deepEqualityCheck: true,
        });

        function DescriptionForm() {
            const [, setForm] = useStateAtom(descriptionFormAtom);

            return (
                <form>
                    <label htmlFor="description">Description</label>
                    <input
                        id="description"
                        name="description"
                        onChange={(evt) =>
                            setForm((form) => ({
                                ...form,
                                description: evt.target.value,
                            }))
                        }
                    />
                    <RenderCount data-testid="form-render-count" />
                </form>
            );
        }

        const { getByLabelText, getByTestId } = render(
            <AtomicStateProvider>
                <DescriptionForm />
            </AtomicStateProvider>
        );

        const input = getByLabelText('Description');

        fireEvent.change(input, {
            target: {
                value: 'Hello world!',
            },
        });

        const formRenderCount = getByTestId('form-render-count');

        t.same(
            formRenderCount.innerHTML.trim(),
            `1`,
            'The form has been rendered only once'
        );

        fireEvent.change(input, {
            target: {
                value: 'Hello world! Sayonara!',
            },
        });

        t.same(
            formRenderCount.innerHTML.trim(),
            `2`,
            'The form has been re-rendered after the value change'
        );

        t.end();
    }
);
