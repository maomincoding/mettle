declare const BRAND_SYMBOL: unique symbol;
type Node = {
    _source: Signal;
    _prevSource?: Node;
    _nextSource?: Node;
    _target: Computed | Effect;
    _prevTarget?: Node;
    _nextTarget?: Node;
    _version: number;
    _rollbackNode?: Node;
};
declare function batch<T>(fn: () => T): T;
declare function untracked<T>(fn: () => T): T;
declare class Signal<T = any> {
    /** @internal */
    _value: unknown;
    /** @internal */
    _version: number;
    /** @internal */
    _node?: Node;
    /** @internal */
    _targets?: Node;
    constructor(value?: T, options?: SignalOptions<T>);
    /** @internal */
    _refresh(): boolean;
    /** @internal */
    _subscribe(node: Node): void;
    /** @internal */
    _unsubscribe(node: Node): void;
    /** @internal */
    _watched?(this: Signal<T>): void;
    /** @internal */
    _unwatched?(this: Signal<T>): void;
    subscribe(fn: (value: T) => void): () => void;
    name?: string;
    valueOf(): T;
    toString(): string;
    toJSON(): T;
    peek(): T;
    brand: typeof BRAND_SYMBOL;
    get value(): T;
    set value(value: T);
}
export interface SignalOptions<T = any> {
    watched?: (this: Signal<T>) => void;
    unwatched?: (this: Signal<T>) => void;
    name?: string;
}
/** @internal */
declare function Signal(this: Signal, value?: unknown, options?: SignalOptions): void;
declare function signal<T>(value: T, options?: SignalOptions<T>): Signal<T>;
declare function signal<T = undefined>(): Signal<T | undefined>;
/** @internal */
declare class Computed<T = any> extends Signal<T> {
    _fn: () => T;
    _sources?: Node;
    _globalVersion: number;
    _flags: number;
    constructor(fn: () => T, options?: SignalOptions<T>);
    _notify(): void;
    get value(): T;
}
/** @internal */
declare function Computed(this: Computed, fn: () => unknown, options?: SignalOptions): void;
declare namespace Computed {
    var prototype: Computed<any>;
}
interface ReadonlySignal<T = any> {
    readonly value: T;
    peek(): T;
    subscribe(fn: (value: T) => void): () => void;
    valueOf(): T;
    toString(): string;
    toJSON(): T;
    brand: typeof BRAND_SYMBOL;
}
declare function computed<T>(fn: () => T, options?: SignalOptions<T>): ReadonlySignal<T>;
type EffectFn = ((this: {
    dispose: () => void;
}) => void | (() => void)) | (() => void | (() => void));
/** @internal */
declare class Effect {
    _fn?: EffectFn;
    _cleanup?: () => void;
    _sources?: Node;
    _nextBatchedEffect?: Effect;
    _flags: number;
    name?: string;
    _statsDisposed: boolean;
    constructor(fn: EffectFn, options?: EffectOptions);
    _callback(): void;
    _start(): () => void;
    _notify(): void;
    _dispose(): void;
    dispose(): void;
}
export interface EffectOptions {
    name?: string;
}
/** @internal */
declare function Effect(this: Effect, fn: EffectFn, options?: EffectOptions): void;
declare function effect(fn: EffectFn, options?: EffectOptions): () => void;
export { computed, effect, batch, untracked, signal };
