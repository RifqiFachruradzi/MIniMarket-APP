/** Error bisnis yang pesannya aman ditampilkan ke pengguna */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionState = { error?: string; success?: string } | undefined;

export function toActionError(err: unknown): ActionState {
  if (err instanceof AppError) return { error: err.message };
  console.error(err);
  return { error: "Terjadi kesalahan pada sistem. Silakan coba lagi." };
}
