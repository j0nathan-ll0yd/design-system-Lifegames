// Builds the Ajv registration key for a schema: `urn:<namespace>:<name>`.
// The name is a schema title or a file stem, so it can hold any character. A
// title such as "PinnedRepos Widget" is not a valid URN NSS (RFC 8141): Ajv
// resolves every key through fast-uri, which truncated it at the space up to
// 3.1.5 and throws "URN without nid cannot be serialized" from 3.1.6. Percent-
// encoding the name makes the key a valid URN for every title. Every addSchema
// and getSchema site builds its key here, so registration and lookup agree.
export function schemaUrn(namespace, name) {
  return `urn:${namespace}:${encodeURIComponent(name)}`
}
