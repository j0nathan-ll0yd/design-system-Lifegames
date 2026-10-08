// Swift name-shadowing guard for the copy build (atlas decision 0160).
//
// Every design-system Swift module that imports LifegamesCopy also imports the
// other design-system modules. A copy struct named like one of their public
// types makes every such name ambiguous: widgets.widgetState once generated
// `WidgetState`, which shadowed LifegamesComponents.WidgetState<T> and broke
// `swift build`. The reserved set is DERIVED from the public declarations in
// Sources/* (every module except LifegamesCopy itself), never hand-listed.
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'

const PUBLIC_TYPE_RE =
  /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:public|open)\s+(?:final\s+|indirect\s+)*(?:struct|enum|class|protocol|actor|typealias)\s+([A-Z][A-Za-z0-9_]*)/gm

function swiftFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? swiftFiles(path) : name.endsWith('.swift') ? [path] : []
  })
}

/** Public Swift type names declared in Sources/* outside LifegamesCopy, with their module. */
export function designSystemPublicSwiftTypes(sourcesRoot: string): Map<string, string> {
  const types = new Map<string, string>()
  for (const module of readdirSync(sourcesRoot)) {
    const dir = join(sourcesRoot, module)
    if (module === 'LifegamesCopy' || !statSync(dir).isDirectory()) {
      continue
    }
    for (const file of swiftFiles(dir)) {
      for (const m of readFileSync(file, 'utf-8').matchAll(PUBLIC_TYPE_RE)) {
        types.set(m[1]!, module)
      }
    }
  }
  return types
}

/** Copy struct names that shadow a public design-system Swift type. */
export function swiftShadowClashes(
  copyStructs: readonly {name: string; namespace: string}[],
  reserved: ReadonlyMap<string, string>
): {name: string; namespace: string; module: string}[] {
  return copyStructs.filter((s) => reserved.has(s.name)).map((s) => ({...s, module: reserved.get(s.name)!}))
}
