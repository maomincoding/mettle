/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */
const Fragment = 'fragment';
function jsx(tag, props, key) {
    return JSXNodeFactory.createNode(tag, props, key);
}
const jsxs = jsx;
const JSXNodeFactory = {
    createNode(tag, props, key) {
        const { children, ...newProps } = props;
        return {
            tag,
            props: newProps,
            children,
            key,
        };
    },
};
const jsxDEV = jsx;
export { jsx, jsxs, Fragment, jsxDEV };
