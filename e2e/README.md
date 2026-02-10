# E2E Tests for Proximity Recommendations

This directory contains end-to-end tests for the proximity stock recommendations feature.

## Setup

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Environment Variables

Create a `.env.test` file or set these in your environment:

```bash
BASE_URL=http://localhost:3000
TEST_EMAIL=test@example.com
TEST_PASSWORD=testpassword
```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
npx playwright test e2e/proximity-recommendations.spec.ts
```

### Run tests in UI mode (recommended for development):
```bash
npm run test:e2e:ui
```

### Run tests in debug mode:
```bash
npm run test:e2e:debug
```

## Test Coverage

The `proximity-recommendations.spec.ts` file tests:

1. **Page Load Smoke Test**
   - Verifies page loads without errors
   - Checks user is on correct section
   - Validates alert cards exist

2. **Proximity Recommendations Display**
   - Verifies emerald boxes appear for stockout alerts
   - Checks "En Yakın Stok Kaynakları" heading
   - Validates store names and distances are shown
   - Ensures max 3 recommendations displayed

3. **Fallback Message Display**
   - Verifies amber boxes appear when no transfer options
   - Checks "Tüm mağazalarda stok yetersiz" message
   - Validates appropriate messaging

4. **Non-Stockout Alert Behavior**
   - Ensures non-stockout alerts don't show proximity recommendations
   - Validates appropriate UI behavior

5. **Empty State Handling**
   - Verifies page doesn't crash with no alerts
   - Validates graceful degradation

## Test Data

For best results, your test database should contain:

- Multiple stores with coordinates
- Products with stock at some stores
- Stockout alerts for products with no stock at a store
- Both scenarios:
  - Stockouts with nearby stores having stock (shows recommendations)
  - Stockouts with NO nearby stores having stock (shows fallback)

## Debugging

### View Test Results
After running tests, open the HTML report:
```bash
npx playwright show-report
```

### Screenshots & Videos
Failed tests automatically capture:
- Screenshot of the page
- Video of the test run
- Trace file for debugging

View traces:
```bash
npx playwright show-trace trace.zip
```

### Interactive Debugging
Use debug mode to step through tests:
```bash
npm run test:e2e:debug
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests fail with "Test skipped"
- No test data in database
- Add stockout alerts to test database
- Check test user has proper permissions

### Tests fail with "Authentication failed"
- Verify TEST_EMAIL and TEST_PASSWORD are correct
- Ensure test user exists in database
- Check test user has inventory_planning access

### Tests timeout
- Increase timeout in test file
- Check dev server is running
- Verify BASE_URL is correct

### Browser not found
- Run `npx playwright install`
- Install browser dependencies: `npx playwright install-deps`

## Future Enhancements

- [ ] Add test data setup via API
- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Test mobile viewports
- [ ] Add cross-browser testing
- [ ] Test with different user roles
