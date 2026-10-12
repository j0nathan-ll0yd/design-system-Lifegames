// Swift name-shadowing guard for the copy build (atlas decision 0160).
//
// A copy struct named like a type that Swift code beside it names makes that
// name ambiguous: widgets.widgetState once generated `WidgetState`, which
// shadowed LifegamesComponents.WidgetState<T>, and a group titled `Color`
// would shadow SwiftUI's Color in every view that imports LifegamesCopy. Both
// break `swift build`. The reserved set is DERIVED from Sources/*, never
// hand-listed:
//   - every public type declared in a module other than LifegamesCopy;
//   - every type identifier referenced unqualified (framework types such as
//     Color, Text, View, Image and Font included) in a module that can see
//     LifegamesCopy, read from the target graph in Package.swift.
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'

const COPY_MODULE = 'LifegamesCopy'

const PUBLIC_TYPE_RE =
  /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:public|open)\s+(?:final\s+|indirect\s+)*(?:struct|enum|class|protocol|actor|typealias)\s+([A-Z][A-Za-z0-9_]*)/gm

// An identifier that starts upper-case and is not a member after `.`: in Swift
// that is a type (or a generic parameter, which is harmless to reserve).
const UNQUALIFIED_TYPE_RE = /(?<![.\w$])([A-Z][A-Za-z0-9_]*)\b/g

function swiftFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? swiftFiles(path) : name.endsWith('.swift') ? [path] : []
  })
}

function moduleDirs(sourcesRoot: string): string[] {
  return readdirSync(sourcesRoot).filter((m) => statSync(join(sourcesRoot, m)).isDirectory())
}

/** Swift source without comments and string literals: words in them name no type. */
export function stripSwiftCommentsAndStrings(source: string): string {
  return source.replace(/"""[\s\S]*?"""/g, '""').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ').replace(/"(?:\\.|[^"\\\n])*"/g, '""')
}

/** Public Swift type names declared in Sources/* outside LifegamesCopy, with their module. */
export function designSystemPublicSwiftTypes(sourcesRoot: string): Map<string, string> {
  const types = new Map<string, string>()
  for (const module of moduleDirs(sourcesRoot)) {
    if (module === COPY_MODULE) {
      continue
    }
    for (const file of swiftFiles(join(sourcesRoot, module))) {
      for (const m of readFileSync(file, 'utf-8').matchAll(PUBLIC_TYPE_RE)) {
        types.set(m[1]!, module)
      }
    }
  }
  return types
}

/**
 * The library targets that can see LifegamesCopy: those whose dependency
 * closure in Package.swift contains it. Only string-named target dependencies
 * are read; a product dependency from another package never reaches the copy.
 */
export function copyVisibleModules(packageSwift: string): Set<string> {
  const deps = new Map<string, string[]>()
  const targetRe = /\.target\(\s*name:\s*"([^"]+)"([\s\S]*?)(?=\.(?:target|testTarget|executableTarget)\(|\]\s*\)\s*$)/g
  for (const m of packageSwift.matchAll(targetRe)) {
    const list = /dependencies:\s*\[([\s\S]*?)\]/.exec(m[2] ?? '')
    deps.set(m[1]!, list ? [...list[1]!.matchAll(/"([^"]+)"/g)].map((d) => d[1]!) : [])
  }
  if (!deps.has(COPY_MODULE)) {
    throw new Error(`swift-shadow: Package.swift declares no ${COPY_MODULE} target; the target graph did not parse`)
  }
  const sees = (target: string, seen: Set<string> = new Set()): boolean => {
    if (seen.has(target)) {
      return false
    }
    seen.add(target)
    return (deps.get(target) ?? []).some((d) => d === COPY_MODULE || sees(d, seen))
  }
  return new Set([...deps.keys()].filter((t) => t !== COPY_MODULE && sees(t)))
}

/** Type identifiers referenced unqualified in the given modules, with the first module and file naming each. */
export function referencedSwiftTypeIdentifiers(sourcesRoot: string, modules: ReadonlySet<string>): Map<string, string> {
  const names = new Map<string, string>()
  for (const module of moduleDirs(sourcesRoot).filter((m) => modules.has(m)).sort()) {
    for (const file of swiftFiles(join(sourcesRoot, module)).sort()) {
      const code = stripSwiftCommentsAndStrings(readFileSync(file, 'utf-8'))
      for (const m of code.matchAll(UNQUALIFIED_TYPE_RE)) {
        if (!names.has(m[1]!)) {
          names.set(m[1]!, `${module} (${file.slice(join(sourcesRoot, module).length + 1)})`)
        }
      }
    }
  }
  return names
}

/**
 * Every Swift name a copy struct must not take, with where it comes from:
 * the public types declared in Sources/*, then the type identifiers referenced
 * unqualified in the modules that can see LifegamesCopy.
 */
export function reservedSwiftNames(sourcesRoot: string, packageSwiftPath: string): Map<string, string> {
  const reserved = new Map<string, string>()
  for (const [name, module] of designSystemPublicSwiftTypes(sourcesRoot)) {
    reserved.set(name, `the public type ${module}.${name}`)
  }
  const visible = copyVisibleModules(readFileSync(packageSwiftPath, 'utf-8'))
  for (const [name, where] of referencedSwiftTypeIdentifiers(sourcesRoot, visible)) {
    if (!reserved.has(name)) {
      reserved.set(name, `the type ${name} referenced unqualified in ${where}`)
    }
  }
  return reserved
}

/** Copy struct names that shadow a reserved Swift name, with the reason. */
export function swiftShadowClashes(
  copyStructs: readonly {name: string; namespace: string}[],
  reserved: ReadonlyMap<string, string>
): {name: string; namespace: string; reason: string}[] {
  return copyStructs.filter((s) => reserved.has(s.name)).map((s) => ({...s, reason: reserved.get(s.name)!}))
}
