import { describe, it, expect } from "vitest";
import { opcionesPgDesdeUrl } from "@/lib/db-schema";
import { urlDeE2E } from "../e2e/global-setup";

describe("opcionesPgDesdeUrl", () => {
  it("lee el schema de la URL (el adapter de Prisma no lo hace solo)", () => {
    expect(opcionesPgDesdeUrl("postgresql://u:p@h:5432/postgres?schema=e2e")).toEqual({
      schema: "e2e",
    });
  });

  it("respeta el schema que arma la suite E2E, con pgbouncer incluido", () => {
    const url = urlDeE2E("postgresql://u:p@h:6543/postgres?pgbouncer=true");
    expect(opcionesPgDesdeUrl(url)).toEqual({ schema: "e2e" });
  });

  it("sin schema, o con public, no cambia nada", () => {
    expect(opcionesPgDesdeUrl("postgresql://u:p@h:5432/postgres")).toEqual({});
    expect(opcionesPgDesdeUrl("postgresql://u:p@h:5432/postgres?schema=public")).toEqual({});
  });

  it("una URL inválida no rompe el arranque", () => {
    expect(opcionesPgDesdeUrl("no es una url")).toEqual({});
  });
});
