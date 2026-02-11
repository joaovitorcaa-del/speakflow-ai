

# Fix: Challenge Flow Returning to Home During Exercise

## Root Cause

When Supabase refreshes the auth token (which happens automatically), the following chain occurs:

1. `onAuthStateChange` fires with `TOKEN_REFRESHED`
2. `useAuth` creates a new `user` object reference (same user, new JS object)
3. `useProfile` has `useEffect([user])` which calls `fetchProfile()`, setting `loading = true`
4. `Index.tsx` has `useEffect` that checks `if (profileLoading) setView("loading")` -- this **unmounts the ChallengeFlow component**
5. When loading finishes, the view is set to `"home"` because the profile exists

This can happen any time during a challenge, but is more likely after ~5-10 minutes of use (when the token refresh interval fires).

## Solution

Two changes to prevent this from happening:

### 1. `src/hooks/useProfile.tsx` -- Separate initial loading from refetch

Add an `initialLoading` flag so that refetches (triggered by token refresh) do NOT set `loading = true`. This prevents downstream effects from re-rendering the loading screen.

- Add a `useRef` for `isInitialFetch` (starts `true`, set to `false` after first fetch)
- Only call `setLoading(true)` when `isInitialFetch.current === true`
- This way, `profile` stays populated during background refetches

### 2. `src/pages/Index.tsx` -- Do not regress to loading when already in a content view

Add a guard so that `setView("loading")` only happens when the current view is still `"loading"` (initial state). Once the user is in `"home"`, `"challenge"`, etc., profile re-loading should not force them back to the loading screen.

- Change: `if (profileLoading) { setView("loading"); return; }` 
- To: `if (profileLoading && view === "loading") { return; }` (keep current view if already navigated)

## Technical Details

```text
Before (broken):
  Token refresh -> new user ref -> useProfile refetch -> loading=true -> view="loading" -> ChallengeFlow unmounts

After (fixed):
  Token refresh -> new user ref -> useProfile refetch (loading stays false) -> no view change -> ChallengeFlow stays mounted
```

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useProfile.tsx` | Add `isInitialFetch` ref, only set loading=true on first fetch |
| `src/pages/Index.tsx` | Guard `setView("loading")` to only apply during initial load |

