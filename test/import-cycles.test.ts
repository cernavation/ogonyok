import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Статический анализ графа импортов и отсутствие циклических зависимостей', () => {
  const libDir = path.resolve(process.cwd(), 'lib/ogonek')

  function getTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...getTsFiles(fullPath))
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
    return files
  }

  function parseImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8')
    const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g
    const imports: string[] = []
    let match: RegExpExecArray | null

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1])
    }
    return imports
  }

  function buildDependencyGraph(files: string[]): Map<string, string[]> {
    const graph = new Map<string, string[]>()

    for (const file of files) {
      const dir = path.dirname(file)
      const importedRel = parseImports(file)
      const resolvedList: string[] = []

      for (const rel of importedRel) {
        let candidate = path.resolve(dir, rel)
        if (!fs.existsSync(candidate)) {
          if (fs.existsSync(candidate + '.ts')) candidate += '.ts'
          else if (fs.existsSync(candidate + '.tsx')) candidate += '.tsx'
          else if (fs.existsSync(path.join(candidate, 'index.ts'))) candidate = path.join(candidate, 'index.ts')
        }
        if (fs.existsSync(candidate) && candidate.startsWith(libDir)) {
          resolvedList.push(candidate)
        }
      }
      graph.set(file, resolvedList)
    }

    return graph
  }

  it('директория lib/ogonek содержит валидные TypeScript модули', () => {
    const files = getTsFiles(libDir)
    assert.ok(files.length > 10, 'Ожидается наличие основных модулей Огонька')
  })

  it('граф зависимостей lib/ogonek не содержит прямых взаимных циклов A -> B -> A', () => {
    const files = getTsFiles(libDir)
    const graph = buildDependencyGraph(files)

    for (const [node, neighbors] of graph.entries()) {
      for (const neighbor of neighbors) {
        const reciprocal = graph.get(neighbor) || []
        const isSelf = node === neighbor
        const hasMutual = reciprocal.includes(node)

        assert.equal(
          isSelf,
          false,
          `Обнаружен циклический импорт файла самого в себя: ${path.basename(node)}`
        )
        assert.equal(
          hasMutual,
          false,
          `Обнаружен взаимный цикл импортов между ${path.basename(node)} и ${path.basename(neighbor)}`
        )
      }
    }
  })

  it('в графе зависимостей lib/ogonek полностью отсутствуют циклы любой длины (DAG)', () => {
    const files = getTsFiles(libDir)
    const graph = buildDependencyGraph(files)

    const visited = new Set<string>()
    const inStack = new Set<string>()
    let cycleFound: string[] | null = null

    function dfs(node: string, pathStack: string[]): boolean {
      visited.add(node)
      inStack.add(node)
      pathStack.push(node)

      const neighbors = graph.get(node) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, pathStack)) return true
        } else if (inStack.has(neighbor)) {
          cycleFound = [...pathStack, neighbor]
          return true
        }
      }

      inStack.delete(node)
      pathStack.pop()
      return false
    }

    for (const file of files) {
      if (!visited.has(file)) {
        if (dfs(file, [])) break
      }
    }

    const cycleMsg = cycleFound ? (cycleFound as string[]).map((f) => path.basename(f)).join(' -> ') : 'нет'
    assert.equal(
      cycleFound,
      null,
      `Обнаружен цикл в импортах: ${cycleMsg}`
    )
  })

  it('модуль types.ts является чистым листовым узлом и не импортирует store или компоненты', () => {
    const typesPath = path.join(libDir, 'types.ts')
    if (fs.existsSync(typesPath)) {
      const content = fs.readFileSync(typesPath, 'utf-8')
      assert.ok(!content.includes('use-ogonek-store'))
      assert.ok(!content.includes('@/components/'))
      assert.ok(!content.includes('useState'))
    }
  })

  it('модуль scores.ts является чистым модулем без внешних побочных эффектов', () => {
    const scoresPath = path.join(libDir, 'scores.ts')
    assert.ok(fs.existsSync(scoresPath))
    const content = fs.readFileSync(scoresPath, 'utf-8')
    assert.ok(!content.includes('use-ogonek-store'))
    assert.ok(!content.includes('@/components/'))
  })

  it('модуль initials.ts не зависит от React и состояния приложения', () => {
    const initialsPath = path.join(libDir, 'initials.ts')
    assert.ok(fs.existsSync(initialsPath))
    const content = fs.readFileSync(initialsPath, 'utf-8')
    assert.ok(!content.includes('useOgonekStore'))
    assert.ok(!content.includes('useState'))
  })

  it('модуль sound.ts не импортирует компоненты UI', () => {
    const soundPath = path.join(libDir, 'sound.ts')
    assert.ok(fs.existsSync(soundPath))
    const content = fs.readFileSync(soundPath, 'utf-8')
    assert.ok(!content.includes('@/components/'))
  })

  it('модуль visibility.ts не импортирует хранилище приложения', () => {
    const visPath = path.join(libDir, 'visibility.ts')
    assert.ok(fs.existsSync(visPath))
    const content = fs.readFileSync(visPath, 'utf-8')
    assert.ok(!content.includes('use-ogonek-store'))
  })

  it('модуль feed-memo.ts изолирован от рендеринга и содержит только чистые компараторы', () => {
    const memoPath = path.join(libDir, 'feed-memo.ts')
    assert.ok(fs.existsSync(memoPath))
    const content = fs.readFileSync(memoPath, 'utf-8')
    assert.ok(!content.includes('jsx'))
    assert.ok(!content.includes('tsx'))
    assert.ok(!content.includes('render'))
  })

  it('все относительные импорты в lib/ogonek успешно разрешаются в существующие файлы', () => {
    const files = getTsFiles(libDir)
    for (const file of files) {
      const dir = path.dirname(file)
      const relImports = parseImports(file)

      for (const rel of relImports) {
        let candidate = path.resolve(dir, rel)
        if (!fs.existsSync(candidate)) {
          if (fs.existsSync(candidate + '.ts')) candidate += '.ts'
          else if (fs.existsSync(candidate + '.tsx')) candidate += '.tsx'
          else if (fs.existsSync(path.join(candidate, 'index.ts'))) candidate = path.join(candidate, 'index.ts')
        }
        assert.ok(
          fs.existsSync(candidate),
          `Битый импорт "${rel}" в файле ${path.basename(file)}`
        )
      }
    }
  })
})
