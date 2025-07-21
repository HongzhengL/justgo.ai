# Pre-commit Setup Guide

This project uses [pre-commit](https://pre-commit.com/) to automatically run code quality checks before commits.

## 🎯 What This PR Adds

This branch adds a comprehensive pre-commit configuration that automatically:

- ✨ Formats code with Prettier
- 🔍 Lints JavaScript/TypeScript with ESLint
- 📋 Validates Prisma schema files
- 🔒 Checks for security issues and merge conflicts
- 🧹 Fixes common file issues (trailing whitespace, end-of-file)

All of this happens automatically on every commit, ensuring consistent code quality across the team.

## Installation

Pre-commit is a Python package that must be installed separately from npm dependencies.

### Option 1: Using pip

```bash
pip install pre-commit
```

### Option 2: Using pipx (recommended)

```bash
pipx install pre-commit
```

### Option 3: Using conda

```bash
conda install -c conda-forge pre-commit
```

### Option 4: Using Homebrew (macOS)

```bash
brew install pre-commit
```

## Setup

1. Install pre-commit (see options above)
2. Install npm dependencies:
    ```bash
    npm install
    ```
3. Install the git hooks:
    ```bash
    npm run pre-commit-install
    ```
    Or directly:
    ```bash
    pre-commit install
    ```

## What it does

The pre-commit configuration includes:

### Code Formatting

- **Prettier**: Formats JavaScript, TypeScript, CSS, JSON, YAML, and Markdown files
- **Prisma Format**: Formats Prisma schema files

### Linting

- **ESLint**: Lints JavaScript/TypeScript files with React and TypeScript rules
- **TypeScript Check**: Validates TypeScript files for type errors

### Schema Validation

- **Prisma Validate**: Validates Prisma schema syntax

### Quality Checks

- **Merge Conflict Check**: Prevents commits with merge conflict markers
- **Large File Check**: Prevents commits with files larger than 500KB
- **Trailing Whitespace**: Removes trailing whitespace
- **End of File**: Ensures files end with newline
- **Private Key Detection**: Prevents committing private keys

## Usage

Once installed, pre-commit hooks run automatically on `git commit`. To run manually:

```bash
# Run on all files
pre-commit run --all-files

# Run on staged files only
pre-commit run

# Run specific hook
pre-commit run prettier
pre-commit run eslint
```

## Performance

The configuration is optimized for performance:

- TypeScript checking only runs on staged `.ts`/`.tsx` files
- Prisma hooks only run when `schema.prisma` changes
- ESLint automatically fixes issues when possible

## Troubleshooting

### Pre-commit not found

If you see "pre-commit not found", install it using one of the options above.

### Hook failures

- **ESLint errors**: Run `npm run lint:fix` to auto-fix many issues
- **TypeScript errors**: Fix type issues in your code
- **Prettier formatting**: Prettier will auto-format files during commit

### Bypassing hooks (not recommended)

```bash
git commit --no-verify
```

Use this only in emergencies, as it skips all quality checks.
