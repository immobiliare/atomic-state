// from dequal/lite
export let hasOwnProperty = Object.prototype.hasOwnProperty;

export function dequal(foo: any, bar: any) {
    let ctor, len;
    if (foo === bar) return true;

    if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
        if (ctor === Date) return foo.getTime() === bar.getTime();
        if (ctor === RegExp) return foo.toString() === bar.toString();

        if (ctor === Array) {
            if ((len = foo.length) === bar.length) {
                while (len-- && dequal(foo[len], bar[len]));
            }
            return len === -1;
        }

        if (!ctor || typeof foo === 'object') {
            len = 0;
            for (ctor in foo) {
                if (
                    hasOwnProperty.call(foo, ctor) &&
                    ++len &&
                    !hasOwnProperty.call(bar, ctor)
                )
                    return false;
                if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor]))
                    return false;
            }
            return Object.keys(bar).length === len;
        }
    }

    return foo !== foo && bar !== bar;
}
