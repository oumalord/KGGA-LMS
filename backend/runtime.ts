export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json<T>(data: T) {
  return data;
}

export function error(message: string, status = 400): never {
  throw new ApiError(status, message);
}

export function requireAuth() {
  return { requiresAuth: true as const };
}

export function router<T>(routes: T) {
  return routes;
}

export const secrets = {
  async listSecretNames() {
    return [] as string[];
  },
};