# Archive

This directory holds historical backup/reference files that are intentionally kept out of the active application tree.

## Rules
- Nothing in `archive/` should be imported or used by the production app.
- Files here are retained only for historical reference and recovery.
- If an archived file becomes needed again, restore it explicitly instead of referencing it in place.

## Current contents
- `backups/app/create/page.tsx.bak` — legacy backup of the create page that was moved out of `app/create/` after verifying it was not referenced by the app, build, or runtime.
