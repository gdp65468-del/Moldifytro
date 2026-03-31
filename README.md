# Moldify

Moldify e um MVP SaaS para criar imagens com molduras e logos compartilhaveis.

## Stack Atual

- Vite + React + TypeScript
- Tailwind CSS
- React Router + TanStack Query
- Konva para o editor visual
- Supabase (Auth, Postgres, Storage, Edge Functions)
- Asaas para checkout e webhook
- Cloudinary para assets de molduras da plataforma

## Frontend

1. Instale dependencias:

```bash
npm install
```

2. Copie `.env.example` para `.env` e preencha:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Rode:

```bash
npm run dev
```

## Supabase (Banco, RLS, Storage)

- Migrações SQL em `supabase/migrations`.
- Buckets esperados:
  - `users` (privado por owner)
  - `platform` (publico)

Aplicar schema:

```bash
supabase db push
```

## Edge Functions

Funcoes criadas em `supabase/functions`:

- `create-checkout`
- `publish-template`
- `track-template-use`
- `asaas-webhook`
- `admin-status`
- `admin-overview`
- `admin-list-templates`
- `admin-list-payments`
- `admin-list-users`
- `admin-platform-list`
- `admin-platform-toggle`
- `admin-platform-update`
- `admin-platform-create`
- `admin-set-template-visibility`

Secrets esperados:

- `ASAAS_API_KEY`
- `APP_BASE_URL`
- `ASAAS_API_BASE_URL`
- `ASAAS_WEBHOOK_TOKEN` (opcional, recomendado)
- `SUPABASE_SERVICE_ROLE_KEY`

## Migracao de Dados (Firebase -> Supabase)

Export Firebase:

```bash
npm run migrate:export-firebase
```

Import Supabase:

```bash
npm run migrate:import-supabase
```

Ordem aplicada no import:

1. `users`
2. `user_roles`
3. `platform_templates`
4. `user_templates`
5. `payments`
6. `template_uses`

## Estrutura

- `src/services`: camada Supabase (auth, templates, payments, storage, admin)
- `supabase/migrations`: schema SQL + RLS
- `supabase/functions`: backend serverless
- `scripts/migration`: export/import de dados
