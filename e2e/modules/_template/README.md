# Adding a New Detox E2E Test Module

To add tests for a new ERP module (e.g., HRMS, Production, Inventory):

## 1. Copy this template

```bash
cp -r e2e/modules/_template e2e/modules/<module-name>
# Example: cp -r e2e/modules/_template e2e/modules/hrms
```

## 2. Edit files

### `api.client.ts`
- Rename the class (e.g., `HRMSApiClient`)
- Add your module's API methods using `this.get()`, `this.post()`, etc.

### `routes.ts`
- Define screen identifiers and navigation paths for your module

### `pages/`
- Add Page Object classes for complex screens
- Each page encapsulates element selectors and actions

### `tests/`
- `*.test.ts` files are auto-discovered by Jest
- Use `describe/it/beforeAll` pattern
- Login via `loginViaUI()` in `beforeAll`

## 3. Test structure

```
e2e/modules/<module>/
├── api.client.ts          ← Module API methods (extends BaseApiClient)
├── routes.ts              ← testIDs and navigation identifiers
├── pages/                 ← Page Object Models
│   └── example.page.ts
└── tests/                 ← Test files (*.test.ts)
    ├── smoke.test.ts      ← Screen loads correctly
    └── crud.test.ts       ← Functional tests
```

## 4. Run your tests

```bash
# iOS simulator
pnpm test:e2e:ios -- --testPathPattern=e2e/modules/<module>

# Android emulator
pnpm test:e2e:android -- --testPathPattern=e2e/modules/<module>
```

## 5. testID conventions

Every interactive element in the mobile app should have a `testID` prop.
Convention: `<module>-<screen>-<element>`

Examples:
- `maintenance-asset-list-search`
- `maintenance-wo-detail-approve-btn`
- `hrms-employee-list-add-btn`
