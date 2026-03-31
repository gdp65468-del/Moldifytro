import type { Session, User } from "@supabase/supabase-js";
import { supabase, assertSupabaseEnabled } from "@/services/supabase";
import { mapUserProfileRow } from "@/services/mappers";
import type { UserProfile } from "@/types/user";

function buildFallbackProfile(user: User): UserProfile {
  return {
    id: user.id,
    name:
      String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim() ||
      "Criador Moldify",
    email: user.email ?? "",
    photoURL: user.user_metadata?.avatar_url as string | undefined,
    planType: "free",
    publishedTemplatesCount: 0,
    createdAt: new Date().toISOString(),
  };
}

async function upsertProfileFromSessionUser(user: User): Promise<UserProfile> {
  const fallback = buildFallbackProfile(user);

  const payload = {
    id: fallback.id,
    name: fallback.name,
    email: fallback.email,
    photo_url: fallback.photoURL ?? null,
    plan_type: "free",
    published_templates_count: 0,
  };

  const { error: upsertError } = await supabase.from("users").upsert(payload, {
    onConflict: "id",
  });

  if (upsertError) {
    console.error("Falha ao sincronizar usuario no Supabase:", upsertError);
    return fallback;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Falha ao carregar perfil no Supabase:", error);
    }
    return fallback;
  }

  return mapUserProfileRow(data as Record<string, unknown>);
}

async function profileFromSession(session: Session | null): Promise<UserProfile | null> {
  if (!session?.user) {
    return null;
  }

  return upsertProfileFromSessionUser(session.user);
}

export function subscribeToAuth(callback: (profile: UserProfile | null) => void) {
  assertSupabaseEnabled();

  void supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error("Falha ao obter sessao Supabase:", error);
      callback(null);
      return;
    }

    callback(await profileFromSession(data.session));
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void profileFromSession(session).then((profile) => callback(profile));
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInWithEmailPassword(email: string, password: string) {
  assertSupabaseEnabled();

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error("Informe e-mail e senha.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error(`Falha no login com e-mail/senha (${error.message}).`);
  }
}

export async function signInWithGoogle(redirectTo?: string) {
  assertSupabaseEnabled();

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : import.meta.env.VITE_APP_URL;
  const nextPath = redirectTo?.startsWith("/") ? redirectTo : "/dashboard";

  if (!baseUrl) {
    throw new Error("Nao foi possivel iniciar o login com Google sem uma URL base configurada.");
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL(nextPath, baseUrl).toString(),
    },
  });

  if (error) {
    throw new Error(`Falha ao iniciar login com Google (${error.message}).`);
  }
}

export async function signUpWithEmailPassword(email: string, password: string) {
  assertSupabaseEnabled();

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error("Informe e-mail e senha.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error(`Falha ao criar conta (${error.message}).`);
  }

  return {
    signedIn: Boolean(data.session),
    needsEmailConfirmation: !data.session,
  };
}

export async function signOutUser() {
  assertSupabaseEnabled();

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Nao foi possivel sair da conta.");
  }
}
