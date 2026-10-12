// Type declaration for the plain-.mjs helper so validate.ts consumes it with
// proper types instead of implicit `any`.
export function schemaUrn(namespace: 'authored' | 'generated' | 'vendored', name: string): string
