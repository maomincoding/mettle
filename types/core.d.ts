declare const version: string;
declare const domInfo: WeakMap<object, any>;
declare function setData(content?: any, memoFlag?: symbol): Promise<void>;
declare function createApp(root: any, container: string): void;
declare function onMounted(fn?: any): void;
declare function onUnmounted(fn?: any): void;
declare function resetView(view: any): void;
export { version, createApp, setData, domInfo, onMounted, onUnmounted, resetView };
