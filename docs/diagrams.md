# laSolutions Website — Architecture Diagrams

Diagrams for the laSolutions storefront (vanilla HTML/CSS/JS + Supabase +
Netlify). Three views: flows, components, and sequences.

**How to view:** GitHub renders Mermaid blocks natively. Locally, use VS Code
with *Markdown Preview Mermaid Support* + *Markmap* extensions, or paste the
Mermaid blocks into <https://mermaid.live>.

---

## Project map (markmap)

````markmap
# laSolutions Website
## Frontend (public/)
### Pages
- index · catalog · promotions · admin · about · contact · login · register
### Shared JS modules
- supabase-config: client factory (+ fallback)
- app: nav, shared helpers, resolveImageUrl
- auth: Supabase Auth session flow
- catalog: loadSiteData, render, carousel, brands marquee
- promotions: promo cards + countdowns
- data-fallback: local mirror (28 products, 6 promos)
- contact: submitContactMessage
- admin: panel (CRUD + messages + image upload)
- effects: 3D pop-out + floating hero
### CSS
- style · gaming-theme · effects
## Backend (Supabase)
### Postgres (schema.sql)
- products · promotions · contact_messages · admin_users
- is_admin() SECURITY DEFINER · RLS admin-only writes
### Auth
- sign up / login / sessions
### Storage
- product-images bucket (public read, admin write)
## Hosting
- Netlify static from /public · auto-deploy from GitHub master
## Docs
- openspec (config, project, changes)
````

---

## Flows

### Public page load with resilient fallback

```mermaid
flowchart TD
  A[Browser opens page] --> B[jsdelivr serves supabase-js v2]
  B --> C{SDK global available?}
  C -- no --> D[window.supabase = null]
  C -- yes --> E[createClient URL + publishable key]
  E --> F[window.supabase = real client]
  D --> G[loadSiteData checks client]
  F --> G
  G --> H{Client ready?}
  H -- no --> I[Use data-fallback local data]
  H -- yes --> J[Fetch products + promotions]
  J --> K{Query error?}
  K -- yes --> I
  K -- no --> L[Render grid, carousel, brands marquee]
  I --> L
  L --> M[Any error falls back, page never empty]
```

### Admin login and panel access

```mermaid
flowchart TD
  A[Open pages/admin.html] --> B[initAdmin]
  B --> C[auth.getSession]
  C --> D{Active session?}
  D -- no --> E[Show login form]
  D -- yes --> F[rpc is_admin]
  F --> G{Is admin?}
  G -- yes --> H[Show panel: products / promos / messages]
  G -- no --> I[Show login + denied message]
  E --> J[Admin enters credentials]
  J --> K[signInWithPassword]
  K --> L{Ok?}
  L -- error --> M[Show error on screen]
  L -- ok --> F
```

### Product creation with optional image upload

```mermaid
flowchart TD
  A[Nuevo producto button] --> B[newProductForm]
  B --> C[Fill fields, optional image file]
  C --> D[saveProduct: validate name + price]
  D --> E{Image file chosen?}
  E -- yes --> F[Validate MIME + max 2MB]
  F --> G{Valid?}
  G -- no --> H[Show error, abort]
  G -- yes --> I[Upload file to Storage bucket product-images]
  I --> J{Upload ok?}
  J -- no --> H
  J -- yes --> K[Build public Storage URL]
  E -- no --> L[Use URL field or placeholder]
  K --> M[persistProduct: insert or update]
  L --> M
  M --> N{DB ok?}
  N -- no --> O[Show error on screen]
  N -- yes --> P[Reload products table]
```

---

## Components

```mermaid
flowchart LR
  subgraph Browser[Browser]
    A[index / catalog / promotions]
    B[admin]
    C[about / contact / login / register]
  end

  subgraph JS[JS modules]
    D[supabase-config]
    E[app]
    F[auth]
    G[catalog]
    H[data-fallback]
    I[promotions]
    J[contact]
    K[admin]
    L[effects]
  end

  subgraph Supabase[Supabase]
    M[Auth]
    N[Postgres RLS]
    O[Storage product-images]
  end

  P[Netlify static hosting]
  Q[jsdelivr CDN]

  P --> A
  P --> B
  P --> C
  Q --> D
  D --> M
  A --> G
  B --> K
  G --> N
  K --> N
  K --> O
  F --> M
  J --> N
  G -. fallback .-> H
```

## Sequences

### Public catalog load

```mermaid
sequenceDiagram
  participant Page as Page browser
  participant CDN as jsdelivr CDN
  participant SB as Supabase
  participant FB as data-fallback.js
  Page->>CDN: load supabase-js@2
  CDN-->>Page: UMD global (module container)
  Page->>Page: supabase-config always builds real client
  Page->>SB: loadSiteData: products + promotions
  alt CDN failure or query error
    Page->>FB: read local datasets
    FB-->>Page: 28 products, 6 promotions
  end
  Page->>Page: render grid, carousel, brands marquee
```

### Admin login and authorization

```mermaid
sequenceDiagram
  participant Admin as Admin browser
  participant P as admin.js
  participant Auth as Supabase Auth
  participant DB as Postgres RLS
  Admin->>P: open pages/admin.html
  P->>Auth: getSession()
  alt no session
    Admin->>P: enter email + password
    P->>Auth: signInWithPassword()
    Auth-->>P: session token
  end
  P->>DB: rpc is_admin()
  DB-->>P: true | false
  alt is admin
    P->>DB: load products, promos, messages
    DB-->>P: rows
  else not admin
    P-->>Admin: denied message on login
  end
```

### Product creation with image upload

```mermaid
sequenceDiagram
  participant Admin as Admin browser
  participant P as admin.js
  participant St as Supabase Storage
  participant DB as products table
  P->>P: saveProduct validates name/price
  alt image file selected
    P->>St: upload to product-images
    St-->>P: public object URL
  end
  P->>DB: insert product row
  DB-->>P: success | RLS/constraint error
  alt success
    P->>DB: reload products list
    DB-->>P: updated rows
  else error
    P-->>Admin: error visible on screen
  end
```