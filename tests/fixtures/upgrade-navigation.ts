export function redirect(path: string): never { throw new Error(`REDIRECT:${path}`); }
export function useRouter() { return { refresh() {} }; }
