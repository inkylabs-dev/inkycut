# InkyCut CI/CD Pipeline

This directory contains the GitHub Actions workflows for the InkyCut project.

## Workflows

### `ci.yml` - CI/CD Pipeline

A comprehensive continuous integration and deployment pipeline that runs on every push and pull request to the `main` and `develop` branches.

#### Jobs

**1. `build-and-test` - Main Application**
- Installs Node.js 20 with npm caching
- Installs Wasp CLI (required for the project)
- Installs npm dependencies
- Builds the Wasp project (generates TypeScript types)
- Runs TypeScript type checking
- Completes the build with bundling step
- Uploads build artifacts

**2. `build-blog` - Documentation Site**
- Installs Node.js 20 with npm caching  
- Installs blog dependencies (Astro-based)
- Builds the documentation site
- Uploads blog artifacts

#### Requirements Addressed

✅ **Install npm dependencies** - Uses `npm ci` for reliable dependency installation  
✅ **Install Wasp** - Downloads and installs Wasp CLI from official installer  
✅ **Run npm typecheck** - Executes TypeScript type checking after build  
✅ **Build** - Complete build process including Wasp build and bundle steps  

#### Key Features

- **Proper Build Order**: Dependencies → Wasp Build → TypeCheck → Bundle
- **Artifact Upload**: Build artifacts are uploaded for debugging and deployment
- **Npm Caching**: Speeds up builds by caching dependencies
- **Environment Variables**: Sets appropriate NODE_ENV for builds
- **Error Handling**: Each step can fail independently with clear error messages

#### Usage

The workflow automatically runs when:
- Code is pushed to `main` or `develop` branches
- Pull requests are opened against `main` or `develop` branches

No manual configuration is required - the workflow is fully automated.

#### Troubleshooting

If builds fail:

1. **Wasp Installation Issues**: Check if the Wasp installer URL is accessible
2. **TypeScript Errors**: Ensure all Wasp-generated modules exist (run after `wasp build`)
3. **Dependency Issues**: Check for package-lock.json conflicts
4. **Build Artifacts**: Download artifacts from failed runs for debugging

For more information about the InkyCut project structure, see the main [README.md](../../README.md) and [CLAUDE.md](../../CLAUDE.md) files.