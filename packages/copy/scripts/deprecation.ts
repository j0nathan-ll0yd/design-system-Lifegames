// Deprecated copy keys (DEPRECATION.md, "Copy keys").
//
// A key is deprecated in its RICH schema: the leaf's `$ref` node carries
// `deprecated: true` and a `description` that names the replacement as
// "use `<namespace>.<path>` instead", or states "no replacement". The build
// carries both annotations into the flat schema, so the TS type gains an
// `@deprecated` JSDoc, the Zod schema a `.describe()` and the flat schema the
// `deprecated` keyword. The build throws on any problem deprecationProblems
// returns: a deprecation that names no live replacement is a policy violation.

type JsonSchema = Record<string, any>

export interface DeprecatedKey {
  /** The full key, `<namespace>.<path>`. */
  key: string
  /** The replacement key, or null when the description states there is none. */
  replacedBy: string | null
}

const REPLACED_BY_RE = /use `([\w.]+)` instead/
const NO_REPLACEMENT_RE = /\bno replacement\b/i

interface Leaf {
  key: string
  deprecated: boolean
  description: string | undefined
}

/** Every leaf (`$ref` node) of a rich schema, keyed `<namespace>.<path>`. */
function leaves(node: JsonSchema, path: string, out: Leaf[]): Leaf[] {
  if (node && typeof node.$ref === 'string') {
    out.push({key: path, deprecated: node.deprecated === true, description: node.description})
    return out
  }
  for (const [k, sub] of Object.entries((node?.properties ?? {}) as Record<string, JsonSchema>)) {
    leaves(sub, `${path}.${k}`, out)
  }
  return out
}

/** The deprecated keys of one namespace's rich schema, with their replacements. */
export function deprecatedKeys(schema: JsonSchema, namespace: string): DeprecatedKey[] {
  return leaves(schema, namespace, []).filter((l) => l.deprecated).map((l) => ({
    key: l.key,
    replacedBy: REPLACED_BY_RE.exec(l.description ?? '')?.[1] ?? null
  }))
}

/** Every policy violation among one namespace's deprecated keys, as a readable line. */
export function deprecationProblems(schema: JsonSchema, namespace: string): string[] {
  const all = leaves(schema, namespace, [])
  const byKey = new Map(all.map((l) => [l.key, l]))
  const problems: string[] = []
  for (const l of all.filter((x) => x.deprecated)) {
    const replacement = REPLACED_BY_RE.exec(l.description ?? '')?.[1]
    if (replacement) {
      const target = byKey.get(replacement)
      if (!target) {
        problems.push(`${l.key}: replacement ${replacement} names no leaf in ${namespace}`)
      } else if (target.deprecated) {
        problems.push(`${l.key}: replacement ${replacement} is itself deprecated`)
      }
    } else if (!NO_REPLACEMENT_RE.test(l.description ?? '')) {
      problems.push(`${l.key}: deprecated with no description; name the replacement (use \`<key>\` instead) or state "no replacement"`)
    }
  }
  return problems
}
