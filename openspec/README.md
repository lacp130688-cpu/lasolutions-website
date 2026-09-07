# OpenSpec — laSolutions Website

OpenSpec change artifacts for the laSolutions static website.

## Structure

```
openspec/
└── changes/
    └── <change-id>/
        ├── proposal.md   — problem statement, intent, scope, approach
        ├── spec.md       — delta requirements and scenarios
        ├── design.md     — technical design and architecture
        └── tasks.md      — implementation task breakdown
```

## Active changes

| Change ID | Description | Status |
|---|---|---|
| `supabase-netlify-migration` | Migrate the static site to Supabase (database + auth) and Netlify (hosting) | Implemented |
| `admin-panel` | Admin panel: product/promotion CRUD, storage image upload, RLS hardening | Implemented |