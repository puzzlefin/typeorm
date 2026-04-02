# Building & Packaging (Puzzlefin Fork)

This is a fork of TypeORM 0.2.x maintained by Puzzlefin. It is installed as a
git dependency — **not** published to npm.

## How consumers install it

In your `package.json`:

```json
"typeorm": "git+https://github.com/puzzlefin/typeorm#puzzle.0.2.59"
```

Compiled build artifacts (`build/compiled/src/`) are committed to git, so
consumers get pre-built JS and type declarations directly — no compilation
step at install time.

## Package entry points

| Field   | Path                              |
|---------|-----------------------------------|
| `main`  | `./build/compiled/src/index.js`   |
| `types` | `./build/compiled/src/index.d.ts` |
| `bin`   | `./build/compiled/src/cli.js`     |

## TypeScript configuration

| Config               | Purpose                                       |
|----------------------|-----------------------------------------------|
| `tsconfig.json`      | Full project config (src + sample + test)      |
| `tsconfig.build.json`| Build-only config (src only, for packaging)    |

`tsconfig.build.json` extends `tsconfig.json` and narrows the `include` to
just `src/`. Both target ES2020 / CommonJS to stay in sync with the gateway
repository.

## npm scripts

| Script    | What it does                                           |
|-----------|--------------------------------------------------------|
| `compile` | Cleans `build/` and compiles the full project (src + sample + test) |
| `clean`   | Removes the `build/` directory                         |
| `test`    | Clean compile + run mocha tests                        |
| `package` | Gulp-based packaging (legacy, not used for git installs) |

## Making changes

1. Make your changes to `src/` on a branch.
2. Rebuild: `npx tsc -p tsconfig.build.json`
3. Commit **both** source and build artifacts.
4. Update the version in `package.json`.
5. Merge to master and tag (e.g. `puzzle.0.2.60`).
6. Consumers update their git ref to the new tag.
