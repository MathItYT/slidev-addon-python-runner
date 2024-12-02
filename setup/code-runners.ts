import { CodeRunnerOutput, defineCodeRunnersSetup } from '@slidev/types'
import { loadPyodide, PyodideInterface } from 'pyodide'
import { ref } from 'vue'
import { useNav } from '@slidev/client'

let pyodideCache: PyodideInterface | null = null
let pyodideOptionCache = "{}"
async function setupPyodide(options = {}, code) {
  const {
    installs = [],
    prelude = "",
    loadPackagesFromImports = true,
    suppressDeprecationWarnings = true,
    alwaysReload = false,
    loadOptions = {},
  } = options as any

  if (alwaysReload || pyodideOptionCache !== JSON.stringify(options)) {
    pyodideCache = null
    pyodideOptionCache = JSON.stringify(options)
  }

  if (pyodideCache) {
    if (loadPackagesFromImports) {
      await pyodideCache.loadPackagesFromImports(code)
    }
    return pyodideCache
  }

  pyodideCache = await loadPyodide(loadOptions);

  if (prelude) {
    if (loadPackagesFromImports) {
      await pyodideCache.loadPackagesFromImports(prelude)
    }
    await pyodideCache.runPythonAsync(prelude)
  }

  // Pandas always throws a DeprecationWarning
  if (suppressDeprecationWarnings)
    await pyodideCache.runPythonAsync(`
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning) 
`)

  if (installs.length) {
    await pyodideCache.loadPackage('micropip')
    await pyodideCache.runPythonAsync([
      'import micropip',
      'await micropip.install(' + JSON.stringify(installs) + ')',
    ].join('\n'))
  }

  if (loadPackagesFromImports) {
    await pyodideCache.loadPackagesFromImports(code)
  }

  return pyodideCache
}

export default defineCodeRunnersSetup(() => {
  const { slides } = useNav()
  async function run(code: string) {
    // @ts-expect-error
    const pyodide = await setupPyodide(slides.value[0].meta.slide.frontmatter?.python, code)
    const texts = ref([''])
    const extras = ref<CodeRunnerOutput[]>([])
    const decoder = new TextDecoder('utf-8');
    function write(buffer: Uint8Array) {
      const text = decoder.decode(buffer)
      for (const line of text.split('\n')) {
        texts.value[texts.value.length - 1] += line
        texts.value.push('')
      }
      return buffer.length
    }
    pyodide.setStdout({
      write: write,
      isatty: true,
    })
    pyodide.setStderr({
      write: write,
      isatty: true,
    })
    pyodide.runPythonAsync(code).catch(err => {
      console.error(err)
      const str = err.toString()
      const matchNotFoundError = str.match(/ModuleNotFoundError: No module named '(.*)'/)
      if (matchNotFoundError) {
        extras.value.push({
          html: [
            `<div class="text-red">${matchNotFoundError[0]}</div>`,
            `<div class="text-blue">Tip: This may because of this package is not a <a href="https://pyodide.org/en/stable/usage/packages-in-pyodide.html">Pyodide builtin package</a>.`,
            "<br>You may need to install it by adding the package name to the `python.installs` array in your headmatter.",
            `</div>`
          ].join('')
        })
      } else {
        for (const line of str.split('\n')) {
          extras.value.push({
            text: line,
            class: 'text-red'
          })
        }
      }
    });
    return () => [
      ...texts.value.map(text => ({ text, highlightLang: 'ansi' })),
      ...extras.value,
    ]
  }
  return {
    python: run,
    py: run,
  }
})
