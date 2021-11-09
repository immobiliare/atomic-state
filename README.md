<p align="center">
    <img src="logo.svg" alt="AtomicState" width="903" height="177" />
</p>

![CI](https://github.com/immobiliare/atomic-state/workflows/CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
![bundlephobia](https://badgen.net/bundlephobia/minzip/@immobiliarelabs/atomic-state)

> A decentralized state management library for React

Sometimes when you have to share some state between components you also add some complexity to it (lifting the state up, adding a context or dirtying your global state manager).

AtomicState brings to you a way to **share state** in a **simple** and **decentralized** way **without burdening your app size and complexity**.

## Features Highlights

-   💡 **Simple & Reactish**: Use AtomicState without learning new concepts because it works like the React API that you already know
-   💡 **Small footprint**: AtomicState wieghts only 1.5Kb (gzip) on your production bundle
-   💡 **SSR ready**: Server Side Rendering is a first-class citizen for AtomicState and it works like a breeze
-   💡 **Integrated DevTools**: Install the official devtools from the Chrome Web Store and take a look in your atoms!
-   💡 **Decentralized**: The state atoms can be loaded only when they are needed enabling you to do lazy load without troubles.

## Table of contents

-   [Quick start](#quick-start)
-   [Setup](#setup)
-   [What is an atom?](#what-is-an-atom)
-   [Deriving state](#deriving-state)
-   [Effects](#effects)
-   [Server Side Rendering](#server-side-rendering)
-   [DevTools](#devtools)
-   [Powered Apps](#powered-apps)
-   [Support & Contribute](#support-contribute)
-   [License](#license)

## Quick start

Sharing some state across components sometimes is more complex than it should be.

With AtomicState it will be clean and simple:

`./doYouKnowAtomicState.js`

```jsx
import { createStateAtom } from '@immobiliarelabs/atomic-state';

// This is an atom a container for a piece of state
export const doYouKnowAtomicState = createStateAtom({
    key: `DoYoyKnowAtomicState`, // unique ID
    default: null, // default value (aka initial value)
});
```

By importing the created atom you can read and modify the state wherever you want:

`./DoYoyKnowAtomicStateDisclamer.js`

```jsx
import { useStateAtom } from '@immobiliarelabs/atomic-state';
import { doYouKnowAtomicState } from './doYouKnowAtomicState';

export function DoYoyKnowAtomicStateDisclamer() {
    // useStateAtom is like a shared version of useState
    const [answer, setAnswer] = useStateAtom(doYouKnowAtomicState);

    if (answer) {
        return null;
    }

    return (
        <div>
            Hey! Do you know AtomicState?
            <button onClick={() => setAnswer('yes')}>Yes!</button>
            <button onClick={() => setAnswer('no')}>No!</button>
        </div>
    );
}
```

`./DoYoyKnowAtomicStateLinks.js`

```jsx
import { useStateAtom } from '@immobiliarelabs/atomic-state';
import { doYouKnowAtomicState } from './doYouKnowAtomicState';

export function DoYoyKnowAtomicStateLinks() {
    const [answer] = useStateAtom(doYouKnowAtomicState);

    if (answer === 'no') {
        return (
            <div>
                Oh really!?! Take a look{' '}
                <a href="https://github.com/immobiliare/atomic-state">here</a>,
                it's easy to pick up!
            </div>
        );
    }

    return null;
}
```

That's it and if you want to know more read the below docs!

### Setup

To install the latest stable version, run the following command:

```
npm install @immobiliarelabs/atomic-state
```

Or if you're using yarn:

```
yarn add @immobiliarelabs/atomic-state
```

### What is an atom?

An atom represents a piece of state. Atoms can be read from and written to from any component. Components that read the value of an atom are implicitly subscribed to that atom, so any atom updates will result in a re-render of all components subscribed to that atom:

```tsx
import { createStateAtom, useStateAtom } from '@immobiliarelabs/atomic-state';

const yourNameAtom = createStateAtom({
    key: `YourName`, // unique ID
    default: '', // default value (aka initial value)
});

function TextInput() {
    // useStateAtom has the same behavior of useState
    const [yourName, setYourName] = useStateAtom(yourNameAtom);

    function handleChange(event) {
        setYourName(event.target.value);
    }

    return (
        <div>
            <label htmlFor="your-name">Your name:</label>
            <input
                id="your-name"
                type="text"
                onChange={handleChange}
                value={text}
            />
        </div>
    );
}
```

### Deriving state

Derived atoms can be used to derive information from other atoms. They cache their output and triggers an update only when their output changes.

Conceptually, they are very similar to formulas in spreadsheets, and can't be underestimated. They help in reducing the amount of state you have to store and are highly optimized. Use them wherever possible.

```tsx
import { createDerivedAtom, useAtomValue } from '@immobiliarelabs/atomic-state';
import { yourNameAtom } from './TextInput';

const yourNameIsFilledAtom = createDerivedAtom({
    key: `YourName/Filled`, // unique ID
    get(use) {
        return use(yourNameAtom) !== '';
    },
});

function TextInputFilledStatus() {
    // useAtomValue reads the state from an atom
    const filled = useAtomValue(yourNameIsFilledAtom);

    return <span>{filled ? 'Filled' : 'Empty'}</span>;
}
```

### Effects

Atom effects are works in a similar way of React [useEffect](https://reactjs.org/docs/hooks-effect.html).

They have the same [cleanup](https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup) api and are executed only on the client side.

```tsx
import { createStateAtom, useStateAtom } from '@immobiliarelabs/atomic-state';

const persistentModeAtom = createStateAtom({
    key: `PersistentMode`,
    default: true,
});

const textAtom = createStateAtom({
    key: `Text`,
    default: null,
    setup(self, { effect, get, set }) {
        /**
            `effect` lets you run effects after the atom update

            Like React.useEffect the effects are executed only in the browser after the paint
        */
        effect(
            (open) => {
                if (get(persistentModeAtom) !== true) return;

                if (get(self) === null) {
                    set(self, localStorage.getItem('LastEditedText') || '');
                } else {
                    localStorage.setItem('LastEditedText', get(self));
                }
            },
            [self]
        );
    },
});
```

Under the hood the atom effects are managed through React useEffect, so even in your unit tests they will behave exactly like useEffect.

### Server Side Rendering

The first thing you have to do is place the AtomicStateProvider on top of your applications.

It is possible to hydrate the atoms state by passing a state object to it.

```tsx
import {
    createStateAtom,
    AtomicStateProvider,
} from '@immobiliarelabs/atomic-state';
import { myFormAtom } from './atoms';

function MyApp({ formInitialState }) {
    /**
     * Every update of this value will trigger a `setState` on the related atoms
     *
     * This makes easy to update the atom values on page navigations
     */
    const atomsState = useMemo(
        () => ({
            [myFormAtom.key]: formInitialState,
        }),
        [formInitialState]
    );

    return (
        <AtomicStateProvider state={atomsState}>
            <AppCore />
        </AtomicStateProvider>
    );
}
```

### DevTools

We have a devtools extension for [Chrome](https://chrome.google.com/webstore/detail/atomic-state-devtools/mhdnjcangakajcinldiniomklbmmjcka)

For more info take a look into the [devtools docs](./devtools/README.md)

## Powered Apps

AtomicState was created by the amazing frontend team at ImmobiliareLabs, the Tech dept at Immobiliare.it, the first real estate site in Italy.  
We are currently using AtomicState in our products.

**If you are using AtomicState in production [drop us a message](mailto://opensource@immobiliare.it)**.

## Support & Contribute

Made with ❤️ by [ImmobiliareLabs](https://github.com/immobiliare) & [Contributors](./CONTRIBUTING.md#contributors)

We'd love for you to contribute to AtomicState!
If you have any questions on how to use AtomicState, bugs and enhancement please feel free to reach out by opening a [GitHub Issue](https://github.com/immobiliare/atomic-state/issues).

## License

AtomicState is licensed under the MIT license.  
See the [LICENSE](./LICENSE) file for more information.
