// SSR + prerender for content pages so search engines see real HTML.
// The editor route at / overrides ssr=false in src/routes/+layout.js
// because it depends on browser-only APIs.
export const ssr = true;
export const prerender = true;
