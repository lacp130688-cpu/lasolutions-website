# laSolutions Website — Diagramas de arquitectura

Diagramas de la tienda laSolutions (HTML/CSS/JS vanilla + Supabase +
Netlify). Tres vistas: flujos, componentes y secuencias.

**Como verlos:** GitHub renderiza los bloques Mermaid de forma nativa. De
forma local, usa VS Code con las extensiones *Markdown Preview Mermaid
Support* y *Markmap*, o pega los bloques Mermaid en <https://mermaid.live>.

---

## Mapa del proyecto (markmap)

````markmap
# Sitio laSolutions
## Frontend (public/)
### Paginas
- index · catalog · promotions · admin · about · contact · login · register
### Modulos JS compartidos
- supabase-config: fabrica del cliente (+ respaldo)
- app: navegacion, helpers compartidos, resolveImageUrl
- auth: flujo de sesion con Supabase Auth
- catalog: loadSiteData, render, carrusel, marquesina de marcas
- promotions: tarjetas de ofertas + cuenta regresiva
- data-fallback: espejo local (28 productos, 6 ofertas)
- contact: submitContactMessage
- admin: panel (CRUD + mensajes + subida de imagenes)
- effects: pop-out 3D + hero flotante
### CSS
- style · gaming-theme · effects
## Backend (Supabase)
### Postgres (schema.sql)
- products · promotions · contact_messages · admin_users
- is_admin() SECURITY DEFINER · RLS solo-admin para escrituras
### Auth
- registro / inicio de sesion / sesiones
### Storage
- bucket product-images (lectura publica, escritura admin)
## Hosting
- Netlify estatico desde /public · auto-deploy desde GitHub master
## Docs
- openspec (config, project, changes)
````

---

## Flujos

### Carga de pagina publica con respaldo resiliente

```mermaid
flowchart TD
  A[El navegador abre la pagina] --> B[jsdelivr entrega supabase-js v2]
  B --> C{Existe el SDK global?}
  C -- no --> D[window.supabase = null]
  C -- si --> E[createClient URL + key publicable]
  E --> F[window.supabase = cliente real]
  D --> G[loadSiteData verifica el cliente]
  F --> G
  G --> H{Cliente listo?}
  H -- no --> I[Usar datos locales de data-fallback]
  H -- si --> J[Consultar productos + ofertas]
  J --> K{Error en la consulta?}
  K -- si --> I
  K -- no --> L[Renderizar grilla, carrusel, marquesina]
  I --> L
  L --> M[Cualquier error cae al respaldo; la pagina nunca queda vacia]
```

### Login de administrador y acceso al panel

```mermaid
flowchart TD
  A[Abrir pages/admin.html] --> B[initAdmin]
  B --> C[auth.getSession]
  C --> D{Sesion activa?}
  D -- no --> E[Mostrar formulario de login]
  D -- si --> F[rpc is_admin]
  F --> G{Es admin?}
  G -- si --> H[Mostrar panel: productos / ofertas / mensajes]
  G -- no --> I[Mostrar login + mensaje de denegado]
  E --> J[El admin ingresa credenciales]
  J --> K[signInWithPassword]
  K --> L{Correcto?}
  L -- error --> M[Mostrar error en pantalla]
  L -- ok --> F
```

### Creacion de producto con subida de imagen opcional

```mermaid
flowchart TD
  A[Boton Nuevo producto] --> B[newProductForm]
  B --> C[Completar campos + imagen opcional]
  C --> D[saveProduct: validar nombre + precio]
  D --> E{Se eligio archivo de imagen?}
  E -- si --> F[Validar MIME + maximo 2MB]
  F --> G{Valido?}
  G -- no --> H[Mostrar error y abortar]
  G -- si --> I[Subir archivo al bucket product-images]
  I --> J{Subida correcta?}
  J -- no --> H
  J -- si --> K[Construir URL publica de Storage]
  E -- no --> L[Usar URL del campo o placeholder]
  K --> M[persistProduct: insert o update]
  L --> M
  M --> N{Base correcta?}
  N -- no --> O[Mostrar error en pantalla]
  N -- si --> P[Recargar tabla de productos]
```

---

## Componentes

```mermaid
flowchart LR
  subgraph Navegador[Navegador]
    A[index / catalog / promotions]
    B[admin]
    C[about / contact / login / register]
  end

  subgraph JS[Modulos JS]
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

  P[Hosting estatico Netlify]
  Q[CDN jsdelivr]

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
  G -. respaldo .-> H
```

## Secuencias

### Carga del catalogo publico

```mermaid
sequenceDiagram
  participant Page as Navegador de la pagina
  participant CDN as CDN jsdelivr
  participant SB as Supabase
  participant FB as data-fallback.js
  Page->>CDN: cargar supabase-js@2
  CDN-->>Page: global UMD (contenedor del modulo)
  Page->>Page: supabase-config siempre crea el cliente real
  Page->>SB: loadSiteData: productos + ofertas
  alt fallo del CDN o error de consulta
    Page->>FB: leer datos locales
    FB-->>Page: 28 productos, 6 ofertas
  end
  Page->>Page: renderizar grilla, carrusel, marquesina
```

### Login de administrador y autorizacion

```mermaid
sequenceDiagram
  participant Admin as Navegador del admin
  participant P as admin.js
  participant Auth as Supabase Auth
  participant DB as Postgres RLS
  Admin->>P: abrir pages/admin.html
  P->>Auth: getSession()
  alt sin sesion
    Admin->>P: ingresar email + password
    P->>Auth: signInWithPassword()
    Auth-->>P: token de sesion
  end
  P->>DB: rpc is_admin()
  DB-->>P: true | false
  alt es admin
    P->>DB: cargar productos, ofertas, mensajes
    DB-->>P: filas
  else no es admin
    P-->>Admin: mensaje de denegado en el login
  end
```

### Creacion de producto con subida de imagen

```mermaid
sequenceDiagram
  participant Admin as Navegador del admin
  participant P as admin.js
  participant St as Storage de Supabase
  participant DB as tabla products
  P->>P: saveProduct valida nombre y precio
  alt se selecciono archivo de imagen
    P->>St: subir a product-images
    St-->>P: URL publica del objeto
  end
  P->>DB: insertar fila de producto
  DB-->>P: exito | error de RLS o constraint
  alt exito
    P->>DB: recargar lista de productos
    DB-->>P: filas actualizadas
  else error
    P-->>Admin: error visible en pantalla
  end
```