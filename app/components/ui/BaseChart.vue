<script setup lang="ts">
import type { Chart, ChartConfiguration } from 'chart.js'

const props = defineProps<{ config: ChartConfiguration; height?: number }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const render = async () => {
  if (!canvas.value) return
  // chart.js se carga solo en el cliente y bajo demanda (no pesa en las demás páginas)
  const { default: ChartJs } = await import('chart.js/auto')
  chart?.destroy()
  // El config es un objeto nuevo en cada cambio (viene de un computed), así que basta
  // con recrear el gráfico cuando cambia la referencia
  chart = new ChartJs(canvas.value, toRaw(props.config))
}

onMounted(render)
watch(() => props.config, render)
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height ?? 280}px` }">
    <canvas ref="canvas" role="img" aria-label="Gráfico"></canvas>
  </div>
</template>
