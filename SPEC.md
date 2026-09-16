# SPEC: Internationalisation of Auth Feature

Adds i18n support to all user-facing error and response messages in the auth middleware (`src/middleware/auth.js`) and auth routes (`src/routes/auth.js`).

**Supported locales:** `en` (English, default), `fil` (Filipino/Tagalog)  
**Locale detection:** `Accept-Language` request header; falls back to `en` if the locale is absent or unsupported.

---

## Step 1: Tests (write these first — red phase)

### 1a. New file: `tests/utils/i18n.test.js`

Tests for the `t(key, locale, vars)` function itself.

```
describe('t()')
  - returns the English string for a known key with locale "en"
  - returns the Filipino string for a known key with locale "fil"
  - falls back to English when locale is unsupported (e.g. "de")
  - falls back to English when locale is omitted
  - falls back to English when locale is null / undefined
  - interpolates variables into the string (e.g. role, permission, maxRequests)
  - returns the key itself when the key does not exist in any locale (prevents silent blanks)
```

### 1b. New file: `tests/utils/detectLocale.test.js`

Tests for the `detectLocale(req)` helper.

```
describe('detectLocale()')
  - returns "en" when Accept-Language header is absent
  - returns "en" for "en", "en-US", "en-GB"
  - returns "fil" for "fil", "fil-PH", "tl", "tl-PH"
  - returns "en" (fallback) for an unsupported locale such as "fr"
  - is case-insensitive ("FIL-PH" → "fil")
```

### 1c. Update: `tests/middleware/auth.test.js`

Extend the existing auth middleware tests to assert on translated message content.

```
describe('authenticate() — i18n')
  - responds in English by default (no Accept-Language header)
  - responds in Filipino when Accept-Language: fil is set
    · AUTH_MISSING_HEADER → Filipino error + message strings
    · AUTH_TOKEN_EXPIRED  → Filipino strings
    · AUTH_ACCOUNT_INACTIVE → Filipino strings
    · AUTH_PERMISSION_DENIED → Filipino strings (with role/permission interpolated)
    · AUTH_RATE_LIMITED → Filipino strings (with maxRequests interpolated)
```

---

## Step 2: Implementation

### 2a. Locale files

**`src/locales/en.js`** — English strings (extracted from current hardcoded values):

| Key | `error` | `message` |
|-----|---------|-----------|
| `AUTH_MISSING_HEADER` | Authentication required | No authorization header provided |
| `AUTH_MALFORMED_HEADER` | Authentication required | Authorization header must be in format: Bearer \<token\> |
| `AUTH_TOKEN_EXPIRED` | Token expired | Your session has expired. Please log in again. |
| `AUTH_TOKEN_INVALID` | Invalid token | The provided token is not valid |
| `AUTH_VERIFICATION_FAILED` | Authentication failed | Unable to verify token |
| `AUTH_DB_ERROR` | Internal server error | Unable to verify user account |
| `AUTH_USER_NOT_FOUND` | User not found | The account associated with this token no longer exists |
| `AUTH_ACCOUNT_INACTIVE` | Account inactive | Your account has been deactivated. Contact support. |
| `AUTH_RATE_LIMITED` | Rate limit exceeded | Maximum {{maxRequests}} requests per minute |
| `AUTH_PERMISSION_DENIED` | Insufficient permissions | Your role ({{role}}) does not have the '{{permission}}' permission |
| `AUTH_UNEXPECTED_ERROR` | Internal server error | An unexpected error occurred during authentication |
| `REGISTER_MISSING_FIELDS` | _(none)_ | Missing required fields: email, password, name |
| `REGISTER_EMAIL_TAKEN` | _(none)_ | Email already registered |
| `LOGIN_MISSING_FIELDS` | _(none)_ | Missing required fields: email, password |
| `LOGIN_INVALID_CREDENTIALS` | _(none)_ | Invalid email or password |
| `LOGIN_ACCOUNT_INACTIVE` | _(none)_ | Account is inactive |

**`src/locales/fil.js`** — Filipino translations for every key above.

### 2b. `src/utils/i18n.js`

Exports two functions:

- **`t(key, locale = 'en', vars = {})`**  
  Looks up `key` in the locale file for `locale` (falls back to `en`).  
  Interpolates `vars` into `{{placeholder}}` tokens in the string.  
  Returns the raw key string if the key is missing from both locales.

- **`detectLocale(req)`**  
  Reads `req.headers['accept-language']`, takes the first tag, normalises to lowercase, maps `tl*` → `'fil'`, maps `en*` → `'en'`, returns `'en'` for anything else.

### 2c. Update `src/middleware/auth.js`

- Import `t` and `detectLocale` from `src/utils/i18n.js`.
- At the top of the `authenticate()` closure, call `const locale = detectLocale(req)`.
- Replace every hardcoded `error` / `message` string in JSON responses with `t(code, locale, vars)` calls, where `vars` carries dynamic values like `role`, `permission`, `maxRequests`, `retryAfter`.

### 2d. Update `src/routes/auth.js`

- Same imports.
- Detect locale from `req` on each route handler.
- Replace hardcoded `error` strings in the five auth-route responses with `t(key, locale)`.

---

## Acceptance Criteria

1. `npm test` passes with all new and updated tests green.
2. `GET /health` unchanged — no locale logic outside auth.
3. A request with `Accept-Language: fil` to any auth-gated endpoint returns Filipino error messages.
4. A request with no header (or `Accept-Language: en`) returns English messages — identical to current behaviour.
5. All error `code` fields remain unchanged (e.g. `AUTH_MISSING_HEADER`) — only `error` and `message` are translated.
