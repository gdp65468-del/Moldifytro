import { supabase } from "@/services/supabase";

type FunctionError = Error & {
  context?: {
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  };
};

export async function getFunctionErrorMessage(error: FunctionError) {
  if (error.context?.json) {
    try {
      const payload = await error.context.json();
      if (payload && typeof payload === "object" && "error" in payload) {
        return String((payload as { error?: unknown }).error ?? "");
      }
      if (payload) {
        return JSON.stringify(payload);
      }
    } catch {
      // ignore and fallback below
    }
  }

  if (error.context?.text) {
    try {
      return await error.context.text();
    } catch {
      // ignore and fallback below
    }
  }

  return error.message;
}

export async function invokeSupabaseFunction<TOutput>(name: string, body?: unknown): Promise<TOutput> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown> | undefined,
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  if (error) {
    const detail = await getFunctionErrorMessage(error as FunctionError);
    throw new Error(detail ? `Falha ao chamar ${name}: ${detail}` : `Falha ao chamar ${name}.`);
  }

  return data as TOutput;
}
