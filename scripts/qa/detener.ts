/**
 * Detiene el entorno QA (`npm run qa:detener`).
 *
 * Lee `scratch/qa/entorno.json` y termina SOLO ese pid (y su árbol de hijos):
 * nunca busca ni mata "todos los node". Antes de matar confirma que el pid
 * sigue siendo quien escucha en el puerto del entorno, porque un pid viejo
 * podría haber sido reutilizado por otro proceso ajeno.
 *
 * No borra el schema `qa` ni los uploads: quedan para inspección y se
 * recrean en el próximo `npm run qa:entorno`.
 */
import {
  borrarEntorno,
  dormir,
  escuchaEnPuerto,
  leerEntorno,
  matarArbol,
  pidVivo,
  puertoLibre,
} from "./lib";

async function main() {
  const entorno = leerEntorno();
  if (!entorno) {
    console.log("No hay entorno QA registrado (scratch/qa/entorno.json no existe). Nada que detener.");
    return;
  }

  if (!pidVivo(entorno.pid)) {
    console.log(`El proceso ${entorno.pid} ya no existe. Se limpia el descriptor.`);
    borrarEntorno();
    return;
  }

  if (!escuchaEnPuerto(entorno.pid, entorno.puerto)) {
    console.log(
      `El pid ${entorno.pid} está vivo pero NO escucha en el puerto ${entorno.puerto}: ` +
        "ya no es el servidor QA (pid reutilizado). No se mata. Se limpia el descriptor.",
    );
    borrarEntorno();
    return;
  }

  matarArbol(entorno.pid);
  for (let i = 0; i < 20 && !(await puertoLibre(entorno.puerto)); i++) {
    await dormir(500);
  }
  borrarEntorno();
  const libre = await puertoLibre(entorno.puerto);
  console.log(
    libre
      ? `Entorno QA detenido (pid ${entorno.pid}); el puerto ${entorno.puerto} quedó libre.`
      : `Se terminó el pid ${entorno.pid}, pero el puerto ${entorno.puerto} sigue ocupado.`,
  );
  if (!libre) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
