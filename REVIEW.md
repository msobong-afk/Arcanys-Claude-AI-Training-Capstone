SECURITY
 - Rate limiting error message feels like it leaks internal details to API consumer. Feels like an attacker can use this to do a scheduled brute force.
    ```
        Maximum {{maxRequests}} requests per minute
    ```
 - Insufficient error message also feels like it leaks details to API consumer. An attacker can deduce what role and what permission values are.
    ```
        Your role ({{role}}) does not have the '{{permission}}' permission
    ```

PATTERN
 - N/A
 
EDGE-CASES
 - N/A

CONTEXT
 - N/A

SIMPLICITY
 - Over-engineered `detectLocale.js`, added support for `fil`, `tl`, and `en`-prefixes when I didn't specify it to.