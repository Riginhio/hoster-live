import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseStatus = {
  connected: boolean;
  mode: "local" | "supabase";
  missingVariables: string[];
  message: string;
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlPreview?: string;
};

let supabaseClient: SupabaseClient | null = null;
let hasLoggedSupabaseStatus = false;

function previewValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.length <= 18 ? `${value.slice(0, 4)}...` : `${value.slice(0, 12)}...${value.slice(-4)}`;
}

function logSupabaseStatus(status: SupabaseStatus) {
  if (process.env.NODE_ENV !== "development" || hasLoggedSupabaseStatus) {
    return;
  }

  hasLoggedSupabaseStatus = true;
  console.info("[HOSTER LIVE] Supabase config", {
    connected: status.connected,
    hasUrl: status.hasUrl,
    hasAnonKey: status.hasAnonKey,
    urlPreview: status.urlPreview,
    missingVariables: status.missingVariables,
  });
}

export function getSupabaseConfigStatus(): SupabaseStatus {
  const envVariables: Array<[string, string | undefined]> = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ];
  const missingVariables = envVariables.filter(([, value]) => !value).map(([name]) => name);

  if (missingVariables.length > 0) {
    const status = {
      connected: false,
      mode: "local",
      missingVariables,
      message: "Supabase no esta configurado. HOSTER LIVE continua en modo local.",
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      urlPreview: previewValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    } satisfies SupabaseStatus;

    logSupabaseStatus(status);
    return status;
  }

  const status = {
    connected: true,
    mode: "supabase",
    missingVariables: [],
    message: "Supabase conectado.",
    hasUrl: true,
    hasAnonKey: true,
    urlPreview: previewValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  } satisfies SupabaseStatus;

  logSupabaseStatus(status);
  return status;
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

export function getSupabaseClientDebugStatus() {
  const status = getSupabaseConfigStatus();

  return {
    ...status,
    clientCreated: Boolean(supabaseClient) || Boolean(getSupabaseClient()),
  };
}
