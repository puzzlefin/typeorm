# Building & Packaging (Puzzlefin Fork)

This is a fork of TypeORM 0.2.x maintained by Puzzlefin. It is installed as a
git dependency — **not** published to npm.

## How consumers install it

In your `package.json`:

```json
"typeorm": "git+https://github.com/puzzlefin/typeorm#puzzle.0.2.58"
```

When `npm install` runs against a git dependency it will:

1. Clone the repo at the specified ref.
2. Install all dependencies (including devDependencies).
3. Run the `prepare` script, which compiles `src/` to `build/compiled/src/`.
4. Pack only the files listed in the `files` field.

No build artifacts are checked into git.

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
| `tsconfig.build.json`| Build-only config (src only, used by `prepare`)|

`tsconfig.build.json` extends `tsconfig.json` and narrows the `include` to
just `src/`. Both target ES2020 / CommonJS to stay in sync with the gateway
repository.

## npm scripts

| Script    | What it does                                           |
|-----------|--------------------------------------------------------|
| `prepare` | Compiles `src/` via `tsconfig.build.json` (runs automatically on `npm install` from git) |
| `compile` | Cleans `build/` and compiles the full project (src + sample + test) |
| `clean`   | Removes the `build/` directory                         |
| `test`    | Clean compile + run mocha tests                        |
| `package` | Gulp-based packaging (legacy, not used for git installs) |

## Local development

```bash
npm install
npm run compile   # full build including tests
npm test          # compile + run tests
```

## Making a new release

1. Make your changes on a branch.
2. Update the version in `package.json`.
3. Merge to master and tag (e.g. `puzzle.0.2.59`).
4. Consumers update their git ref to the new tag.
