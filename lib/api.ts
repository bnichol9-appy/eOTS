import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "./auth";
import { ClaudeError } from "./claude";

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response | object | null>;

/** Wraps a route handler: resolves params, serialises returned objects, maps errors to JSON. */
export function route<P = Record<string, never>>(fn: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const params = await ctx.params;
      const out = await fn(req, { params });
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (err) {
      if (err instanceof ApiError) return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status });
      if (err instanceof ClaudeError) return NextResponse.json({ error: err.message }, { status: 502 });
      console.error(err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function bad(message: string): never {
  throw new ApiError(400, message);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
