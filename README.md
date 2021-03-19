# state-atom

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)

> A minimal state management library for React inspired by [Recoil.js](https://recoiljs.org/)

The main goal of StateAtom is to make local application state management lightweight and easy.

Made to be used in combo with data management library like [react-query](https://react-query-v2.tanstack.com/docs/overview).

## Table of Contents

-   [Documentation](#documentation)
    -   [Installation](#installation)
    -   [Usage](#usage)
    -   [What is an atom?](#what-is-an-atom)
    -   [Deriving state](#deriving-state)
    -   [Atom Effects](#atom-effects)
    -   [Atom Subscribe](#atom-subscribe)
    -   [Server Side Rendering](#server-side-rendering)
    -   [DevTools](#devtools)
-   [Changelog](#changelog)
-   [Contributing](#contributing)
-   [Issues](#issues)

## Documentation

### Installation

```
yarn add @immobiliarelabs/state-atom
```

### Usage

The first thing you have to do is to setup the `AtomsStateProvider`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom';

import { AtomsStateProvider } from '@immobiliarelabs/state-atom';

import App from './App';

const rootElement = document.getElementById('root');
ReactDOM.render(
    <AtomsStateProvider>
        <App />
    </AtomsStateProvider>,
    rootElement
);
```

This makes your atoms available to the rest of your app.

It could be used also to provide an initial state for you atoms or updating it.

### What is an atom?

An atom represents a piece of state. Atoms can be read and written to from any component. Components that read the value of an atom are implicitly subscribed to that atom, so any atom updates will result in a re-render of all components subscribed to that atom:

```tsx
import { createStateAtom, useStateAtom } from '@immobiliarelabs/state-atom';

const textAtom = createStateAtom({
    key: `Text`, // unique ID
    default: '', // default value (aka initial value)
});

function TextInput() {
    // useStateAtom has the same behavior of useState
    const [text, setText] = useStateAtom(textAtom);

    const onChange = (event) => {
        setText(event.target.value);
    };

    return (
        <div>
            <input type="text" value={text} onChange={onChange} />
            <br />
            Echo: {text}
        </div>
    );
}
```

### Deriving state

Derived atoms can be used to derive information from other atoms. They cache their output and triggers an update only when their output changes.

Conceptually, they are very similar to formulas in spreadsheets, and can't be underestimated. They help in reducing the amount of state you have to store and are highly optimized. Use them wherever possible.

```tsx
import { createDerivedAtom, useAtomValue } from '@immobiliarelabs/state-atom';
import { textAtom } from './TextInput';

const textFilledAtom = createDerivedAtom({
    key: `TextFilled`, // unique ID
    get(use) {
        return use(textAtom) !== '';
    },
});

function TextInputFilledStatus() {
    // useAtomValue reads the state from an atom
    const filled = useAtomValue(textFilledAtom);

    return <span>{filled ? 'Filled' : 'Empty'}</span>;
}
```

### Atom Effects

Atom effects are works in a similar way of React [useEffect](https://reactjs.org/docs/hooks-effect.html).

They have the same [cleanup](https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup) api and are executed only on the client side.

```tsx
import { createStateAtom, useStateAtom } from '@immobiliarelabs/state-atom';

const textAtom = createStateAtom({
    key: `Text`,
    default: null,
    /**
       `state` represents the current state of the atom
       `setState` is used to update the atom state
    */
    effect(state, setState) {
        // This would happen only during Client Side rendering
        if (state === null) {
            setState(localStorage.getItem('LastEditedText') || '');
        } else {
            localStorage.setItem('LastEditedText', state);
        }
    },
});
```

Under the hood the atom effects are managed through React useEffect, so they will follow the same rules for the execution timing and will be triggered when [act](https://reactjs.org/docs/testing-recipes.html#act) is used.

### Atom Subscribe

An atom could be interested on the other atoms update.

Most of the time a derived atom should be the best choice but sometimes you need to do a stateful update.
In that case the subscribe should be your choice, because with it you can centralize these updates and keep them in control.

```tsx
import { createStateAtom, useStateAtom } from '@immobiliarelabs/state-atom';
import { sidebarOpenAtom } from './other-atoms';

const selectedItemAtom = createStateAtom({
    key: `SelectedItem`,
    default: null,
    subscribe(setState, { watch }) {
        /**
            `watch` lets you perform side effects when an atom changes
        */
        watch(sidebarOpenAtom, (open) => {
            // setState` is used to update the selectedItemAtom state
            if (!open) setState(null);
        });
    },
});
```

### Server Side Rendering

It is possible to hydrate the atoms state by passing a state object to `AtomsStateProvider`

```tsx
import { createStateAtom, AtomsStateProvider } from '@immobiliarelabs/state-atom';
import { myFormStateAtom } from './atoms';

function MyApp({ formInitialState }) {
    /**
     * Every update of this value will trigger a `setState` on the related atoms
     *
     * So be careful with the updates frequency
     */
    const atomsState = useMemo(
        () => ({
            [myFormStateAtom.key]: formInitialState,
        }),
        [formInitialState]
    );

    return (
        <AtomsStateProvider state={atomsState}>
            <AppCore />
        </AtomsStateProvider>
    );
}
```

### DevTools

We have a DevTools extension for [Chrome](https://chrome.google.com/webstore/detail/state-atom-devtools/mhdnjcangakajcinldiniomklbmmjcka) and [Firefox](https://addons.mozilla.org/it/firefox/addon/state-atom-devtools/)

For more info take a look into the [DevTools docs](./devtools/README.md)

## Changelog

See [changelog](./CHANGELOG.md).

## Contributing

See [contributing](./CONTRIBUTING.md).

## Issues

You found a bug or need a new feature? Please <a href="https://github.com/immobiliare/state-atom/issues/new" target="_blank">open an issue.</a>
