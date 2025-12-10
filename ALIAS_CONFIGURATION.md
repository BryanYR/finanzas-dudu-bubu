# Alias de Paths Configurados

## 📁 Alias Disponibles

Tu proyecto ahora tiene los siguientes alias configurados para facilitar las importaciones:

### `@server/*`
Acceso directo a la carpeta `server/`

**Antes:**
```typescript
import { prisma } from '../../utils/db'
import { getUserFromSession } from '../../utils/auth'
```

**Ahora:**
```typescript
import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
```

---

### `@api/*`
Acceso directo a la carpeta `server/api/`

**Uso:**
```typescript
// Desde cualquier parte del proyecto
import someHandler from '@api/auth/login.post'
```

---

### `@prisma/*`
Acceso directo a la carpeta `prisma/`

**Uso:**
```typescript
// Para acceder a archivos en la carpeta prisma
import schema from '@prisma/schema.prisma'
```

---

## 🔧 Configuración

Los alias están configurados en dos archivos:

### `nuxt.config.ts`
```typescript
export default defineNuxtConfig({
  alias: {
    '@server': './server',
    '@api': './server/api',
    '@prisma': './prisma',
  },
})
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@server/*": ["./server/*"],
      "@api/*": ["./server/api/*"],
      "@prisma/*": ["./prisma/*"]
    }
  }
}
```

---

## ✅ Beneficios

1. **Menos errores** - No más rutas relativas confusas como `../../../utils/db`
2. **Más legible** - Código más claro y fácil de entender
3. **Refactorización segura** - Mover archivos no rompe las importaciones
4. **Autocompletado** - TypeScript reconoce los alias y ofrece autocompletado

---

## 🚀 Uso en Todos los Endpoints

Todos los archivos en `server/api/` han sido actualizados para usar `@server/*`:

```typescript
// ✅ Todos los endpoints ahora usan:
import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

// ❌ En lugar de:
import { prisma } from '../../utils/db'
import { getUserFromSession } from '../../utils/auth'
```

---

## 📝 Nota

Si VSCode muestra errores temporales de "Cannot find module", simplemente:
1. Reinicia el servidor de desarrollo: `npm run dev`
2. O recarga la ventana de VSCode: `Ctrl+Shift+P` → "Reload Window"

Los alias están correctamente configurados y funcionarán en runtime y durante el desarrollo.
