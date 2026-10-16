// Deprecated copy keys (DEPRECATION.md, "Copy Keys").
//
// A key is deprecated in its RICH schema: the leaf's `$ref` node carries
// `deprecated: true` and a `description` that starts "Deprecated: use
// `<namespace>.<path>` instead." or "Deprecated: no replacement.". The build
// carries both annotations into the flat schema, so the TS type gains an
// `@deprecated` JSDoc, the Zod schema a `.describe()`, the Swift property a doc
// comment and the flat schema the `deprecated` keyword. The build exits 1 on any
// problem deprecationProblems returns.
//
// Only a scalar leaf (string or string list) can be deprecated. An object-valued
// leaf (CopyLink) is hoisted behind a `$ref` in the flat schema, where Zod and
// Swift codegen drop a sibling annotation, so the deprecation would not reach
// every artifact. A group cannot be deprecated: deprecate its leaves.

type JsonSchema = Record<string, any>

const REPLACED_BY_RE = /^Deprecated: use `([\w.]+)` instead\./
const NO_REPLACEMENT_RE = /^Deprecated: no replacement\./
const LEAF_REF_RE = /^#\/\$defs\/(\w+)$/

interface Node {
  key: string
  leaf: boolean
  /** The `value` type of the leaf's `$def`, or null for a group. */
  valueType: string | null
  deprecated: unknown
  description: string | undefined
}

/** Every node (group or leaf) of a rich schema below its root, keyed `<namespace>.<path>`. */
function nodes(schema: JsonSchema, node: JsonSchema, path: string, out: Node[]): Node[] {
  for (const [k, sub] of Object.entries((node?.properties ?? {}) as Record<string, JsonSchema>)) {
    const key = `${path}.${k}`
    if (typeof sub.$ref === 'string') {
      const def = LEAF_REF_RE.exec(sub.$ref)?.[1]
      const valueType = (def && schema.$defs?.[def]?.properties?.value?.type) ?? null
      out.push({key, leaf: true, valueType, deprecated: sub.deprecated, description: sub.description})
    } else {
      out.push({key, leaf: false, valueType: null, deprecated: sub.deprecated, description: sub.description})
      nodes(schema, sub, key, out)
    }
  }
  return out
}

/** Every policy violation among one namespace's deprecation annotations, as a readable line. */
export function deprecationProblems(schema: JsonSchema, namespace: string): string[] {
  const all = nodes(schema, schema, namespace, [])
  const leaves = new Map(all.filter((n) => n.leaf).map((n) => [n.key, n]))
  const problems: string[] = []
  for (const n of all.filter((x) => x.deprecated !== undefined)) {
    if (n.deprecated !== true) {
      problems.push(`${n.key}: deprecated must be the boolean true, not ${JSON.stringify(n.deprecated)}`)
      continue
    }
    if (!n.leaf) {
      problems.push(`${n.key}: a group cannot be deprecated; deprecate each of its leaves`)
      continue
    }
    if (n.valueType === 'object') {
      problems.push(`${n.key}: an object-valued leaf cannot be deprecated; its flat $ref drops the annotation in Zod and Swift`)
      continue
    }
    const replacement = REPLACED_BY_RE.exec(n.description ?? '')?.[1]
    if (replacement) {
      const target = leaves.get(replacement)
      if (!target) {
        problems.push(`${n.key}: replacement ${replacement} names no leaf in ${namespace}`)
      } else if (target.deprecated === true) {
        problems.push(`${n.key}: replacement ${replacement} is itself deprecated`)
      }
    } else if (!NO_REPLACEMENT_RE.test(n.description ?? '')) {
      problems.push(`${n.key}: the description must start "Deprecated: use \`<key>\` instead." or "Deprecated: no replacement."`)
    }
  }
  return problems
}
