// Errores de dominio (Capa 3). La Capa 2 los mapea a HTTP / estado de formulario.
// Nunca exponen detalles internos ni mensajes de Prisma al cliente.

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Recurso inexistente. También se usa para cruce de tenant (404, no 403). */
export class NotFoundError extends DomainError {
  constructor(message = "Recurso no encontrado.") {
    super(message);
  }
}

/** El usuario está autenticado pero su rol no permite la acción. */
export class ForbiddenError extends DomainError {
  constructor(message = "No tienes permisos para esta acción.") {
    super(message);
  }
}

/** Falta de sesión válida. */
export class UnauthorizedError extends DomainError {
  constructor(message = "Debes iniciar sesión.") {
    super(message);
  }
}

/** Datos de entrada inválidos (tras validación Zod en la frontera). */
export class ValidationError extends DomainError {
  constructor(message = "Datos inválidos.") {
    super(message);
  }
}

/**
 * Cruce de tenant. Por seguridad NO se expone como tal al cliente: se trata
 * como NotFound (404) para no confirmar la existencia del recurso.
 */
export class TenantMismatchError extends NotFoundError {
  constructor(message = "Recurso no encontrado.") {
    super(message);
  }
}
