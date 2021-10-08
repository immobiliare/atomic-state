import {
    createContext,
    createElement,
    ReactNode,
    useContext,
    useDebugValue,
    useEffect,
    useMemo,
    useReducer,
} from 'react';
import { dequal as deepEqual } from './dequal';
import { useSubscription } from './useSubscription';
import { sendMessageToDevTools } from './devtools';
import { hasOwnProperty } from './dequal';

const DEV_MODE = process.env.NODE_ENV !== 'production';

function deepFreeze(value: any) {
    if (typeof value !== 'object' || !value || Object.isFrozen(value)) return;

    Object.freeze(value);

    for (let key in value) {
        if (hasOwnProperty.call(value, key)) deepFreeze(value[key]);
    }
}

export type StateUpdateDispatcher<S> = (state: S | ((prev: S) => S)) => void;

type AtomsStateApi = {
    get: <A extends StateAtom<any>>(targetAtomRef: AtomRef<A>) => A['state'];
    set: <A extends StateAtom<any>>(
        targetAtomRef: AtomRef<A>,
        state: A['state'] | ((prev: A['state']) => A['state'])
    ) => void;
};

export type StateAtom<S, U = S> = {
    add: (listener: (state: S) => void) => void;
    remove: (listener: (state: S) => void) => void;
    state: S;
    setState: StateUpdateDispatcher<U>;
    _cleanup: () => void;
};

export type AtomRef<A extends StateAtom<any>> = {
    (
        loadAtom: AtomLoader,
        enqueue: (fn: () => void) => void,
        state?: any
    ): A | null;
    key: string;
};

type AtomLoader = (atomRef: AtomRef<any>) => StateAtom<any>;

function makeContext(state: Record<string, any>) {
    /**
     * This is where all the created atoms are stored
     */
    const atomsMap = new Map<string, StateAtom<any> | null>();

    /**
     * The effects queue.
     *
     * This is used as binding with the React effects queue
     * in order to make easier to test atoms with effects
     */
    const _queue: (() => void)[] & { _process?: () => void } = [];

    /**
     * The public API of this context
     */
    const context = {
        _load: _load as AtomLoader,
        _update,
        state,
        _cleanup,
        _queue,
    };

    /**
     * An internal function that adds callbacks
     * to the effects queue and requests it's processing
     */
    function enqueue(fn: () => void) {
        _queue.push(fn);
        _queue._process && _queue._process();
    }

    /**
     * The AtomicState Core
     *
     * This is the function that creates and reuses existing atoms
     */
    function _load(atomRef: AtomRef<any>) {
        let atom = atomsMap.get(atomRef.key);

        if (atom === undefined) {
            // In order to detect circular references
            atomsMap.set(atomRef.key, null);
            atom = atomRef(_load, enqueue, state[atomRef.key]);
            atomsMap.set(atomRef.key, atom as StateAtom<any>);
        }

        if (atom === null) {
            throw new Error(`Detected circular reference from ${atomRef.key}`);
        }

        return atom as StateAtom<any>;
    }

    /**
     * This function enables the users to update the atoms state from the root
     *
     * Useful for SPA to update the atoms state with navigation data
     */
    function _update(_state: Record<string, any>) {
        context.state = state = _state;

        for (let key in state) {
            const atom = atomsMap.get(key);
            if (atom) {
                atom.setState(state[key]);
            }
        }
    }

    /**
     * A destroy everything function
     */
    function _cleanup() {
        atomsMap.forEach((atom) => {
            atom && atom._cleanup();
        });
        atomsMap.clear();
    }

    return context;
}

export type StateAtomParams<S, U = S, V = S> = {
    /**
     * The atom key
     *
     * This should be unique and could be used for referencing the atom
     * in the hydration phase.
     */
    key: string;
    /**
     * The atom default value
     *
     * When a callback is provided, the callback function will be called on the atom initialization phase.
     *
     * @param api Some API are provided through parameters:
     * - `set(atom, value)` lets you update an atom with the passed value. If the new state is computed using the previous state, you can pass a function.
     * - `get(atom)` lets you get the atom current state. If the requested atom has not been loaded, it will be loaded synchronously.
     *
     * An atom is initialized when it is referenced for the first time
     */
    default:
        | S
        | ((api: {
              get: <A extends StateAtom<any>>(atom: AtomRef<A>) => A['state'];
              set: <A extends StateAtom<any>>(
                  atom: AtomRef<A>,
                  state: A['state'] | ((prev: A['state']) => A['state'])
              ) => void;
          }) => S);
    /**
     * The atom setup function
     *
     * This function will be called during the atom initialization phase.
     *
     * An atom is initialized when it is referenced for the first time.
     *
     * @param api Some API are provided through parameters:
     * - `set(atom, value)` lets you update an atom with the passed value. If the new state is computed using the previous state, you can pass a function.
     * - `get(atom)` lets you get the atom current state. If the requested atom has not been loaded, it will be loaded synchronously.
     * - `watch(callback, atoms)` subscribes to atoms updates. It is called synchronously on startup and at every state cange of the subscribed atom.
     * - `effect(callback, atoms)` run the effect on atoms updates. Works like React useEffect.
     *
     * @param self The self parameter could be used to refer the current atom
     *
     * The return value could be a cleanup function and will be called when the context provider is unmounted.
     */
    setup?: (
        self: AtomRef<StateAtom<S, U>>,
        api: {
            watch: (
                callback: () => void,
                deps: AtomRef<any>[]
            ) => void | (() => void);
            effect: (
                callback: () => void,
                deps: AtomRef<any>[]
            ) => void | (() => void);
            get: <A extends StateAtom<any>>(atom: AtomRef<A>) => A['state'];
            set: <A extends StateAtom<any>>(
                atom: AtomRef<A>,
                state: A['state'] | ((prev: A['state']) => A['state'])
            ) => void;
        }
    ) => void | (() => void);
    /**
     * On every update the atoms trigger re-renders only then the state value changes.
     *
     * This sometimes is not enough and we want to trigger a re-render when the content of the state changes.
     *
     * You can switch to deep check buy activating this param.
     *
     * Under the hood we use [dequal/lite](https://github.com/lukeed/dequal#dequallite) for deep checks.
     */
    deepEqualityCheck?: true;
};

export function createStateAtom<S, U = S>({
    key,
    default: init,
    setup,
    deepEqualityCheck,
}: StateAtomParams<S, U>) {
    const ref = function (
        loadAtom: AtomLoader,
        enqueue: (fn: () => void) => void,
        state?: S
    ) {
        const listeners = new Set<(state: S) => void>();
        const cleanupFunctions = new Set<void | (() => void)>();

        const setState: StateUpdateDispatcher<S> = function (state) {
            if (typeof state === 'function') {
                state = (state as (s: S) => S)(atom.state);
            }

            if (deepEqualityCheck) {
                if (deepEqual(state, atom.state)) {
                    return;
                }
            } else if (state === atom.state) return;

            if (DEV_MODE) {
                deepFreeze(state);
            }

            atom.state = state as S;
            listeners.forEach((cb) => cb(state as S));
        };

        const api: AtomsStateApi = {
            get(target) {
                if (ref === target) return atom.state;

                return loadAtom(target).state;
            },
            set(target, value) {
                if (ref === target) {
                    setState(value);
                } else {
                    loadAtom(target).setState(value);
                }
            },
        };

        const atom: StateAtom<S, U> = {
            add: listeners.add.bind(listeners),
            remove: listeners.delete.bind(listeners),
            // The state is initialized later in order to get access to the atom instance
            // @ts-expect-error
            state,
            // The default setState takes S as input, not U
            // @ts-expect-error
            setState,
            _cleanup() {
                cleanupFunctions.forEach((cleanup) => {
                    cleanup && cleanup();
                });
            },
        };

        if (typeof state === 'undefined') {
            if (typeof init === 'function') {
                setState((init as Function)(api));
            } else {
                setState(init);
            }
        }

        if (DEV_MODE) {
            sendMessageToDevTools(key, 'NEW_ATOM', atom.state);

            atom.add(() =>
                sendMessageToDevTools(key, 'UPDATE_ATOM', atom.state)
            );
        }

        if (setup) {
            let watchLock = false;

            const track = (
                callback: () => void | (() => void),
                deps: AtomRef<any>[],
                mode: 's' | 'e'
            ) => {
                if (watchLock && DEV_MODE) {
                    console.warn(
                        `Watch calls should not be nested. Check the setup function of ${key}`
                    );
                }

                let cleanup: void | (() => void);

                function run() {
                    cleanup && cleanup();
                    cleanupFunctions.delete(cleanup);

                    cleanup = callback();
                    cleanupFunctions.add(cleanup);
                }

                function runEffect() {
                    enqueue(run);
                }

                let listener = mode === 'e' ? runEffect : run;

                watchLock = true;

                deps.forEach((target) => {
                    if (target === ref) {
                        atom.add(listener);
                    } else {
                        loadAtom(target).add(listener);
                    }
                });

                listener();

                watchLock = false;
            };

            cleanupFunctions.add(
                setup(ref, {
                    get: api.get,
                    set: api.set,
                    watch(callback, deps) {
                        track(callback, deps, 's');
                    },
                    effect(callback, deps) {
                        track(callback, deps, 'e');
                    },
                })
            );
        }

        return atom;
    };

    ref.key = key;

    return ref;
}

export type DerivedAtomParams<S, U = S> = {
    /**
     * The atom key
     *
     * This should be unique and could be used for referencing the atom
     * in the hydration phase.
     */
    key: string;
    /**
     * The value getter
     *
     * Use this function to change the public value
     *
     * @param api Some API are provided through parameters:
     * - `set(atom, value)` lets you update an atom with the passed value. If the new state is computed using the previous state, you can pass a function.
     * - `get(atom)` lets you get the atom current state. If the requested atom has not been loaded, it will be loaded synchronously.
     */
    get: (api: {
        get: <A extends StateAtom<any>>(
            targetAtomRef: AtomRef<A>
        ) => A['state'];
        set: <A extends StateAtom<any>>(
            targetAtomRef: AtomRef<A>,
            state: A['state'] | ((prev: A['state']) => A['state'])
        ) => void;
    }) => S;
    /**
     * The value setter
     *
     * Use this to intercept the setState over this atom
     *
     * @param api Some API are provided through parameters:
     * - `set(atom, value)` lets you update an atom with the passed value. If the new state is computed using the previous state, you can pass a function.
     * - `get(atom)` lets you get the atom current state. If the requested atom has not been loaded, it will be loaded synchronously.
     *
     */
    set?: (
        value: U,
        api: {
            get: <A extends StateAtom<any>>(
                targetAtomRef: AtomRef<A>
            ) => A['state'];
            set: <A extends StateAtom<any>>(
                targetAtomRef: AtomRef<A>,
                state: A['state'] | ((prev: A['state']) => A['state'])
            ) => void;
        }
    ) => void;
    /**
     * The atom setup function
     *
     * This function will be called during the atom initialization phase.
     *
     * An atom is initialized when it is referenced for the first time.
     *
     * @param api Some API are provided through parameters:
     * - `set(atom, value)` lets you update an atom with the passed value. If the new state is computed using the previous state, you can pass a function.
     * - `get(atom)` lets you get the atom current state. If the requested atom has not been loaded, it will be loaded synchronously.
     * - `watch(callback, atoms)` subscribes to atoms updates. It is called synchronously on startup and at every state cange of the subscribed atom.
     * - `effect(callback, atoms)` run the effect on atoms updates. Works like React useEffect.
     *
     * @param self The self parameter could be used to refer the current atom
     *
     * The return value could be a cleanup function and will be called when the context provider is unmounted.
     */
    setup?: (
        self: AtomRef<StateAtom<S, U>>,
        api: {
            watch: (
                callback: () => void,
                deps: AtomRef<any>[]
            ) => void | (() => void);
            effect: (
                callback: () => void,
                deps: AtomRef<any>[]
            ) => void | (() => void);
            get: <A extends StateAtom<any>>(atom: AtomRef<A>) => A['state'];
            set: <A extends StateAtom<any>>(
                atom: AtomRef<A>,
                state: A['state'] | ((prev: A['state']) => A['state'])
            ) => void;
        }
    ) => void | (() => void);
    /**
     * On every update the atoms trigger re-renders only then the state value changes.
     *
     * This sometimes is not enough and we want to trigger a re-render when the content of the state changes.
     *
     * You can switch to deep check buy activating this param.
     *
     * Under the hood we use [dequal/lite](https://github.com/lukeed/dequal#dequallite) for deep checks.
     */
    deepEqualityCheck?: true;
};

export function createDerivedAtom<S, U = S>({
    key,
    get,
    set,
    setup,
    deepEqualityCheck,
}: DerivedAtomParams<S, U>) {
    const ref = function (
        loadAtom: AtomLoader,
        enqueue: (fn: () => void) => void
    ) {
        const api: AtomsStateApi = {
            get(target) {
                return loadAtom(target).state;
            },
            set(target, value) {
                loadAtom(target).setState(value);
            },
        };

        const getAPI: AtomsStateApi = {
            get(target) {
                loadAtom(target).add(revalidate);

                return loadAtom(target).state;
            },
            set: api.set,
        };

        const atom: StateAtom<S, U> = createStateAtom<any>({
            key,
            default: () => get(getAPI),
            setup,
            deepEqualityCheck,
        })(loadAtom, enqueue);

        const setState: StateUpdateDispatcher<S> = atom.setState as any;

        function revalidate() {
            setState(get(getAPI));
        }

        atom.setState = (state) => {
            if (set) {
                if (typeof state === 'function') {
                    state = (state as Function)(atom.state);
                }

                set(state as U, api);
            }
        };

        return atom;
    };

    ref.key = key;

    return ref;
}

const ctx = createContext(makeContext({}));

export type StateAtomProviderProps = {
    children: ReactNode;
    /**
     * The hydrated state of the atoms.
     *
     * This should be created by referencing the atom keys.
     *
     * Every update of this value triggers an update to the referenced atoms
     */
    state?: Record<string, any>;
};

/**
 * The core of the atom state manager.
 *
 * This should be placed on the root of your application.
 */
export function AtomicStateProvider({
    children,
    state,
}: StateAtomProviderProps) {
    const value = useMemo(() => makeContext(state || {}), []);
    const [, forceRender] = useReducer((s) => !s, false);

    useEffect(() => {
        if (state && value.state !== state) {
            value._update(state);
        }
    }, [state, value]);

    useEffect(() => {
        value._queue.forEach((fn) => {
            fn && fn();
        });
        value._queue._process = forceRender;
        value._queue.length = 0;
    });

    useEffect(() => value._cleanup, []);

    return createElement(ctx.Provider, { value }, children);
}

/**
 * This hook returns the current instance of the selected atom.
 *
 * This hook will not subscribe to the atom updates
 */
export function useAtom<A extends StateAtom<any>>(atomRef: AtomRef<A>): A {
    return useContext(ctx)!._load(atomRef) as A;
}

/**
 * The same of React.useState, but with atoms.
 */
export function useStateAtom<S, U = S>(atomRef: AtomRef<StateAtom<S, U>>) {
    const atom = useAtom(atomRef);

    const subscription = useMemo(
        () => ({
            _getCurrentValue: () => atom.state,
            _subscribe: (callback: () => void) => {
                atom.add(callback);
                return () => atom.remove(callback);
            },
        }),
        [atom]
    );

    const state = useSubscription(subscription);

    useDebugValue(state);

    return [state, atom.setState] as [S, StateAtom<S, U>['setState']];
}

/**
 * Returns the setState function of the atom.
 *
 * Useful when you need to update the atom without subscribing to it's updates
 */
export function useAtomSetState<U>(atomRef: AtomRef<StateAtom<any, U>>) {
    return useAtom(atomRef).setState;
}

/**
 * Returns the current value of the atom
 */
export function useAtomValue<S>(atomRef: AtomRef<StateAtom<S>>) {
    return useStateAtom(atomRef)[0];
}
