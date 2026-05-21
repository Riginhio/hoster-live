import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseStatus = {
  connected: boolean;
  mode: "local" | "supabase";
  missingVariables: string[];
  message: string;
};

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfigStatus(): SupabaseStatus {
  const envVariables: Array<[string, string | undefined]> = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ];
  const missingVariables = envVariables.filter(([, value]) => !value).map(([name]) => name);

  if (missingVariables.length > 0) {
    return {
      connected: false,
      mode: "local",
      missingVariables,
      message: "Supabase no esta configurado. HOSTER LIVE continua en modo local.",
    };
  }

  return {
    connected: true,
    mode: "supabase",
    missingVariables: [],
    message: "Supabase conectado.",
  };
}

export function getSupabaseClient() {
  const status = getSupabaseConfigStatus();

  if (!status.connected) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return supabaseClient;
}
