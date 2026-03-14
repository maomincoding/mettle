/*!
 * Mettle.js v1.8.1
 * (c) 2021-2026 maomincoding
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Mettle = {}));
})(this, (function (exports) { 'use strict';

    const MODE_SLASH = 0;
    const MODE_TEXT = 1;
    const MODE_WHITESPACE = 2;
    const MODE_TAGNAME = 3;
    const MODE_COMMENT = 4;
    const MODE_PROP_SET = 5;
    const MODE_PROP_APPEND = 6;
    const CHILD_APPEND = 0;
    const CHILD_RECURSE = 2;
    const TAG_SET = 3;
    const PROPS_ASSIGN = 4;
    const PROP_SET = MODE_PROP_SET;
    const PROP_APPEND = MODE_PROP_APPEND;
    const evaluate = (h, built, fields, args) => {
        let tmp;
        built[0] = 0;
        for (let i = 1; i < built.length; i++) {
            const type = built[i++];
            const value = built[i] ? ((built[0] |= type ? 1 : 2), fields[built[i++]]) : built[++i];
            if (type === TAG_SET) {
                args[0] = value;
            }
            else if (type === PROPS_ASSIGN) {
                args[1] = Object.assign(args[1] || {}, value);
            }
            else if (type === PROP_SET) {
                (args[1] = args[1] || {})[built[++i]] = value;
            }
            else if (type === PROP_APPEND) {
                args[1][built[++i]] += value + '';
            }
            else if (type) {
                tmp = h.apply(value, evaluate(h, value, fields, ['', null]));
                args.push(tmp);
                if (value[0]) {
                    built[0] |= 2;
                }
                else {
                    built[i - 2] = CHILD_APPEND;
                    built[i] = tmp;
                }
            }
            else {
                args.push(value);
            }
        }
        return args;
    };
    const build = function (statics) {
        let mode = MODE_TEXT;
        let buffer = '';
        let quote = '';
        let current = [0];
        let char, propName;
        const commit = (field) => {
            if (mode === MODE_TEXT && (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')))) {
                current.push(CHILD_APPEND, field, buffer);
            }
            else if (mode === MODE_TAGNAME && (field || buffer)) {
                current.push(TAG_SET, field, buffer);
                mode = MODE_WHITESPACE;
            }
            else if (mode === MODE_WHITESPACE && buffer === '...' && field) {
                current.push(PROPS_ASSIGN, field, 0);
            }
            else if (mode === MODE_WHITESPACE && buffer && !field) {
                current.push(PROP_SET, 0, true, buffer);
            }
            else if (mode >= MODE_PROP_SET) {
                if (buffer || (!field && mode === MODE_PROP_SET)) {
                    current.push(mode, 0, buffer, propName);
                    mode = MODE_PROP_APPEND;
                }
                if (field) {
                    current.push(mode, field, 0, propName);
                    mode = MODE_PROP_APPEND;
                }
            }
            buffer = '';
        };
        for (let i = 0; i < statics.length; i++) {
            if (i) {
                if (mode === MODE_TEXT) {
                    commit();
                }
                commit(i);
            }
            for (let j = 0; j < statics[i].length; j++) {
                char = statics[i][j];
                if (mode === MODE_TEXT) {
                    if (char === '<') {
                        commit();
                        current = [current];
                        mode = MODE_TAGNAME;
                    }
                    else {
                        buffer += char;
                    }
                }
                else if (mode === MODE_COMMENT) {
                    if (buffer === '--' && char === '>') {
                        mode = MODE_TEXT;
                        buffer = '';
                    }
                    else {
                        buffer = char + buffer[0];
                    }
                }
                else if (quote) {
                    if (char === quote) {
                        quote = '';
                    }
                    else {
                        buffer += char;
                    }
                }
                else if (char === '"' || char === "'") {
                    quote = char;
                }
                else if (char === '>') {
                    commit();
                    mode = MODE_TEXT;
                }
                else if (!mode) ;
                else if (char === '=') {
                    mode = MODE_PROP_SET;
                    propName = buffer;
                    buffer = '';
                }
                else if (char === '/' && (mode < MODE_PROP_SET || statics[i][j + 1] === '>')) {
                    commit();
                    if (mode === MODE_TAGNAME) {
                        current = current[0];
                    }
                    mode = current;
                    (current = current[0]).push(CHILD_RECURSE, 0, mode);
                    mode = MODE_SLASH;
                }
                else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                    commit();
                    mode = MODE_WHITESPACE;
                }
                else {
                    buffer += char;
                }
                if (mode === MODE_TAGNAME && buffer === '!--') {
                    mode = MODE_COMMENT;
                    current = current[0];
                }
            }
        }
        commit();
        return current;
    };
    const CACHES = new Map();
    const regular = function (statics) {
        let tmp = CACHES.get(this);
        if (!tmp) {
            tmp = new Map();
            CACHES.set(this, tmp);
        }
        tmp = evaluate(this, tmp.get(statics) || (tmp.set(statics, (tmp = build(statics))), tmp), arguments, []);
        return tmp.length > 1 ? tmp : tmp[0];
    };
    const createVNode = function (tag, props, child) {
        let key = null;
        let el = null;
        let i = null;
        let children = null;
        for (i in props) {
            if (i === 'key')
                key = props[i];
        }
        if (arguments.length > 2) {
            children = arguments.length > 3 ? Array.prototype.slice.call(arguments, 2) : child;
        }
        // Vnode
        return {
            tag,
            props,
            children,
            key,
            el,
        };
    };
    const html = regular.bind(createVNode);

    const BRAND_SYMBOL = Symbol.for('signals');
    const RUNNING = 1 << 0;
    const NOTIFIED = 1 << 1;
    const OUTDATED = 1 << 2;
    const DISPOSED = 1 << 3;
    const HAS_ERROR = 1 << 4;
    const TRACKING = 1 << 5;
    // Batch
    function startBatch() {
        batchDepth++;
    }
    function endBatch() {
        if (batchDepth > 1) {
            batchDepth--;
            return;
        }
        let error;
        let hasError = false;
        while (batchedEffect !== undefined) {
            let effect = batchedEffect;
            batchedEffect = undefined;
            batchIteration++;
            while (effect !== undefined) {
                const next = effect._nextBatchedEffect;
                effect._nextBatchedEffect = undefined;
                effect._flags &= ~NOTIFIED;
                if (!(effect._flags & DISPOSED) && needsToRecompute(effect)) {
                    try {
                        effect._callback();
                    }
                    catch (err) {
                        if (!hasError) {
                            error = err;
                            hasError = true;
                        }
                    }
                }
                effect = next;
            }
        }
        batchIteration = 0;
        batchDepth--;
        if (hasError) {
            throw error;
        }
    }
    function batch(fn) {
        if (batchDepth > 0) {
            return fn();
        }
        /*@__INLINE__**/ startBatch();
        try {
            return fn();
        }
        finally {
            endBatch();
        }
    }
    // Currently evaluated computed or effect.
    let evalContext = undefined;
    function untracked(fn) {
        const prevContext = evalContext;
        evalContext = undefined;
        try {
            return fn();
        }
        finally {
            evalContext = prevContext;
        }
    }
    let batchedEffect = undefined;
    let batchDepth = 0;
    let batchIteration = 0;
    let globalVersion = 0;
    function addDependency(signal) {
        if (evalContext === undefined) {
            return undefined;
        }
        let node = signal._node;
        if (node === undefined || node._target !== evalContext) {
            node = {
                _version: 0,
                _source: signal,
                _prevSource: evalContext._sources,
                _nextSource: undefined,
                _target: evalContext,
                _prevTarget: undefined,
                _nextTarget: undefined,
                _rollbackNode: node,
            };
            if (evalContext._sources !== undefined) {
                evalContext._sources._nextSource = node;
            }
            evalContext._sources = node;
            signal._node = node;
            if (evalContext._flags & TRACKING) {
                signal._subscribe(node);
            }
            return node;
        }
        else if (node._version === -1) {
            node._version = 0;
            if (node._nextSource !== undefined) {
                node._nextSource._prevSource = node._prevSource;
                if (node._prevSource !== undefined) {
                    node._prevSource._nextSource = node._nextSource;
                }
                node._prevSource = evalContext._sources;
                node._nextSource = undefined;
                evalContext._sources._nextSource = node;
                evalContext._sources = node;
            }
            return node;
        }
        return undefined;
    }
    /** @internal */
    // @ts-ignore: "Cannot redeclare exported variable 'Signal'."
    function Signal(value, options) {
        this._value = value;
        this._version = 0;
        this._node = undefined;
        this._targets = undefined;
        this._watched = options?.watched;
        this._unwatched = options?.unwatched;
        this.name = options?.name;
    }
    Signal.prototype.brand = BRAND_SYMBOL;
    Signal.prototype._refresh = function () {
        return true;
    };
    Signal.prototype._subscribe = function (node) {
        const targets = this._targets;
        if (targets !== node && node._prevTarget === undefined) {
            node._nextTarget = targets;
            this._targets = node;
            if (targets !== undefined) {
                targets._prevTarget = node;
            }
            else {
                untracked(() => {
                    this._watched?.call(this);
                });
            }
        }
    };
    Signal.prototype._unsubscribe = function (node) {
        if (this._targets !== undefined) {
            const prev = node._prevTarget;
            const next = node._nextTarget;
            if (prev !== undefined) {
                prev._nextTarget = next;
                node._prevTarget = undefined;
            }
            if (next !== undefined) {
                next._prevTarget = prev;
                node._nextTarget = undefined;
            }
            if (node === this._targets) {
                this._targets = next;
                if (next === undefined) {
                    untracked(() => {
                        this._unwatched?.call(this);
                    });
                }
            }
        }
    };
    Signal.prototype.subscribe = function (fn) {
        return effect(() => {
            const value = this.value;
            const prevContext = evalContext;
            evalContext = undefined;
            try {
                fn(value);
            }
            finally {
                evalContext = prevContext;
            }
        }, { name: 'sub' });
    };
    Signal.prototype.valueOf = function () {
        return this.value;
    };
    Signal.prototype.toString = function () {
        return this.value + '';
    };
    Signal.prototype.toJSON = function () {
        return this.value;
    };
    Signal.prototype.peek = function () {
        const prevContext = evalContext;
        evalContext = undefined;
        try {
            return this.value;
        }
        finally {
            evalContext = prevContext;
        }
    };
    Object.defineProperty(Signal.prototype, 'value', {
        get() {
            const node = addDependency(this);
            if (node !== undefined) {
                node._version = this._version;
            }
            return this._value;
        },
        set(value) {
            if (value !== this._value) {
                if (batchIteration > 100) {
                    throw new Error('Cycle detected');
                }
                this._value = value;
                this._version++;
                globalVersion++;
                /**@__INLINE__*/ startBatch();
                try {
                    for (let node = this._targets; node !== undefined; node = node._nextTarget) {
                        node._target._notify();
                    }
                }
                finally {
                    endBatch();
                }
            }
        },
    });
    function signal(value, options) {
        return new Signal(value, options);
    }
    function needsToRecompute(target) {
        for (let node = target._sources; node !== undefined; node = node._nextSource) {
            if (node._source._version !== node._version ||
                !node._source._refresh() ||
                node._source._version !== node._version) {
                return true;
            }
        }
        return false;
    }
    function prepareSources(target) {
        for (let node = target._sources; node !== undefined; node = node._nextSource) {
            const rollbackNode = node._source._node;
            if (rollbackNode !== undefined) {
                node._rollbackNode = rollbackNode;
            }
            node._source._node = node;
            node._version = -1;
            if (node._nextSource === undefined) {
                target._sources = node;
                break;
            }
        }
    }
    function cleanupSources(target) {
        let node = target._sources;
        let head = undefined;
        while (node !== undefined) {
            const prev = node._prevSource;
            if (node._version === -1) {
                node._source._unsubscribe(node);
                if (prev !== undefined) {
                    prev._nextSource = node._nextSource;
                }
                if (node._nextSource !== undefined) {
                    node._nextSource._prevSource = prev;
                }
            }
            else {
                head = node;
            }
            node._source._node = node._rollbackNode;
            if (node._rollbackNode !== undefined) {
                node._rollbackNode = undefined;
            }
            node = prev;
        }
        target._sources = head;
    }
    /** @internal */
    function Computed(fn, options) {
        Signal.call(this, undefined);
        this._fn = fn;
        this._sources = undefined;
        this._globalVersion = globalVersion - 1;
        this._flags = OUTDATED;
        this._watched = options?.watched;
        this._unwatched = options?.unwatched;
        this.name = options?.name;
    }
    Computed.prototype = new Signal();
    Computed.prototype._refresh = function () {
        this._flags &= ~NOTIFIED;
        if (this._flags & RUNNING) {
            return false;
        }
        if ((this._flags & (OUTDATED | TRACKING)) === TRACKING) {
            return true;
        }
        this._flags &= ~OUTDATED;
        if (this._globalVersion === globalVersion) {
            return true;
        }
        this._globalVersion = globalVersion;
        this._flags |= RUNNING;
        if (this._version > 0 && !needsToRecompute(this)) {
            this._flags &= ~RUNNING;
            return true;
        }
        const prevContext = evalContext;
        try {
            prepareSources(this);
            evalContext = this;
            const value = this._fn();
            if (this._flags & HAS_ERROR || this._value !== value || this._version === 0) {
                this._value = value;
                this._flags &= ~HAS_ERROR;
                this._version++;
            }
        }
        catch (err) {
            this._value = err;
            this._flags |= HAS_ERROR;
            this._version++;
        }
        evalContext = prevContext;
        cleanupSources(this);
        this._flags &= ~RUNNING;
        return true;
    };
    Computed.prototype._subscribe = function (node) {
        if (this._targets === undefined) {
            this._flags |= OUTDATED | TRACKING;
            for (let node = this._sources; node !== undefined; node = node._nextSource) {
                node._source._subscribe(node);
            }
        }
        Signal.prototype._subscribe.call(this, node);
    };
    Computed.prototype._unsubscribe = function (node) {
        if (this._targets !== undefined) {
            Signal.prototype._unsubscribe.call(this, node);
            if (this._targets === undefined) {
                this._flags &= ~TRACKING;
                for (let node = this._sources; node !== undefined; node = node._nextSource) {
                    node._source._unsubscribe(node);
                }
            }
        }
    };
    Computed.prototype._notify = function () {
        if (!(this._flags & NOTIFIED)) {
            this._flags |= OUTDATED | NOTIFIED;
            for (let node = this._targets; node !== undefined; node = node._nextTarget) {
                node._target._notify();
            }
        }
    };
    Object.defineProperty(Computed.prototype, 'value', {
        get() {
            if (this._flags & RUNNING) {
                throw new Error('Cycle detected');
            }
            const node = addDependency(this);
            this._refresh();
            if (node !== undefined) {
                node._version = this._version;
            }
            if (this._flags & HAS_ERROR) {
                throw this._value;
            }
            return this._value;
        },
    });
    function computed(fn, options) {
        return new Computed(fn, options);
    }
    // Effect
    function cleanupEffect(effect) {
        const cleanup = effect._cleanup;
        effect._cleanup = undefined;
        if (typeof cleanup === 'function') {
            /*@__INLINE__**/ startBatch();
            const prevContext = evalContext;
            evalContext = undefined;
            try {
                cleanup();
            }
            catch (err) {
                effect._flags &= ~RUNNING;
                effect._flags |= DISPOSED;
                disposeEffect(effect);
                throw err;
            }
            finally {
                evalContext = prevContext;
                endBatch();
            }
        }
    }
    function disposeEffect(effect) {
        trackEffectDisposed(effect);
        for (let node = effect._sources; node !== undefined; node = node._nextSource) {
            node._source._unsubscribe(node);
        }
        effect._fn = undefined;
        effect._sources = undefined;
        cleanupEffect(effect);
    }
    function endEffect(prevContext) {
        if (evalContext !== this) {
            throw new Error('Out-of-order effect');
        }
        cleanupSources(this);
        evalContext = prevContext;
        this._flags &= ~RUNNING;
        if (this._flags & DISPOSED) {
            disposeEffect(this);
        }
        endBatch();
    }
    /** @internal */
    function Effect(fn, options) {
        this._fn = fn;
        this._cleanup = undefined;
        this._sources = undefined;
        this._nextBatchedEffect = undefined;
        this._flags = TRACKING;
        this._statsDisposed = false;
        this.name = options?.name;
        trackEffectCreated();
    }
    Effect.prototype._callback = function () {
        const finish = this._start();
        try {
            if (this._flags & DISPOSED)
                return;
            if (this._fn === undefined)
                return;
            const cleanup = this._fn();
            if (typeof cleanup === 'function') {
                this._cleanup = cleanup;
            }
        }
        finally {
            finish();
        }
    };
    Effect.prototype._start = function () {
        if (this._flags & RUNNING) {
            throw new Error('Cycle detected');
        }
        this._flags |= RUNNING;
        this._flags &= ~DISPOSED;
        cleanupEffect(this);
        prepareSources(this);
        /*@__INLINE__**/ startBatch();
        const prevContext = evalContext;
        evalContext = this;
        return endEffect.bind(this, prevContext);
    };
    Effect.prototype._notify = function () {
        if (!(this._flags & NOTIFIED)) {
            this._flags |= NOTIFIED;
            this._nextBatchedEffect = batchedEffect;
            batchedEffect = this;
        }
    };
    Effect.prototype._dispose = function () {
        this._flags |= DISPOSED;
        if (!(this._flags & RUNNING)) {
            disposeEffect(this);
        }
    };
    Effect.prototype.dispose = function () {
        this._dispose();
    };
    function effect(fn, options) {
        const effect = new Effect(fn, options);
        try {
            effect._callback();
        }
        catch (err) {
            effect._dispose();
            throw err;
        }
        const dispose = effect._dispose.bind(effect);
        // @ts-ignore
        dispose[Symbol.dispose] = dispose;
        return dispose;
    }

    // https://developer.mozilla.org/en-US/docs/Web/SVG/Element
    const SVG_TAGS = 'svg,animate,circle,clippath,cursor,image,defs,desc,ellipse,filter,font-face,' +
        'foreignobject,g,glyph,line,marker,mask,missing-glyph,path,pattern,' +
        'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view,' +
        'feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feFlood,feGaussianBlur,' +
        'feImage,feMerge,feMorphology,feOffset,feSpecularLighting,feTile,feTurbulence,feDistantLight,fePointLight,feSpotLight,' +
        'linearGradient,stop,radialGradient,' +
        'animateTransform,animateMotion';
    function makeMap(str) {
        const map = Object.create(null);
        const list = str.split(',');
        for (let i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return function (val) {
            return map[val];
        };
    }
    const isSVG = /*#__PURE__*/ makeMap(SVG_TAGS);
    const namespaceMap = {
        svg: 'http://www.w3.org/2000/svg',
        math: 'http://www.w3.org/1998/Math/MathML',
    };
    function getTagNamespace(tag) {
        if (isSVG(tag)) {
            return 'svg';
        }
        if (tag === 'math') {
            return 'math';
        }
        return undefined;
    }
    function createElementNS(namespace, tagName) {
        return document.createElementNS(namespaceMap[namespace], tagName);
    }
    const hasOwnProperty$1 = Object.prototype.hasOwnProperty;
    const hasOwn = (val, key) => hasOwnProperty$1.call(val, key);
    const isObject = (val) => val !== null && typeof val === 'object';
    const isUndef = (v) => v === undefined || v === null;
    const RUNTIME_FLAG_KEYS = {
        strictErrors: '__METTLE_STRICT_ERRORS__',
        compareFunctionProps: '__METTLE_COMPARE_FUNCTION_PROPS__',
        debugLifecycle: '__METTLE_DEBUG_LIFECYCLE__',
        componentPatchFirst: '__METTLE_COMPONENT_PATCH_FIRST__',
        debugRuntimeStats: '__METTLE_DEBUG_RUNTIME_STATS__',
    };
    function readRuntimeFlag(flagKey) {
        if (typeof globalThis === 'undefined')
            return false;
        return globalThis[flagKey] === true;
    }
    const RUNTIME_STATS_KEY = '__METTLE_RUNTIME_STATS__';
    function getRuntimeStats() {
        if (typeof globalThis === 'undefined')
            return null;
        if (!globalThis[RUNTIME_STATS_KEY]) {
            globalThis[RUNTIME_STATS_KEY] = Object.create(null);
        }
        return globalThis[RUNTIME_STATS_KEY];
    }
    function incRuntimeStat(name, step = 1) {
        if (!readRuntimeFlag(RUNTIME_FLAG_KEYS.debugRuntimeStats))
            return;
        const stats = getRuntimeStats();
        if (!stats)
            return;
        const current = typeof stats[name] === 'number' ? stats[name] : 0;
        stats[name] = current + step;
    }
    function trackEffectCreated() {
        incRuntimeStat('effect.created');
        incRuntimeStat('effect.active', 1);
    }
    function trackEffectDisposed(effect) {
        if (effect && effect._statsDisposed)
            return;
        if (effect) {
            effect._statsDisposed = true;
        }
        incRuntimeStat('effect.disposed');
        incRuntimeStat('effect.active', -1);
    }
    function getRuntimeStatsSnapshot() {
        const stats = getRuntimeStats();
        if (!stats)
            return {};
        return { ...stats };
    }
    function resetRuntimeStats() {
        if (typeof globalThis === 'undefined')
            return;
        globalThis[RUNTIME_STATS_KEY] = Object.create(null);
    }
    const checkSameVnode = (o, n) => o.tag === n.tag && o.key === n.key;
    const notTagComponent = (oNode, nNode) => typeof oNode.tag !== 'function' && typeof nNode.tag !== 'function';
    const isVnode = (vnode) => vnode != null && (typeof vnode === 'object' ? 'tag' in vnode : false);
    const isTextChildren = (children) => !isVnode(children) && !Array.isArray(children);
    const isEventPropKey = (key) => /^on[A-Z]/.test(key);
    const shouldCompareFunctionProps = () => readRuntimeFlag(RUNTIME_FLAG_KEYS.compareFunctionProps);
    const shouldUseComponentPatchFirst = () => {
        if (typeof globalThis === 'undefined')
            return true;
        // Default to patch-first for better update performance.
        // Only disable when explicitly set to false.
        return globalThis[RUNTIME_FLAG_KEYS.componentPatchFirst] !== false;
    };
    const shallowEqualObject = (a, b) => {
        if (a === b)
            return true;
        if (!isObject(a) || !isObject(b))
            return false;
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length)
            return false;
        for (let i = 0; i < aKeys.length; i++) {
            const key = aKeys[i];
            if (a[key] !== b[key])
                return false;
        }
        return true;
    };
    const hasChangedProps = (oldProps, newProps) => {
        const oldKeys = Object.keys(oldProps);
        const newKeys = Object.keys(newProps);
        if (oldKeys.length !== newKeys.length)
            return true;
        for (let i = 0; i < newKeys.length; i++) {
            const key = newKeys[i];
            const oldValue = oldProps[key];
            const newValue = newProps[key];
            // Event handlers are often recreated per render. Ignore by default.
            // Set globalThis.__METTLE_COMPARE_FUNCTION_PROPS__ = true to compare all functions.
            if (typeof oldValue === 'function' && typeof newValue === 'function') {
                if (!shouldCompareFunctionProps() && isEventPropKey(key)) {
                    continue;
                }
                if (oldValue !== newValue) {
                    return true;
                }
                continue;
            }
            // Avoid remount when style objects are structurally equal.
            if (key === 'style' && isObject(oldValue) && isObject(newValue)) {
                if (!shallowEqualObject(oldValue, newValue)) {
                    return true;
                }
                continue;
            }
            if (oldValue !== newValue) {
                return true;
            }
        }
        return false;
    };
    function warn(msg) {
        console.warn(`[Mettle.js warn]: ${msg}`);
    }
    function safeRemoveChild(parent, child, context = 'unknown') {
        incRuntimeStat('safeRemoveChild.call');
        if (!parent || !child) {
            incRuntimeStat('safeRemoveChild.fail.missing_node');
            warn(`[safeRemoveChild:${context}] parent or child is missing.`);
            if (readRuntimeFlag(RUNTIME_FLAG_KEYS.strictErrors)) {
                throw new TypeError(`[safeRemoveChild:${context}] parent or child is missing.`);
            }
            return false;
        }
        if (child.parentNode !== parent) {
            incRuntimeStat('safeRemoveChild.fail.parent_mismatch');
            warn(`[safeRemoveChild:${context}] child is not attached to parent.`);
            if (readRuntimeFlag(RUNTIME_FLAG_KEYS.strictErrors)) {
                throw new TypeError(`[safeRemoveChild:${context}] child is not attached to parent.`);
            }
            return false;
        }
        parent.removeChild(child);
        incRuntimeStat('safeRemoveChild.success');
        return true;
    }
    function safeInsertBefore(parent, child, anchor, context = 'unknown') {
        incRuntimeStat('safeInsertBefore.call');
        if (!parent || !child) {
            incRuntimeStat('safeInsertBefore.fail.missing_node');
            warn(`[safeInsertBefore:${context}] parent or child is missing.`);
            if (readRuntimeFlag(RUNTIME_FLAG_KEYS.strictErrors)) {
                throw new TypeError(`[safeInsertBefore:${context}] parent or child is missing.`);
            }
            return false;
        }
        const safeAnchor = anchor && anchor.parentNode === parent ? anchor : null;
        if (anchor && safeAnchor === null) {
            incRuntimeStat('safeInsertBefore.anchor_mismatch');
        }
        parent.insertBefore(child, safeAnchor);
        incRuntimeStat('safeInsertBefore.success');
        return true;
    }
    function getLifecycleTargetName(target) {
        if (!target)
            return 'unknown';
        if (typeof target === 'function')
            return target.name || 'anonymous-fn';
        if (target.tag && typeof target.tag === 'function')
            return target.tag.name || 'anonymous-component';
        if (target.tag && typeof target.tag === 'string')
            return target.tag;
        return 'unknown-target';
    }
    function debugLifecycle(message, payload) {
        if (!readRuntimeFlag(RUNTIME_FLAG_KEYS.debugLifecycle))
            return;
        // eslint-disable-next-line no-console
        console.log(`[Mettle.js lifecycle] ${message}`, payload);
    }
    function setStyleProp(el, nextStyle, prevStyle = null) {
        if (!isObject(nextStyle))
            return;
        const style = el.style;
        if (isObject(prevStyle)) {
            const prevKeys = Object.keys(prevStyle);
            for (let i = 0; i < prevKeys.length; i++) {
                const key = prevKeys[i];
                if (!hasOwn(nextStyle, key)) {
                    style[key] = '';
                }
            }
        }
        const nextKeys = Object.keys(nextStyle);
        for (let i = 0; i < nextKeys.length; i++) {
            const key = nextKeys[i];
            const nextValue = nextStyle[key];
            if (!isObject(prevStyle) || prevStyle[key] !== nextValue) {
                style[key] = nextValue;
            }
        }
    }
    function addEventListener(el, name, listener) {
        if (typeof listener !== 'function')
            return;
        const eventName = name.slice(2).toLowerCase();
        el.addEventListener(eventName, listener);
    }
    function removeEventListener(el, name, listener) {
        if (typeof listener !== 'function')
            return;
        const eventName = name.slice(2).toLowerCase();
        el.removeEventListener(eventName, listener);
    }
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    const BOOLEAN_ATTRS = new Set([
        'checked',
        'disabled',
        'readonly',
        'selected',
        'multiple',
        'hidden',
    ]);
    function setAttribute(el, key, value) {
        if (key === 'value') {
            // Keep input/textarea/select in sync with reactive state.
            const normalized = value == null ? '' : value;
            if (el.value !== normalized) {
                el.value = normalized;
            }
            el.setAttribute(key, normalized);
            return;
        }
        if (key === 'checked' || key === 'selected' || key === 'disabled' || key === 'readonly') {
            const boolValue = !!value;
            const propKey = key === 'readonly' ? 'readOnly' : key;
            el[propKey] = boolValue;
            boolValue ? el.setAttribute(key, '') : el.removeAttribute(key);
            return;
        }
        if (BOOLEAN_ATTRS.has(key)) {
            value ? el.setAttribute(key, '') : el.removeAttribute(key);
            return;
        }
        if (key.startsWith('xlink:')) {
            el.setAttributeNS(XLINK_NS, key, value);
            return;
        }
        el.setAttribute(key, value);
    }
    function removeAttribute(el, key) {
        if (key === 'value') {
            el.value = '';
        }
        if (key === 'checked' || key === 'selected' || key === 'disabled' || key === 'readonly') {
            const propKey = key === 'readonly' ? 'readOnly' : key;
            el[propKey] = false;
        }
        if (key.startsWith('xlink:')) {
            el.removeAttributeNS(XLINK_NS, key);
            return;
        }
        el.removeAttribute(key);
    }
    const CREATE_ELEMENT = document.createElement.bind(document);
    const CREATE_FRAGMENT = document.createDocumentFragment.bind(document);
    const CREATE_COMMENT = document.createComment.bind(document);
    function createNode(tag) {
        if (tag === 'fragment')
            return CREATE_FRAGMENT();
        if (tag === 'comment' || tag === 'null')
            return CREATE_COMMENT('');
        if (isSVG(tag))
            return createElementNS(getTagNamespace(tag), tag);
        return CREATE_ELEMENT(tag);
    }
    // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
    function getSequence(arr) {
        const p = arr.slice();
        const result = [0];
        let i, j, u, v, c;
        const len = arr.length;
        for (i = 0; i < len; i++) {
            const arrI = arr[i];
            if (arrI !== 0) {
                j = result[result.length - 1];
                if (arr[j] < arrI) {
                    p[i] = j;
                    result.push(i);
                    continue;
                }
                u = 0;
                v = result.length - 1;
                while (u < v) {
                    c = ((u + v) / 2) | 0;
                    if (arr[result[c]] < arrI) {
                        u = c + 1;
                    }
                    else {
                        v = c;
                    }
                }
                if (arrI < arr[result[u]]) {
                    if (u > 0) {
                        p[i] = result[u - 1];
                    }
                    result[u] = i;
                }
            }
        }
        u = result.length;
        v = result[u - 1];
        while (u-- > 0) {
            result[u] = v;
            v = p[v];
        }
        return result;
    }
    // Create el for the child elements of the element marked with $memo
    function memoCreateEl(oNode, nNode) {
        const oldChildren = oNode.children;
        const newChildren = nNode.children;
        const childrenArrType = Array.isArray(newChildren);
        if (childrenArrType) {
            for (let index = 0; index < newChildren.length; index++) {
                const newChild = newChildren[index];
                const oldChild = oldChildren[index];
                if (isVnode(newChild)) {
                    newChild.el = oldChild.el;
                    memoCreateEl(oldChild, newChild);
                }
            }
        }
        else if (isObject(newChildren)) {
            newChildren.el = oldChildren.el;
        }
    }
    // version
    const version = '1.8.1';
    // Flag
    const isFlag = /* @__PURE__ */ makeMap('$ref,$once,$memo');
    // Component
    let componentMap = new WeakMap();
    // DomInfo
    const domInfo = new WeakMap();
    // Memo
    let memoMap = new WeakMap();
    // Component effect disposer (target -> dispose fn)
    const effectDisposerMap = new WeakMap();
    // Lifecycle (target-scoped with fallback queues)
    const mountedHookMap = new WeakMap();
    const unMountedHookMap = new WeakMap();
    const activeLifecycleTargets = new Set();
    let mountHook = [];
    let unMountedHook = [];
    let lifecycleTargetContext = null;
    // Update text node
    function updateTextNode(val, el) {
        el.textContent = val;
    }
    function withLifecycleTarget(target, fn) {
        const prev = lifecycleTargetContext;
        lifecycleTargetContext = target;
        try {
            return fn();
        }
        finally {
            lifecycleTargetContext = prev;
        }
    }
    function bindEffectDisposer(target, dispose) {
        if (!target || typeof dispose !== 'function')
            return;
        const oldDispose = effectDisposerMap.get(target);
        if (typeof oldDispose === 'function' && oldDispose !== dispose) {
            oldDispose();
        }
        effectDisposerMap.set(target, dispose);
    }
    function disposeTargetEffect(target) {
        if (!target)
            return;
        const dispose = effectDisposerMap.get(target);
        if (typeof dispose === 'function') {
            dispose();
        }
        effectDisposerMap.delete(target);
    }
    function aliasComponentRuntimeState(oldTarget, newTarget) {
        if (!oldTarget || !newTarget || oldTarget === newTarget)
            return;
        const renderedTree = componentMap.get(oldTarget);
        if (renderedTree) {
            componentMap.set(newTarget, renderedTree);
        }
        const dispose = effectDisposerMap.get(oldTarget);
        if (typeof dispose === 'function') {
            effectDisposerMap.set(newTarget, dispose);
        }
        const mountedHooks = mountedHookMap.get(oldTarget);
        if (mountedHooks && mountedHooks.length > 0) {
            mountedHookMap.set(newTarget, mountedHooks);
        }
        const unmountedHooks = unMountedHookMap.get(oldTarget);
        if (unmountedHooks && unmountedHooks.length > 0) {
            unMountedHookMap.set(newTarget, unmountedHooks);
        }
    }
    function pushLifecycleHook(map, target, fn) {
        const list = map.get(target);
        if (list) {
            list.push(fn);
        }
        else {
            map.set(target, [fn]);
        }
    }
    function bindMounted(target = null) {
        if (target !== null && target !== undefined) {
            const hooks = mountedHookMap.get(target);
            if (hooks && hooks.length > 0) {
                debugLifecycle('run mounted hooks', {
                    target: getLifecycleTargetName(target),
                    count: hooks.length,
                });
                for (let i = 0, j = hooks.length; i < j; i++) {
                    hooks[i] && hooks[i]();
                }
                mountedHookMap.delete(target);
            }
            activeLifecycleTargets.add(target);
        }
        if (mountHook.length > 0) {
            for (let i = 0, j = mountHook.length; i < j; i++) {
                mountHook[i] && mountHook[i]();
            }
            mountHook = [];
        }
    }
    function bindUnmounted(target = null) {
        if (target !== null && target !== undefined) {
            disposeTargetEffect(target);
            const hooks = unMountedHookMap.get(target);
            if (hooks && hooks.length > 0) {
                debugLifecycle('run unmounted hooks', {
                    target: getLifecycleTargetName(target),
                    count: hooks.length,
                });
                for (let i = 0, j = hooks.length; i < j; i++) {
                    hooks[i] && hooks[i]();
                }
                unMountedHookMap.delete(target);
            }
            activeLifecycleTargets.delete(target);
            return;
        }
        const targets = Array.from(activeLifecycleTargets);
        for (let i = 0; i < targets.length; i++) {
            bindUnmounted(targets[i]);
        }
        if (unMountedHook.length > 0) {
            for (let i = 0, j = unMountedHook.length; i < j; i++) {
                unMountedHook[i] && unMountedHook[i]();
            }
            unMountedHook = [];
        }
    }
    function traverseUnmount(vnode) {
        if (!isVnode(vnode))
            return;
        if (typeof vnode.tag === 'function') {
            debugLifecycle('traverse component unmount', {
                target: getLifecycleTargetName(vnode),
            });
            const renderedTree = componentMap.get(vnode);
            bindUnmounted(vnode);
            if (renderedTree) {
                traverseUnmount(renderedTree);
            }
            return;
        }
        const children = vnode.children;
        if (Array.isArray(children)) {
            for (let i = 0; i < children.length; i++) {
                traverseUnmount(children[i]);
            }
        }
        else if (isVnode(children)) {
            traverseUnmount(children);
        }
    }
    // Convert virtual dom to real dom
    function mount(vnode, container, anchor) {
        const { tag, props, children } = vnode;
        if (isUndef(tag))
            return;
        // tag
        if (typeof tag === 'string') {
            const el = createNode(tag);
            vnode.el = el;
            // props
            if (!isUndef(props)) {
                const keys = Object.keys(props);
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index];
                    const propValue = props[key];
                    const propTypeObj = isObject(propValue);
                    if (key.startsWith('on')) {
                        addEventListener(el, key, propValue);
                    }
                    if (typeof propValue !== 'function' && key !== 'key' && !isFlag(key)) {
                        setAttribute(el, key, propValue);
                    }
                    if (key === 'style' && propTypeObj) {
                        setStyleProp(el, propValue);
                    }
                    // domInfo
                    if (key === '$ref' && propTypeObj) {
                        domInfo.set(propValue, el);
                    }
                }
            }
            // children
            if (!isUndef(children)) {
                if (isTextChildren(children)) {
                    if (el) {
                        updateTextNode(children, el);
                    }
                }
                else {
                    const childrenObjType = isObject(children);
                    if (Array.isArray(children)) {
                        for (let index = 0; index < children.length; index++) {
                            const child = children[index];
                            if (isVnode(child)) {
                                mount(child, el);
                            }
                        }
                    }
                    else if (childrenObjType) {
                        mount(children, el);
                    }
                }
            }
            if (anchor) {
                container.insertBefore(el, anchor);
            }
            else if (container) {
                container.appendChild(el);
            }
            else {
                return el;
            }
        }
        else if (typeof tag === 'function') {
            const template = withLifecycleTarget(vnode, () => tag.call(tag, props, tag, memo.bind(vnode)));
            const newTree = effectFn(template, vnode);
            componentMap.set(vnode, newTree);
            const childEl = mount(newTree, container, anchor);
            // Ensure component vnodes also expose a stable DOM anchor for keyed diff.
            vnode.el = newTree?.el || childEl;
            bindMounted(vnode);
            return vnode.el;
        }
    }
    // Diff
    function patch(oNode, nNode, memoFlag) {
        const oldProps = oNode.props || {};
        // $once
        if (hasOwn(oldProps, '$once')) {
            return;
        }
        if (!notTagComponent(oNode, nNode)) {
            // Keep component vnode DOM anchor across tree replacement.
            nNode.el = oNode.el;
            const parent = oNode.el?.parentNode;
            const anchor = oNode.el?.nextSibling;
            const sameComponent = checkSameVnode(oNode, nNode);
            const changedProps = hasChangedProps(oNode.props || {}, nNode.props || {});
            if (!sameComponent || changedProps) {
                if (sameComponent && shouldUseComponentPatchFirst()) {
                    try {
                        const oldRenderedTree = componentMap.get(oNode);
                        if (oldRenderedTree && typeof oNode.tag === 'function') {
                            const nextTemplate = withLifecycleTarget(oNode, () => oNode.tag.call(oNode.tag, nNode.props, oNode.tag, memo.bind(oNode)));
                            const nextRenderedTree = nextTemplate();
                            patch(oldRenderedTree, nextRenderedTree, memoFlag);
                            componentMap.set(oNode, nextRenderedTree);
                            aliasComponentRuntimeState(oNode, nNode);
                            nNode.el = nextRenderedTree.el || oNode.el;
                            debugLifecycle('component patch-first path', {
                                target: getLifecycleTargetName(oNode),
                            });
                            return;
                        }
                    }
                    catch (err) {
                        warn(err);
                        debugLifecycle('component patch-first fallback remount', {
                            target: getLifecycleTargetName(oNode),
                        });
                    }
                }
                if (parent && oNode.el) {
                    traverseUnmount(oNode);
                    safeRemoveChild(parent, oNode.el, 'patch-component-remount');
                    mount(nNode, parent, anchor);
                }
                return;
            }
            // Same component and props unchanged: keep runtime state addressable by new vnode.
            aliasComponentRuntimeState(oNode, nNode);
            return;
        }
        if (!checkSameVnode(oNode, nNode)) {
            const parent = oNode.el.parentNode;
            const anchor = oNode.el.nextSibling;
            traverseUnmount(oNode);
            safeRemoveChild(parent, oNode.el, 'patch-replace-node');
            mount(nNode, parent, anchor);
        }
        else {
            const el = (nNode.el = oNode.el);
            // props
            const oldProps = oNode.props || {};
            const newProps = nNode.props || {};
            const newKeys = Object.keys(newProps);
            const oldKeys = Object.keys(oldProps);
            for (let index = 0; index < newKeys.length; index++) {
                const key = newKeys[index];
                const newValue = newProps[key];
                const oldValue = oldProps[key];
                if (newValue === oldValue)
                    continue;
                if (isUndef(newValue)) {
                    if (typeof oldValue === 'function' && key.startsWith('on')) {
                        removeEventListener(el, key, oldValue);
                    }
                    removeAttribute(el, key);
                    continue;
                }
                const newObjType = isObject(newValue);
                const isFunc = typeof newValue === 'function';
                const isStyle = key === 'style';
                if (isFunc) {
                    // Event handlers should be compared by reference.
                    // toString()-based comparison may treat different closures as equal.
                    if (newValue !== oldValue) {
                        removeEventListener(el, key, oldValue);
                        addEventListener(el, key, newValue);
                    }
                    continue;
                }
                if (isStyle && newObjType) {
                    setStyleProp(el, newValue, isObject(oldValue) ? oldValue : null);
                    continue;
                }
                const isRegularAttr = key !== 'key' && !isFlag(key);
                if (isRegularAttr && !isFunc) {
                    setAttribute(el, key, newValue);
                }
            }
            for (let index = 0; index < oldKeys.length; index++) {
                const key = oldKeys[index];
                if (!hasOwn(newProps, key)) {
                    const oldValue = oldProps[key];
                    if (typeof oldValue === 'function' && key.startsWith('on')) {
                        removeEventListener(el, key, oldValue);
                        continue;
                    }
                    removeAttribute(el, key);
                }
            }
            // $memo
            if (hasOwn(oldProps, '$memo')) {
                const memo = oldProps.$memo;
                if (memoFlag === memo[1] && !memo[0]) {
                    memo[2] && memoCreateEl(oNode, nNode);
                    return;
                }
            }
            // children
            const oc = oNode.children;
            const nc = nNode.children;
            if (Array.isArray(oc) && Array.isArray(nc)) {
                patchKeyChildren(oc, nc, el, memoFlag);
            }
            else if (isVnode(oc) && isVnode(nc)) {
                patch(oc, nc, memoFlag);
            }
            else if (isTextChildren(oc) && isTextChildren(nc) && oc !== nc) {
                updateTextNode(nc, el);
            }
        }
    }
    // can be all-keyed or mixed
    function patchKeyChildren(n1, n2, parentElm, memoFlag) {
        const l2 = n2.length;
        let i = 0;
        let e1 = n1.length - 1;
        let e2 = l2 - 1;
        while (i <= e1 && i <= e2) {
            if (checkSameVnode(n1[i], n2[i])) {
                patch(n1[i], n2[i], memoFlag);
            }
            else {
                break;
            }
            i++;
        }
        while (i <= e1 && i <= e2) {
            if (checkSameVnode(n1[e1], n2[e2])) {
                patch(n1[e1], n2[e2], memoFlag);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? n2[nextPos].el : null;
                while (i <= e2) {
                    safeInsertBefore(parentElm, mount(n2[i]), anchor, 'patchKeyChildren-append');
                    i++;
                }
            }
        }
        else if (i > e2) {
            while (i <= e1) {
                traverseUnmount(n1[i]);
                safeRemoveChild(parentElm, n1[i].el, 'patchKeyChildren-trim-tail');
                i++;
            }
        }
        else {
            const s1 = i;
            const s2 = i;
            const keyToNewIndexMap = new Map();
            for (i = s2; i <= e2; i++) {
                const nextChild = n2[i];
                if (nextChild.key != null) {
                    keyToNewIndexMap.set(nextChild.key, i);
                }
            }
            let j;
            let patched = 0;
            const toBePatched = e2 - s2 + 1;
            let moved = false;
            let maxIndexSoFar = 0;
            const newIndexToOldIndexMap = new Array(toBePatched);
            for (i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            for (let i = s1; i <= e1; i++) {
                if (patched >= toBePatched) {
                    traverseUnmount(n1[i]);
                    safeRemoveChild(parentElm, n1[i].el, 'patchKeyChildren-overpatched');
                    continue;
                }
                let newIndex;
                if (n1[i].key != null) {
                    newIndex = keyToNewIndexMap.get(n1[i].key);
                }
                else {
                    for (j = s2; j <= e2; j++) {
                        if (newIndexToOldIndexMap[j - s2] === 0 && checkSameVnode(n1[i], n2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    traverseUnmount(n1[i]);
                    safeRemoveChild(parentElm, n1[i].el, 'patchKeyChildren-remove-missing');
                }
                else {
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    if (newIndex > maxIndexSoFar) {
                        maxIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    patch(n1[i], n2[newIndex], memoFlag);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const anchor = nextIndex + 1 < l2 ? n2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    safeInsertBefore(parentElm, mount(n2[nextIndex]), anchor, 'patchKeyChildren-insert-new');
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        safeInsertBefore(parentElm, n2[nextIndex].el, anchor, 'patchKeyChildren-move');
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    // Change data
    function setData(target, newTree, memoFlag) {
        try {
            const oldTree = componentMap.get(target);
            patch(oldTree, newTree, memoFlag);
            componentMap.set(target, newTree);
        }
        catch (err) {
            warn(err);
            if (readRuntimeFlag(RUNTIME_FLAG_KEYS.strictErrors)) {
                throw err;
            }
        }
    }
    // Memo
    function memo(fn, name) {
        memoMap.set(this, name);
        if (typeof fn === 'function') {
            fn();
        }
    }
    // Effect
    function effectFn(template, target) {
        let currentTree;
        let initialized = false;
        const dispose = effect(() => {
            target.template = template;
            const newTree = withLifecycleTarget(target, () => template());
            if (!initialized) {
                initialized = true;
                currentTree = newTree;
            }
            else {
                const memoFlag = memoMap.get(target);
                setData(target, newTree, memoFlag);
                if (memoMap.has(target)) {
                    memoMap.delete(target);
                }
                currentTree = newTree;
            }
        });
        bindEffectDisposer(target, dispose);
        return currentTree;
    }
    // Normalize Container
    function normalizeContainer(container) {
        if (typeof container === 'string') {
            const res = document.querySelector(container);
            if (!res) {
                let elem = null;
                if (container.startsWith('#')) {
                    elem = document.createElement('div');
                    elem.setAttribute('id', container.substring(1, container.length));
                }
                else if (container.startsWith('.')) {
                    elem = document.createElement('div');
                    elem.setAttribute('class', container.substring(1, container.length));
                }
                else {
                    warn(`Failed to mount app: mount target selector "${container}" returned null.`);
                }
                document.body.insertAdjacentElement('afterbegin', elem);
                return elem;
            }
            return res;
        }
        else if (container instanceof HTMLElement) {
            return container;
        }
        else if (window.ShadowRoot &&
            container instanceof window.ShadowRoot &&
            container.mode === 'closed') {
            warn('mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs.');
            return null;
        }
        else {
            return null;
        }
    }
    let _el = Object.create(null);
    // Create Mettle application
    function createApp(root, container) {
        const rootContent = root.tag;
        const template = withLifecycleTarget(root, () => rootContent.call(rootContent, root.props, rootContent, memo.bind(root)));
        const newTree = effectFn(template, root);
        const mountNodeEl = normalizeContainer(container);
        mount(newTree, mountNodeEl);
        componentMap.set(root, newTree);
        _el = mountNodeEl;
        bindMounted(root);
    }
    // onMounted
    function onMounted(fn = null) {
        if (fn === null)
            return;
        if (typeof fn !== 'function') {
            warn('The parameter of onMounted is not a function!');
            return;
        }
        if (lifecycleTargetContext !== null && lifecycleTargetContext !== undefined) {
            debugLifecycle('register mounted hook', {
                target: getLifecycleTargetName(lifecycleTargetContext),
            });
            pushLifecycleHook(mountedHookMap, lifecycleTargetContext, fn);
        }
        else {
            debugLifecycle('register mounted hook (fallback queue)', {});
            mountHook.push(fn);
        }
    }
    // onUnmounted
    function onUnmounted(fn = null) {
        if (fn === null)
            return;
        if (typeof fn !== 'function') {
            warn('The parameter of onUnmounted is not a function!');
            return;
        }
        if (lifecycleTargetContext !== null && lifecycleTargetContext !== undefined) {
            debugLifecycle('register unmounted hook', {
                target: getLifecycleTargetName(lifecycleTargetContext),
            });
            pushLifecycleHook(unMountedHookMap, lifecycleTargetContext, fn);
        }
        else {
            debugLifecycle('register unmounted hook (fallback queue)', {});
            unMountedHook.push(fn);
        }
    }
    // Reset view
    function resetView(view, routerContainer) {
        bindUnmounted();
        const routerContainerEl = routerContainer ? normalizeContainer(routerContainer) : _el;
        routerContainerEl.innerHTML = '';
        const template = withLifecycleTarget(view, () => view.call(view, view, memo.bind(view)));
        const newTree = effectFn(template, view);
        mount(newTree, routerContainerEl);
        componentMap.set(view, newTree);
        bindMounted(view);
    }

    exports.batch = batch;
    exports.computed = computed;
    exports.createApp = createApp;
    exports.domInfo = domInfo;
    exports.effect = effect;
    exports.getRuntimeStatsSnapshot = getRuntimeStatsSnapshot;
    exports.html = html;
    exports.onMounted = onMounted;
    exports.onUnmounted = onUnmounted;
    exports.resetRuntimeStats = resetRuntimeStats;
    exports.resetView = resetView;
    exports.signal = signal;
    exports.trackEffectCreated = trackEffectCreated;
    exports.trackEffectDisposed = trackEffectDisposed;
    exports.untracked = untracked;
    exports.version = version;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
