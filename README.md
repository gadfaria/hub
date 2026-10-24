# Vault

Um "cofre" pessoal, organizado em módulos (Finanças, …), com os dados guardados como JSON numa pasta do seu Google Drive. Sem backend — o app roda no navegador e conversa direto com a API do Drive.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui (layout baseado no bloco `dashboard-01`), gráficos com Recharts
- Google Identity Services (login) + Drive API v3 (armazenamento), escopo `drive.file`

## Módulos

Os módulos são fixos e definidos no código. Hoje:

- **Finanças** — contas por instituição (banco, corretora, cripto…), cada uma com um histórico de saldos. O patrimônio total é a soma do saldo mais recente de cada conta; o gráfico mostra a evolução ao longo do tempo.

Para criar um módulo novo:

1. Crie `src/modules/<id>/` com um `index.ts` exportando um `VaultModule` (`id`, `name`, `icon`, `Screen`).
2. Registre em `src/modules/index.ts`. Ele aparece na sidebar e em `#/<id>`.
3. Na tela, use `useCollection('<id>', EMPTY)` para ler e gravar `data/<id>.json`. `EMPTY` define as listas do módulo (ex.: `{ accounts: [], balances: [] }`); listas novas adicionadas depois não precisam de migração.

## Estrutura no Drive

```
Vault/
  data/
    financas.json   ← um arquivo por módulo
  anexos/           ← arquivos (PDF, imagens) — reservado para módulos futuros
```

Cada arquivo é marcado com `appProperties.vault` (`root`, `data`, `attachments`, `collection`), então o app encontra tudo por query, não por nome. Com o escopo `drive.file` o app só enxerga arquivos que ele mesmo criou.

Toda escrita faz **ler → mesclar → gravar**: cada item tem `id`, `updatedAt` e `deleted`, e no merge vence o `updatedAt` mais recente. Assim, editar em dois dispositivos não sobrescreve nada. Valores em dinheiro são guardados em centavos (inteiros).

## Código

```
src/
  auth/            login Google (token de 1h), contexto de sessão
  domain/          tipos base (Syncable) e merge
  storage/         DriveClient (REST), Vault (layout no Drive), VaultProvider, useCollection
  modules/         um diretório por módulo + registro (index.ts)
  components/      layout do dashboard (sidebar, header) e componentes shadcn em ui/
  screens/         tela de login
```

## Configurar o Google Cloud (uma vez)

1. Acesse <https://console.cloud.google.com/> e crie um projeto (ex.: `vault`).
2. **APIs e serviços → Biblioteca** → ative a **Google Drive API**.
3. **Google Auth Platform → Branding**: preencha nome do app e e-mail de suporte.
4. **Público-alvo**: tipo **Externo**. Clique em **Publicar app** (passa para "Em produção").
   - Com `drive.file` + `openid/email/profile` (escopos não sensíveis) não há revisão do Google.
5. **Acesso a dados**: adicione os escopos `.../auth/drive.file`, `openid`, `email`, `profile`.
6. **Clientes → Criar cliente** → tipo **Aplicativo da Web**:
   - **Origens JavaScript autorizadas**: `http://localhost:5180` e, depois, a URL de produção.
   - Não precisa de URI de redirecionamento.
7. Copie o **Client ID** e crie o arquivo `.env.local`:

   ```
   VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   ```

## Rodar

```bash
npm install
npm run dev
```

## Deploy

Site estático (`npm run build` → `dist/`). Vercel ou Cloudflare Pages funcionam direto; lembre de definir `VITE_GOOGLE_CLIENT_ID` nas variáveis de ambiente e adicionar a URL nas origens autorizadas do cliente OAuth.
# hub
