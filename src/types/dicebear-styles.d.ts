// Tipado laxo del JSON de estilo de DiceBear para no inferir el literal gigante
// (mantiene rápido a tsc). Solo exponemos lo que usamos: variantes y colores.
declare module "@dicebear/styles/toon-head.json" {
  const definicion: {
    components?: Record<string, { variants?: Record<string, unknown> }>;
    colors?: Record<string, { values?: string[] }>;
    [k: string]: unknown;
  };
  export default definicion;
}
