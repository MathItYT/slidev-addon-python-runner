# slidev-addon-python-runner

Python runner for the [Monaco Runner feature](https://sli.dev/features/monaco-run) in [Slidev](https://sli.dev/). Code executed in browser using [Pyodide](https://pyodide.org/).

![Demo](https://cdn.jsdelivr.net/gh/KermanX/slidev-addon-python-runner/assets/demo.png)

## Usage

Firstly, install the package:

```bash
npm install slidev-addon-python-runner
```

Then, add it as an addon in your headmatter in `slides.md`:

```md
---
addons:
  - slidev-addon-python-runner

# Optional configuration for this runner
python:
  # Install packages from PyPI. Default: []
  installs: ["cowsay"]

  # Code executed to set up the environment. Default: ""
  prelude: |
    GREETING_FROM_PRELUDE = "Hello, Slidev!"

  # Automatically load the imported builtin packages. Default: true
  loadPackagesFromImports: true

  # Disable annoying warning from `pandas`. Default: true
  suppressDeprecationWarnings: true

  # Always reload the Python environment when the code changes. Default: false
  alwaysReload: false

  # Options passed to `loadPyodide`. Default: {}
  loadPyodideOptions: {}
---
```

To add an interactive Python code runner, use the `monaco-run` directive:

````md
```python {monaco-run}
from termcolor import colored

print(colored("Hello, Slidev!", "blue"))
```
````

## Bundle `pyodide`

By default, when building slides (i.e. `slidev build`), the `pyodide` package will be replaced with the CDN version. This is because of https://github.com/pyodide/pyodide/issues/1949, which causes the imported python packages to be lost when using the bundled version.

To bundle the local version of `pyodide`, set the `PYODIDE_BUNDLE` environment variable to `true`. Note that in this way you can't import python packages in the static build.
