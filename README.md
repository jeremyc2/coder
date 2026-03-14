# Vault

Not sure exactly what this is yet.

## Ideas

- Development environment
- Knowledge base
- Why not both?

## Inspiration

- [t3code](https://github.com/pingdotgg/t3code)
- [Solo](https://soloterm.com/)

## Resources

- [Impeccable UI](https://impeccable.style/cheatsheet)

- [Effect](https://effect.website)
- [QMD](https://github.com/tobi/qmd)
- [Tailwind CSS](https://tailwindcss.com)
- [Tanstack Router](https://tanstack.com/router/latest)
- [Tanstack Start](https://tanstack.com/start/latest)
- [XTerm.js](https://xtermjs.org/)

## Google Keep Import

This repo includes a local-only importer for Google Keep Takeout exports:

```bash
bun scripts/import-google-keep.ts \
  --input /path/to/Takeout/Keep \
  --output ./private/knowledge-base/keep
```

It converts exported Keep notes into Markdown files that can be indexed by `qmd`.
The generated knowledge base is intended to live under `./private/`, which is gitignored.

## QMD Index

Analyze the existing markdown corpus and then build the local QMD index:

```bash
bun run analyze:knowledge-base
bun run qmd:index
```

This creates:

- category-backed collection folders under `./private/qmd/collections`
- a repo-local SQLite index at `./private/qmd/index.sqlite`

The SQLite file stays out of git because the entire `./private/` directory is ignored.
