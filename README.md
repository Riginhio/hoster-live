# HOSTER LIVE

Hospitality Gaming Platform.

## Supabase

La app ya incluye `@supabase/supabase-js`. Para activar Supabase, crea un archivo `.env.local` en la raiz del proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Si faltan estas variables, HOSTER LIVE no falla: mantiene el modo local con mocks y `localStorage`.

## Comandos

```bash
npm run dev
npm run build
```
