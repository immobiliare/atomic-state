// A porting React of use-subscription (v 1.5.1)
// It has been ported in order to optimize the compilation

import { useEffect, useState } from 'react';

// Hook used for safely managing subscriptions in concurrent mode.
//
// In order to avoid removing and re-adding subscriptions each time this hook is called,
// the parameters passed to this hook should be memoized in some way–
// either by wrapping the entire params object with useMemo()
// or by wrapping the individual callbacks with useCallback().
export function useSubscription<_value>({
    // (Synchronously) returns the current _value of our subscription.
    _getCurrentValue,

    // This function is passed an event handler to attach to the subscription.
    // It should return an unsubscribe function that removes the handler.
    _subscribe,
}: {
    _getCurrentValue: () => _value;
    _subscribe: (callback: Function) => () => void;
}): _value {
    // Read the current value from our subscription.
    // When this value changes, we'll schedule an update with React.
    // It's important to also store the hook params so that we can check for staleness.
    // (See the comment in checkForUpdates() below for more info.)
    const [state, setState] = useState(() => ({
        _getCurrentValue,
        _subscribe,
        _value: _getCurrentValue(),
    }));

    let valueToReturn = state._value;

    // If parameters have changed since our last render, schedule an update with its current value.
    if (
        state._getCurrentValue !== _getCurrentValue ||
        state._subscribe !== _subscribe
    ) {
        // If the subscription has been updated, we'll schedule another update with React.
        // React will process this update immediately, so the old subscription value won't be committed.
        // It is still nice to avoid returning a mismatched value though, so let's override the return value.
        valueToReturn = _getCurrentValue();

        setState({
            _getCurrentValue,
            _subscribe,
            _value: valueToReturn,
        });
    }
    // It is important not to subscribe while rendering because this can lead to memory leaks.
    // (Learn more at reactjs.org/docs/strict-mode.html#detecting-unexpected-side-effects)
    // Instead, we wait until the commit phase to attach our handler.
    //
    // We intentionally use a passive effect (useEffect) rather than a synchronous one (useLayoutEffect)
    // so that we don't stretch the commit phase.
    // This also has an added benefit when multiple components are subscribed to the same source:
    // It allows each of the event handlers to safely schedule work without potentially removing an another handler.
    // (Learn more at https://codesandbox.io/s/k0yvr5970o)
    useEffect(() => {
        let didUnsubscribe = false;

        const checkForUpdates = () => {
            // It's possible that this callback will be invoked even after being unsubscribed,
            // if it's removed as a result of a subscription event/update.
            // In this case, React will log a DEV warning about an update from an unmounted component.
            // We can avoid triggering that warning with this check.
            if (didUnsubscribe) {
                return;
            }

            // We use a state updater function to avoid scheduling work for a stale source.
            // However it's important to eagerly read the currently value,
            // so that all scheduled work shares the same value (in the event of multiple subscriptions).
            // This avoids visual "tearing" when a mutation happens during a (concurrent) render.
            const _value = _getCurrentValue();

            setState((prevState) => {
                // Ignore values from stale sources!
                // Since we subscribe an unsubscribe in a passive effect,
                // it's possible that this callback will be invoked for a stale (previous) subscription.
                // This check avoids scheduling an update for that stale subscription.
                if (
                    prevState._getCurrentValue !== _getCurrentValue ||
                    prevState._subscribe !== _subscribe
                ) {
                    return prevState;
                }

                // Some subscriptions will auto-invoke the handler, even if the value hasn't changed.
                // If the value hasn't changed, no update is needed.
                // Return state as-is so React can bail out and avoid an unnecessary render.
                if (prevState._value === _value) {
                    return prevState;
                }

                return {
                    _getCurrentValue: prevState._getCurrentValue,
                    _subscribe: prevState._subscribe,
                    _value,
                };
            });
        };
        const unsubscribe = _subscribe(checkForUpdates);

        // Because we're subscribing in a passive effect,
        // it's possible that an update has occurred between render and our effect handler.
        // Check for this and schedule an update if work has occurred.
        checkForUpdates();

        return () => {
            didUnsubscribe = true;
            unsubscribe();
        };
    }, [_getCurrentValue, _subscribe]);

    // Return the current value for our caller to use while rendering.
    return valueToReturn;
}
