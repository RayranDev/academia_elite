/** Indicativos telefónicos para el selector de país (Colombia primero). */
export interface Indicativo {
  codigo: string; // "+57"
  pais: string;
  bandera: string;
}

export const INDICATIVOS: Indicativo[] = [
  { codigo: "+57", pais: "Colombia", bandera: "🇨🇴" },
  { codigo: "+52", pais: "México", bandera: "🇲🇽" },
  { codigo: "+54", pais: "Argentina", bandera: "🇦🇷" },
  { codigo: "+56", pais: "Chile", bandera: "🇨🇱" },
  { codigo: "+51", pais: "Perú", bandera: "🇵🇪" },
  { codigo: "+593", pais: "Ecuador", bandera: "🇪🇨" },
  { codigo: "+58", pais: "Venezuela", bandera: "🇻🇪" },
  { codigo: "+507", pais: "Panamá", bandera: "🇵🇦" },
  { codigo: "+506", pais: "Costa Rica", bandera: "🇨🇷" },
  { codigo: "+502", pais: "Guatemala", bandera: "🇬🇹" },
  { codigo: "+591", pais: "Bolivia", bandera: "🇧🇴" },
  { codigo: "+598", pais: "Uruguay", bandera: "🇺🇾" },
  { codigo: "+595", pais: "Paraguay", bandera: "🇵🇾" },
  { codigo: "+1", pais: "EE. UU. / Canadá", bandera: "🇺🇸" },
  { codigo: "+34", pais: "España", bandera: "🇪🇸" },
];

export const CODIGOS_PAIS = INDICATIVOS.map((i) => i.codigo);
