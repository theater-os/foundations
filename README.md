# TheaterOS Foundations

A Bun monorepo with Turbo for managing multiple packages and applications.

## Getting Started

Install dependencies:
```bash
bun install
```

## Available Scripts

- `bun run dev` - Start all packages in development mode
- `bun run build` - Build all packages
- `bun run lint` - Lint all packages
- `bun run test` - Test all packages
- `bun run clean` - Clean all packages

## Workspace Structure

- `apps/` - Applications
  - `web/` - Web application
- `packages/` - Shared packages
  - `ui/` - UI component library

## Development

Each package can be developed independently:

```bash
# Work on a specific package
cd apps/web
bun run dev

# Or work on a shared package
cd packages/ui
bun run dev
```
```

Perfect! I've set up a basic Bun monorepo with Turbo. Here's what I've created:

## Structure Created:

1. **Root Configuration:**
   - `package.json` - Root package with workspaces and Turbo scripts
   - `turbo.json` - Turbo configuration for build pipeline
   - `bunfig.toml` - Bun configuration
   - `.gitignore` - Comprehensive gitignore for monorepos

2. **Workspace Structure:**
   - `apps/web/` - Example web application
   - `packages/ui/` - Example shared UI package

3. **Example Code:**
   - Basic TypeScript components in the UI package
   - Web app that imports from the UI package

## Key Features:

- **Bun workspaces** for package management
- **Turbo** for build orchestration and caching
- **TypeScript** support out of the box
- **Proper dependency management** between packages
- **Development scripts** for common tasks

## Next Steps:

1. Run `bun install` to install dependencies
2. Run `bun run dev` to start development
3. Add more packages to `apps/` or `packages/` as needed
4. Configure build tools (Vite, Next.js, etc.) for your specific needs

The setup is ready to use! You can start developing by running `bun install` followed by `bun run dev`.

