Do not edit CSS files.
Use Tailwind CSS for styling.
Always use `bun` for dependency installation and package scripts.
Never run `tsc` directly for type checking; use `bun typecheck`.
Exception: when interacting with QMD, it is okay to spawn Node 25 directly.
ALWAYS run `bun typecheck && bun check` after making any changes.