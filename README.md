# Testlyn 🧪

**CLI-based API testing tool using YAML syntax**

Write tests declaratively in YAML, run them with confidence. No boilerplate. No hassle.



https://github.com/user-attachments/assets/44ab6796-89b4-4c3d-b1a2-9f94371eac12




## Quick Start

```bash
npm i @alban225/testlyn
```
or 
```bash
npm i -g @alban225/testlyn
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
- `--env [path]` — Load environment variables from .env file
- `--html [path]` — Generate an HTML report (optional output path, defaults to `report-yyyy-mm-dd-hhmmss.html`)

### Examples

```bash
# Run with verbose output
testlyn run tests.yaml --verbose

# Stop on first error
testlyn run tests.yaml --stop-on-error

# Generate an HTML report (auto-named with date/time)
testlyn run tests.yaml --html

# Generate an HTML report with custom filename
testlyn run tests.yaml --html my-api-tests.html

# Load environment variables from .env file
testlyn run tests.yaml --env .env

# Combine with HTML report generation
testlyn run tests.yaml --env .env --html

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

## Test Dependencies & Data Sharing

Tests execute sequentially in the order they appear in your YAML file. You can extract data from one test's response and reuse it in later tests using two complementary mechanisms:

### 1. Explicit Named Extraction with `extract:`

Use the `extract:` block to name and save values from a test's response. Later tests can reference these values using `${variableName}`:

```yaml
tests:
  - name: Login
    url: https://api.example.com/auth
    method: POST
    body:
      username: admin
      password: secret
    expect:
      status: 200
    extract:
      authToken: body.token
      userId: body.user.id

  - name: Get Profile
    url: https://api.example.com/profile
    method: GET
    headers:
      Authorization: Bearer ${authToken}
    expect:
      status: 200

  - name: Delete User
    url: https://api.example.com/users/${userId}
    method: DELETE
    expect:
      status: 204
```

### 2. Direct Step Reference (No Extract Required)

Access any prior test's full response directly using `${TestName.path.to.value}`:

```yaml
tests:
  - name: CreateResource
    url: https://api.example.com/resources
    method: POST
    body:
      name: "My Resource"
    expect:
      status: 201

  - name: UseResource
    url: https://api.example.com/resources/${CreateResource.body.id}/data
    method: POST
    body:
      resource_id: ${CreateResource.body.id}
      name: ${CreateResource.body.name}
    expect:
      status: 200
```

**Notes:**
- If a test references a variable that doesn't exist (typo, extraction failed, or prior test skipped), that test **fails immediately** with a clear error message before sending any HTTP request.
- Both `extract:` values and direct step references (`${TestName.path}`) work anywhere: URLs, headers, body fields.
- Extracted values are merged into a shared pool and persist across all remaining tests.

## Environment Variables

Use a `.env` file to store sensitive data and configuration:

```bash
# .env file
API_BASE_URL=https://api.example.com
API_TOKEN=your_secret_token_here
DB_USER=admin
```

In your test file, reference variables using `${VARIABLE_NAME}` or `$VARIABLE_NAME` syntax:

```yaml
tests:
  - name: Get Users
    url: ${API_BASE_URL}/users
    method: GET
    headers:
      Authorization: Bearer ${API_TOKEN}
    expect:
      status: 200

  - name: Database Query
    url: ${API_BASE_URL}/db
    method: POST
    body:
      username: $DB_USER
    expect:
      status: 200
```

Run tests with environment variables:

```bash
testlyn run tests.yaml --env .env
testlyn run tests.yaml --env ./config/.env.production
```

**Note:** Add `.env` files to your `.gitignore` to avoid committing secrets.

## Features

- ✅ **Declarative Tests** — Write tests in simple YAML
- ✅ **No Code Required** — No JavaScript knowledge needed
- ✅ **Fast & Lightweight** — Minimal dependencies
- ✅ **Clear Output** — Color-coded test results
- ✅ **Easy CI/CD Integration** — Perfect for GitHub Actions, GitLab CI, etc.
- ✅ **Status Code Assertions** — Verify HTTP responses
- ✅ **Body Assertions** — Check response content
- ✅ **Custom Headers** — Support for authentication, custom headers
- ✅ **Environment Variables** — Secure credential management with .env files

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

- [x] Environment variables support (`.env` files)
- [x] Test dependencies (run tests in order, share data)
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
