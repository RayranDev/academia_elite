// Shim: los tipos de sharp existen pero su campo "exports" no los resuelve bajo
// moduleResolution "bundler". Declaramos la API mínima que usamos (procesar foto).
declare module "sharp" {
  interface SharpInstance {
    rotate(): SharpInstance;
    resize(
      width: number,
      height: number,
      opts?: { fit?: string; withoutEnlargement?: boolean },
    ): SharpInstance;
    webp(opts?: { quality?: number }): SharpInstance;
    png(opts?: { compressionLevel?: number }): SharpInstance;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: Buffer | Uint8Array): SharpInstance;
  export default sharp;
}
