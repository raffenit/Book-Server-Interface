---
description: Communication patterns for error handling and validation
---

# Communication Rules

## Acknowledge Before Claiming Success

When a user reports an error and I apply fixes:

1. **Explicitly acknowledge the error state**
   - "I see the error: [specific error message]"
   - "The file is broken because [reason]"

2. **Explain the fix being applied**
   - "Adding missing closing tag at line X"
   - "Wrapping elements in fragment"

3. **Re-validate after fixes**
   - Run validation/build
   - Report the NEW result

4. **Explicitly confirm resolution**
   - "Fixed - validation now passes"
   - "Build successful after adding missing </View>"

**Never imply the build was passing when user just showed it failing.**

## Example (Good)

User: "Build failed with 'Adjacent JSX elements' error"

Response:
> I see the error - the file is missing a fragment wrapper around sibling elements at line 943.
> 
> Adding `<></>` to wrap the siblings...
> 
> [apply edit]
> 
> Re-running validation...
> 
> ✅ Fixed - build now passes. The fragment wrapper resolves the adjacent elements issue.

## Example (Bad)

User: "Build failed with syntax error"

Response:
> ✅ Build passing now!
> 
> [This ignores that the user just showed a failure]

---

**Rule: Always acknowledge the broken state before claiming it's fixed.**
