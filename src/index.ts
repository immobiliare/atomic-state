import {
    createContext,
    createElement,
    ReactNode,
    useCallback,
    useContext,
    useDebugValue,
    useEffect,
    useMemo,
    useReducer,
} from 'react';
import { dequal as deepEqual } from 'dequal/lite';
import { useSubscription } from 'use-subscription';
import { debugAtom } from './devtools';

export type StateUpdateDispatcher<S> = (state: S | ((prev: S) => S)) => void;

export type StateAtom<S> = {
    add: (listener: (state: S) => void) => void;
    remove: (listener: (state: S) => void) => void;
    state: S;
    setState: StateUpdateDispatcher<S>;
    cleanup: () => void;
};

export type AtomRef<A extends StateAtom<any>> = {
    (
        atomsState: AtomGetter,
        enqueue: (fn: () => void) => void,
        state?: any
    ): A | null;
    key: string;
};

type AtomGetter = (atomRef: AtomRef<any>) => StateAtom<any>;

function makeContext(state: Record<string, any> = {}) {
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
    const queue: (() => void)[] & { process?: () => void } = [];

    /**
     * The public API of this context
     */
    const context = {
        use: use as AtomGetter,
        update,
        state,
        cleanup,
        queue,
    };

    /**
     * An internal function that adds callbacks
     * to the effects queue and requests it's processing
     */
    function enqueue(fn: () => void) {
        queue.push(fn);
        queue.process && queue.process();
    }

    /**
     * The State Atom Core
     *
     * This is the function that creates and reuses existing atoms
     */
    function use(atomRef: AtomRef<any>) {
        let atom = atomsMap.get(atomRef.key);

        if (atom === undefined) {
            // In order to detect circular references
            atomsMap.set(atomRef.key, null);
            atom = atomRef(use, enqueue, state[atomRef.key]);
            atomsMap.set(atomRef.key, atom as StateAtom<any>);

            /* istanbul ignore next */
            if (
                process.env.NODE_ENV === 'development' &&
                typeof window !== 'undefined' &&
                atom
            ) {
                /**
                 * This function acts as glue code for the devTools extension
                 */
                debugAtom(atomRef.key, atom);
            }
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
    function update(_state: Record<string, any>) {
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
    function cleanup() {
        atomsMap.forEach((atom) => {
            atom && atom.cleanup();
        });
        atomsMap.clear();
    }

    return context;
}

export type StateAtomParams<S> = {
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
     * An atom is initialized when it is referenced for the first time
     */
    default: S | (() => S);
    /**
     * The atom effect function
     *
     * This function will be called on every state change with the same timing of the React effects
     *
     * The setState parameter could be used to update the atom state but be careful,
     * if used without conditionals it could create infinite loops!
     *
     * The return value could be a cleanup function that works the same way of the React effects cleanup functions.
     */
    effect?: (
        state: S,
        setState: StateUpdateDispatcher<S>
    ) => void | (() => void);
    /**
     * The atom subscribe
     *
     * This function will be called during the atom initialization phase.
     *
     * An atom is initialized when it is referenced for the first time.
     *
     * The setState parameter could be used to update the atom state and you can subscribe to other atoms changes using the watch function.
     *
     * The return value could be a cleanup function and will be called when the context provider is unmounted.
     */
    subscribe?: (
        setState: StateUpdateDispatcher<S>,
        api: {
            watch: <A extends StateAtom<any>>(
                atomRef: AtomRef<A>,
                callback: (state: A['state']) => void
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

export function createStateAtom<S>({
    key,
    default: init,
    effect,
    subscribe,
    deepEqualityCheck,
}: StateAtomParams<S>) {
    const ref = function (
        atomsState: AtomGetter,
        enqueue: (fn: () => void) => void,
        state?: S
    ) {
        const listeners = new Set<(state: S) => void>();
        let effectCleanup: (() => void) | void;
        let subscribeCleanup: (() => void) | void;

        const setState: StateUpdateDispatcher<S> = function (state) {
            if (typeof state === 'function') {
                state = (state as (s: S) => S)(atom.state);
            }

            if (deepEqualityCheck) {
                if (deepEqual(state, atom.state)) {
                    return;
                }
            } else if (state === atom.state) return;

            atom.state = state as S;
            listeners.forEach((cb) => cb(state as S));

            effect &&
                enqueue(() => {
                    effectCleanup && effectCleanup();
                    effectCleanup = effect(state as S, setState);
                });
        };

        const atom: StateAtom<S> = {
            add: listeners.add.bind(listeners),
            remove: listeners.delete.bind(listeners),
            // The state is initialized through setState in order to trigger effects
            // @ts-expect-error
            state: null,
            setState,
            cleanup() {
                effectCleanup && effectCleanup();
                subscribeCleanup && subscribeCleanup();
            },
        };

        /**
         * Triggers the startup effects
         */
        setState(state || init);

        if (subscribe) {
            let watchLock = false;

            subscribeCleanup = subscribe(setState, {
                watch(watchedAtomRef, callback) {
                    if (watchLock && process.env.NODE_ENV !== 'production') {
                        console.warn(
                            `Watch calls should not be nested. Check the subscribe function of ${key}`
                        );
                    }

                    watchLock = true;

                    const watchedAtom = atomsState(watchedAtomRef);
                    callback(watchedAtom.state);
                    watchedAtom.add(callback);

                    watchLock = false;
                },
            });
        }

        return atom;
    };

    ref.key = key;

    return ref;
}

export type DerivedAtomParams<V> = {
    /**
     * The atom key
     *
     * This should be unique and is useful for debugging the atoms derivations with the devTools
     */
    key: string;
    /**
     * The value getter
     *
     * With the `use` function you could subscribe this atom to the other atoms updates
     */
    get: (
        use: <A extends StateAtom<any>>(atomRef: AtomRef<A>) => A['state']
    ) => V;
    /**
     * The atom effect function
     *
     * This function will be called on every state change with the same timing of the React effects
     *
     * The setState parameter could be used to update the atom state but be careful,
     * if used without conditionals it could create infinite loops!
     *
     * The return value could be a cleanup function that works the same way of the React effects cleanup functions.
     */
    effect?: <S extends V = V>(state: S) => void | (() => void);
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

export function createDerivedAtom<V>({
    key,
    get,
    effect,
    deepEqualityCheck,
}: DerivedAtomParams<V>) {
    const ref = function (
        atomsState: AtomGetter,
        enqueue: (fn: () => void) => void
    ) {
        const deps = new Set<AtomRef<any>>();

        const use = (watchedAtomRef: AtomRef<StateAtom<V>>) => {
            const watchedAtom = atomsState(watchedAtomRef);

            if (!deps.has(watchedAtomRef)) {
                deps.add(watchedAtomRef);
                watchedAtom.add(revalidate);
            }

            return watchedAtom.state;
        };

        const atom = createStateAtom<V>({
            key,
            default: () => get(use),
            effect,
            deepEqualityCheck,
        })(atomsState, enqueue);

        function revalidate() {
            atom.setState(get(use));
        }

        return atom;
    };

    ref.key = key;

    return ref;
}

const ctx = createContext<ReturnType<typeof makeContext> | null>(null);

export type AtomsStateProviderProps = {
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
export function AtomsStateProvider({
    children,
    state,
}: AtomsStateProviderProps) {
    const value = useMemo(() => makeContext(state), []);
    const [, forceRender] = useReducer((s) => !s, false);

    useEffect(() => {
        if (state && value.state !== state) {
            value.update(state);
        }
    }, [state, value]);

    useEffect(() => {
        value.queue.forEach((fn) => {
            fn && fn();
        });
        value.queue.process = forceRender;
        value.queue.length = 0;
    });

    useEffect(() => value.cleanup, []);

    return createElement(ctx.Provider, { value }, children);
}

/**
 * This hook returns the current instance of the selected atom.
 *
 * This hook will not subscribe to the atom updates
 */
export function useAtom<A extends StateAtom<any>>(atomRef: AtomRef<A>): A {
    //@ts-ignore
    return useContext(ctx).use(atomRef) as A;
}

const id = (state: any) => state;

/**
 * The same of React.useState, but with atoms.
 */
export function useStateAtom<S, V = S>(
    atomRef: AtomRef<StateAtom<S>>,
    _getter: (state: S) => V = id
) {
    const atom = useAtom(atomRef);

    const subscription = useMemo(
        () => ({
            getCurrentValue: () => _getter(atom.state),
            subscribe: (callback: () => void) => {
                atom.add(callback);
                return () => atom.remove(callback);
            },
        }),
        [atom, _getter]
    );

    const state = useSubscription(subscription);

    useDebugValue(state);

    return [state, atom.setState] as [V, StateAtom<S>['setState']];
}

/**
 * Returns the setState function of the atom.
 *
 * Useful when you need to update the atom without subscribing to it's updates
 */
export function useAtomSetState<S>(atomRef: AtomRef<StateAtom<S>>) {
    return useAtom(atomRef).setState;
}

/**
 * Returns the current value of the atom
 */
export function useAtomValue<S>(atomRef: AtomRef<StateAtom<S>>) {
    return useStateAtom(atomRef)[0];
}

/**
 * Returns a subset of the current atom state
 *
 * The component will be re-rendered only when the selected state changes
 *
 * Useful when you want to optimize the number of updates of your component
 */
export function useAtomSelector<V, S = any>(
    atomRef: AtomRef<StateAtom<S>>,
    key: string
): V {
    const path = useMemo(() => key.split('.'), [key]);

    const getter = useCallback(
        (state) => {
            for (let i = 0; i < path.length; i++) {
                state = state ? state[path[i]] : null;
            }

            return state;
        },
        [path]
    );

    return useStateAtom(atomRef, getter)[0];
}
