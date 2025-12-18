# Estructura de Iconos

Esta carpeta contiene todos los iconos SVG organizados como componentes de Vue reutilizables.

## Estructura de Carpetas

```
icons/
├── common/           # Iconos compartidos entre módulos
│   ├── PlusIcon.vue
│   ├── EditIcon.vue
│   ├── DeleteIcon.vue
│   ├── RefreshIcon.vue
│   ├── CheckCircleIcon.vue
│   ├── CheckIcon.vue
│   ├── WarningIcon.vue
│   ├── DocumentTextIcon.vue
│   ├── EmptyStateIcon.vue
│   ├── EyeIcon.vue
│   ├── LockIcon.vue
│   ├── InfoIcon.vue
│   ├── HistoryIcon.vue
│   └── PaymentIcon.vue
│
├── dashboard/        # Iconos específicos del dashboard
│   ├── MoneyIcon.vue
│   ├── WalletIcon.vue
│   ├── CreditCardIcon.vue
│   ├── DocumentIcon.vue
│   ├── ShieldIcon.vue
│   └── CalendarIcon.vue
│
├── categorias/       # Iconos del módulo de categorías
│   └── TagIcon.vue
│
├── ingresos/         # Iconos del módulo de ingresos
│   ├── TrendingUpIcon.vue
│   └── IncomeIcon.vue
│
├── gastos/           # Iconos del módulo de gastos
│   ├── ExpenseIcon.vue
│   └── DollarIcon.vue
│
├── deudas/           # Iconos del módulo de deudas
│   ├── DebtIcon.vue
│   └── ClockIcon.vue
│
├── ahorros/          # Iconos del módulo de ahorros
│   ├── SavingsIcon.vue
│   └── GoalIcon.vue
│
├── tarjetas/         # Iconos del módulo de tarjetas
│   └── CardIcon.vue
│
└── planificacion/    # Iconos del módulo de planificación
    ├── ChartBarIcon.vue
    ├── ChecklistIcon.vue
    └── LightBulbIcon.vue
```

## Uso

### Importación

```vue
<script setup lang="ts">
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import MoneyIcon from '@components/icons/dashboard/MoneyIcon.vue'
</script>
```

### Uso Básico

```vue
<template>
  <PlusIcon />
</template>
```

### Con Clases Personalizadas

Todos los iconos aceptan una prop `customClass` para personalizar estilos:

```vue
<template>
  <!-- Tamaño personalizado -->
  <PlusIcon custom-class="h-8 w-8" />
  
  <!-- Color personalizado -->
  <PlusIcon custom-class="text-blue-600" />
  
  <!-- Múltiples clases -->
  <PlusIcon custom-class="h-6 w-6 text-red-500 hover:text-red-700" />
</template>
```

## Props

Todos los componentes de iconos aceptan las siguientes props:

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `customClass` | `string` | No | Clases de Tailwind CSS adicionales |

## Tamaños por Defecto

- **Iconos comunes**: `h-5 w-5`
- **Iconos de dashboard**: `h-8 w-8`
- **Iconos de planificación**: Variable según contexto

Puedes sobreescribir el tamaño usando `customClass`:

```vue
<PlusIcon custom-class="h-10 w-10" />
```

## Convenciones

1. **Nombres descriptivos**: Los iconos deben tener nombres que describan claramente su función
2. **Organización por módulo**: Iconos específicos de un módulo se colocan en su carpeta correspondiente
3. **Iconos compartidos en `common/`**: Si un icono se usa en múltiples módulos, debe estar en `common/`
4. **Sufijo `Icon`**: Todos los componentes terminan con "Icon" para fácil identificación

## Migración de SVG Inline

### Antes ❌
```vue
<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
</svg>
```

### Después ✅
```vue
<script setup lang="ts">
import PlusIcon from '@components/icons/common/PlusIcon.vue'
</script>

<template>
  <PlusIcon />
</template>
```

## Beneficios

✅ **Reutilización**: Un icono se define una vez y se usa en múltiples lugares  
✅ **Consistencia**: Todos los iconos tienen la misma estructura y comportamiento  
✅ **Mantenimiento**: Cambiar un icono actualiza todas sus instancias  
✅ **Tipado**: TypeScript proporciona autocompletado y validación  
✅ **Tree-shaking**: Solo se incluyen los iconos utilizados en el bundle final  
✅ **Legibilidad**: El código es más limpio y fácil de entender

## Agregar Nuevos Iconos

1. Crea el archivo en la carpeta apropiada
2. Usa la siguiente plantilla:

```vue
<template>
  <svg
    class="h-5 w-5"
    :class="customClass"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <!-- Tu path SVG aquí -->
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="..."
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  customClass?: string
}>()
</script>
```

3. Importa y usa el nuevo icono donde lo necesites
