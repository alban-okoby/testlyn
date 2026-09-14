# Testlyn 🧪

**CLI-based API testing tool using YAML syntax**

Write tests declaratively in YAML, run them with confidence. No boilerplate. No hassle.

## Quick Start

```bash
npm install -g testlyn
```

Create a `tests.yaml` file:

```yaml
tests:
  - name: Check API Health
    url: https://api.example.com/health
    method: GET
    expect:
      status: 200

  - name: Create Resource
    url: https://api.example.com/resources
    method: POST
    headers:
      Content-Type: application/json
    body:
      name: "New Resource"
    expect:
      status: 201
```

Run your tests:

```bash
testlyn run tests.yaml
```

## Installation

### Global (CLI usage)
```bash
npm install -g testlyn
```

### Local (Project dependency)
```bash
npm install --save-dev testlyn
```

Then in your `package.json`:
```json
{
  "scripts": {
    "test:api": "testlyn run tests.yaml"
  }
}
```

## Usage

### Basic Command

```bash
testlyn run <file.yaml>
```

### Options

- `-v, --verbose` — Show detailed output for each test
- `-s, --stop-on-error` — Stop running tests on first failure
- `--html [path]` — Generate an HTML report (optional output path, defaults to `testlyn-report.html`)

### Examples

```bash
# Run with verbose output
testlyn run tests.yaml --verbose

# Stop on first error
testlyn run tests.yaml --stop-on-error

# Generate an HTML report
testlyn run tests.yaml --html

# Generate an HTML report with custom filename
testlyn run tests.yaml --html custom-report.html

# Validate YAML syntax without running
testlyn validate tests.yaml

# Initialize a new test project
testlyn init my-api-tests
```

## Test File Format

### Basic Structure

```yaml
tests:
  - name: Test Name
    url: https://api.example.com/endpoint
    method: GET
    expect:
      status: 200
```

### Complete Example

```yaml
# Test suite name (optional)
suite: User API Tests

# Base URL (optional, can be used in all tests)
baseUrl: https://api.example.com

tests:
  - name: List Users
    url: /users
    method: GET
    headers:
      Authorization: Bearer YOUR_TOKEN
    expect:
      status: 200

  - name: Create User
    url: /users
    method: POST
    headers:
      Content-Type: application/json
      Authorization: Bearer YOUR_TOKEN
    body:
      email: user@example.com
      name: John Doe
    expect:
      status: 201
      body:
        id: 1
        email: user@example.com

  - name: Delete User
    url: /users/1
    method: DELETE
    expect:
      status: 204
```

### Test Properties

| Property | Required | Description |
|----------|----------|-------------|
| `name` | ✅ | Test name/description |
| `url` | ✅ | Full URL or path (if baseUrl is set) |
| `method` | ❌ | HTTP method: GET, POST, PUT, DELETE, PATCH (default: GET) |
| `headers` | ❌ | HTTP headers as key-value pairs |
| `body` | ❌ | Request body (JSON object or string) |
| `expect` | ✅ | Expected response conditions |

### Expect Properties

```yaml
expect:
  status: 200              # Expected HTTP status code
  body:                    # Expected response body (partial match)
    key: value
```

## Features

- ✅ **Declarative Tests** — Write tests in simple YAML
- ✅ **No Code Required** — No JavaScript knowledge needed
- ✅ **Fast & Lightweight** — Minimal dependencies
- ✅ **Clear Output** — Color-coded test results
- ✅ **Easy CI/CD Integration** — Perfect for GitHub Actions, GitLab CI, etc.
- ✅ **Status Code Assertions** — Verify HTTP responses
- ✅ **Body Assertions** — Check response content
- ✅ **Custom Headers** — Support for authentication, custom headers

## Use Cases

1. **Continuous Integration** — Validate APIs in your CI/CD pipeline
2. **Contract Testing** — Verify API contracts between services
3. **Smoke Testing** — Quick health checks for production APIs
4. **Development** — Test your API while building
5. **Documentation** — Keep tests as living API documentation

## CI/CD Integration

### GitHub Actions

```yaml
name: API Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g testlyn
      - run: testlyn run tests.yaml
```

### GitLab CI

```yaml
api_tests:
  image: node:18
  script:
    - npm install -g testlyn
    - testlyn run tests.yaml
```

## Project Structure

```
my-api-tests/
├── tests.yaml           # Your test file
├── package.json
└── README.md
```

## Examples

### Testing a REST API

```yaml
tests:
  - name: Get User Profile
    url: https://jsonplaceholder.typicode.com/users/1
    method: GET
    expect:
      status: 200
      body:
        id: 1

  - name: Create Post
    url: https://jsonplaceholder.typicode.com/posts
    method: POST
    headers:
      Content-Type: application/json
    body:
      userId: 1
      title: Test Post
      body: This is a test
    expect:
      status: 201
```

### Authentication

```yaml
tests:
  - name: Login
    url: https://api.example.com/auth/login
    method: POST
    headers:
      Content-Type: application/json
    body:
      username: user@example.com
      password: secret123
    expect:
      status: 200
      body:
        token: jwt_token

  - name: Protected Endpoint
    url: https://api.example.com/profile
    method: GET
    headers:
      Authorization: Bearer jwt_token
    expect:
      status: 200
```

## Roadmap

- [ ] Environment variables support (`.env` files)
- [ ] Test dependencies (run tests in order, share data)
- [ ] Response assertions (JSON path, regex matching)
- [ ] Performance testing (response time assertions)
- [x] HTML report generation
- [ ] Multi-format support (OpenAPI, Postman)
- [ ] Retry logic for flaky tests
- [ ] Parallel test execution

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © 2024

## Support

- 📖 [Documentation](https://github.com/alban-okoby/testlyn)
- 🐛 [Issue Tracker](https://github.com/alban-okoby/testlyn/issues)
- 💬 [Discussions](https://github.com/alban-okoby/testlyn/discussions)

---

Built with ❤️ in Abidjan
