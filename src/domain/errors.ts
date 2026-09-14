export class AppError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
export function check(condition: unknown, message: string, status = 422): asserts condition {
  if (!condition) throw new AppError(message, status);
}
