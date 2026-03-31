import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { assertAdmin, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    return new Response(JSON.stringify({ isAdmin: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return json({ isAdmin: false });
  }
});

