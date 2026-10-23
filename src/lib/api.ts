import type { ApiFailure, Collection } from "../types";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init
  });

  if (!response.ok) {
    let body: ApiFailure | null = null;
    try {
      body = (await response.json()) as ApiFailure;
    } catch {
      body = null;
    }
    throw new ApiError(
      response.status,
      body?.error || "request_failed",
      body?.message || "The request could not be completed."
    );
  }

  return (await response.json()) as T;
}

export function getCollection(): Promise<Collection> {
  return request<Collection>("/api/artworks");
}
