# techstack.md

## runtime

- react 18, the ui layer
- vite 5, the build and dev server, for fast hmr and no config bundling
- typescript 5, for safer refactors

## styling

- tailwind css 3, utility-first styling
- shadcn/ui, accessible primitives built on radix, copied into the codebase so they are owned not imported
- a custom design system in `src/index.css` using hsl variables, so light and dark themes share the same component code

## routing

- react-router-dom 6, client-side routing with three top-level routes (home, note, tag)

## content pipeline

- `import.meta.glob('/content/**/*.md', { as: 'raw', eager: true })`, vite reads every markdown file at build time and inlines them as strings
- a hand-written frontmatter parser, no dependency on gray-matter or yaml libraries, since the supported subset is small
- a hand-written markdown parser in `src/lib/markdown.tsx`, again no dependency, because we wanted full control over wiki-links, annotations, folds, and callouts

this avoids pulling in remark or markdown-it and their plugin ecosystems. the tradeoff is a smaller feature set, but everything is explicit and debuggable in one file.

## visualisation

- a custom force simulation in `src/components/LocalGraph.tsx`, no d3 dependency
- mermaid loaded lazily from a cdn only when a mermaid block is rendered

## icons

- lucide-react, used everywhere there is iconography

## why no backend by default

a digital garden is mostly read, occasionally written by one author. flat files give zero latency, full offline support, git history per note, and trivial hosting. a database is only worth the complexity when you need multi-author editing or a live ui. see `portsb.md` for that path.
