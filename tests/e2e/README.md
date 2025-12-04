# E2E Test Cases

This directory contains E2E test configuration files for FlickrHub.

## Available Tests

### 1. Meta Field Pass-Through Test

**File:** `meta-field-test.json`

Tests comprehensive meta field pass-through with nested objects and arrays.

**Validations:**

- Job completion
- Meta field existence
- Session ID matching
- Job type matching
- Custom data nested fields
- Array element access

**Run:**

```bash
node tools/e2e-test.js <user_id> tests/e2e/meta-field-test.json
```

### 2. Simple Test

**File:** `simple-test.json`

Minimal test with basic meta field.

**Validations:**

- Job completion
- Simple meta field matching

**Run:**

```bash
node tools/e2e-test.js <user_id> tests/e2e/simple-test.json
```

### 3. Template

**File:** `template.json`

Template for creating new test cases. Copy this file and modify for your needs.

## Creating New Tests

1. Copy `template.json`:

```bash
cp tests/e2e/template.json tests/e2e/my-test.json
```

2. Edit `my-test.json`:
   - Update `name` and `description`
   - Modify `payload` section with your test data
   - Add `validations` rules

3. Run your test:

```bash
node tools/e2e-test.js <user_id> tests/e2e/my-test.json
```

## Validation Rules

### exists

Check if a field exists in the callback payload:

```json
{
  "description": "Field should exist",
  "type": "exists",
  "path": "field.path"
}
```

### equals

Check if a field equals an expected value:

```json
{
  "description": "Field should match",
  "type": "equals",
  "path": "field.path",
  "expected": "expected-value"
}
```

## Path Syntax

The `path` field supports:

- **Simple fields:** `"job_id"`
- **Nested objects:** `"meta.session_id"`
- **Deep nesting:** `"meta.custom_data.user"`
- **Array indexing:** `"tags[0]"`
- **Combined:** `"result.contacts.contact[0].username"`

## Examples

### Example 1: Check Nested Object

```json
{
  "payload": {
    "meta": {
      "custom_data": {
        "user": "xyz"
      }
    }
  },
  "validations": [
    {
      "type": "equals",
      "path": "meta.custom_data.user",
      "expected": "xyz"
    }
  ]
}
```

### Example 2: Check Array Element

```json
{
  "payload": {
    "meta": {
      "tags": ["important", "test"]
    }
  },
  "validations": [
    {
      "type": "equals",
      "path": "meta.tags[0]",
      "expected": "important"
    },
    {
      "type": "equals",
      "path": "meta.tags[1]",
      "expected": "test"
    }
  ]
}
```

### Example 3: Multiple Validations

```json
{
  "validations": [
    {
      "description": "Job should complete",
      "type": "equals",
      "path": "state",
      "expected": "completed"
    },
    {
      "description": "Should have result",
      "type": "exists",
      "path": "result"
    },
    {
      "description": "Should have meta",
      "type": "exists",
      "path": "meta"
    },
    {
      "description": "Session should match",
      "type": "equals",
      "path": "meta.session_id",
      "expected": "my-session"
    }
  ]
}
```

## Test Output

When you run a test, you'll see:

1. Test name and description
2. Request payload
3. Job processing status
4. Validation results (✓ or ✗ for each rule)
5. Summary (passed/failed counts)
6. On failure: complete callback payload for debugging

## Tips

- Start with `simple-test.json` to verify basic functionality
- Use `exists` checks before `equals` checks for nested fields
- Add descriptive names to validations for clear error messages
- Use the template as a starting point for new tests
- Test one feature at a time for easier debugging

## Troubleshooting

If tests fail:

1. Check the callback payload in the output
2. Verify your path syntax is correct
3. Ensure expected values match exactly (case-sensitive)
4. For arrays, verify the index exists
5. Check that services are running: `docker-compose ps`

For more help, see [E2E Testing Guide](../../tools/E2E_TESTING_GUIDE.md)
