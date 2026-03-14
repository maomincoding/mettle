export { JSX } from './jsx';
/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */
declare const Fragment = 'fragment';
declare function jsx(
  tag: any,
  props: any,
  key: any,
): {
  tag: any;
  props: any;
  children: any;
  key: any;
};
declare const jsxs: typeof jsx;
declare const jsxDEV: typeof jsx;
export { jsx, jsxs, Fragment, jsxDEV };
