# Contributing to Testlyn

Thank you for your interest in contributing to Testlyn! We welcome contributions from the community.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Provide specific examples to demonstrate the steps
- Describe the current behavior and the expected behavior
- Explain why this enhancement would be useful

### Pull Requests

- Fill in the required template
- Follow the JavaScript/Node.js styleguides
- End all files with a newline
- Include appropriate test cases
- Keep commit messages clear and concise

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/alban-okoby/testlyn.git
   cd testlyn
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Make your changes and test them:
   ```bash
   npm test
   npm run lint
   ```

6. Commit your changes:
   ```bash
   git commit -m 'Add your feature description'
   ```

7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

8. Create a Pull Request on GitHub

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

- Use semicolons
- Use single quotes for strings
- Use 2 spaces for indentation
- Follow ESLint rules

Run `npm run lint` to check your code.

## Testing

Before submitting a Pull Request, please ensure all tests pass:

```bash
npm test
```

If you're adding a new feature, please add tests for it.

## Release Process

Maintainers will handle the release process. When a new version is ready:

1. Update version in `package.json`
2. Create a release on GitHub
3. Publish to npm with `npm publish`

## Questions?

Feel free to open an issue with the `question` label if you have any questions!

---

Happy coding! 🚀
