# Deploy no Render – Escalum

Guia para configurar **frontend** e **backend** no Render e corrigir erro de login.

## 1. Serviços no Render

- **Backend**: Web Service (Node) — API + banco PostgreSQL.
- **Frontend**: Static Site **ou** Web Service (Node para servir o build) — conforme você configurou.

Anote as URLs:

- Backend: `https://seu-backend.onrender.com` (sem barra no final)
- Frontend: `https://seu-frontend.onrender.com` (sem barra no final)

---

## 2. Variáveis de ambiente

### Backend (Web Service)

| Variável       | Valor                                    | Obrigatório |
|----------------|------------------------------------------|-------------|
| `FRONTEND_URL` | URL do frontend no Render                | **Sim**     |
| `DATABASE_URL` | Connection string do PostgreSQL (Render) | **Sim**     |
| `JWT_SECRET`   | String aleatória longa                   | **Sim**     |
| `PORT`         | `3001` (ou a que o Render definir)       | Não         |

**Exemplo `FRONTEND_URL`:**

```env
FRONTEND_URL=https://seu-frontend.onrender.com
```

Se tiver www e sem www, use **vírgula** (sem espaços):

```env
FRONTEND_URL=https://seu-frontend.onrender.com,https://www.seu-frontend.onrender.com
```

O backend usa `FRONTEND_URL` para CORS. Se estiver errado ou faltando, o login falha por CORS.

---

### Frontend (Static Site ou Web Service)

| Variável        | Valor                     | Obrigatório |
|-----------------|---------------------------|-------------|
| `VITE_API_URL`  | URL do **backend** no Render | **Sim**     |

**Exemplo `VITE_API_URL`:**

```env
VITE_API_URL=https://seu-backend.onrender.com
```

- **Sem barra no final.**
- O frontend chama `{VITE_API_URL}/api` (ex.: `https://seu-backend.onrender.com/api`).
- Essa variável é **injetada em build time**. Depois de alterar, é obrigatório **Redeploy** do frontend.

---

## 3. Checklist para o login funcionar

1. **Backend**
   - `FRONTEND_URL` = URL exata do frontend (como o usuário acessa).
   - Serviço rodando (sem erro no deploy).

2. **Frontend**
   - `VITE_API_URL` = URL do backend (ex.: `https://seu-backend.onrender.com`).
   - **Redeploy** após mudar `VITE_API_URL`.

3. **CORS**
   - Backend permite a origem do frontend. O backend usa `FRONTEND_URL` para isso.
   - Nos logs do backend no Render deve aparecer algo como:  
     `CORS permitido para: https://seu-frontend.onrender.com`

4. **Cold start (free tier)**
   - No free tier, o backend “dorme” após inatividade. O primeiro request pode levar ~30–50 s.
   - Se o login demorar e depois funcionar, é cold start. O frontend já trata timeout com mensagem mais clara.

---

## 4. Redeploy no Render

- **Backend**: Environment → alterar `FRONTEND_URL` → **Save** → **Manual Deploy** (ou **Clear build cache & deploy** se precisar).
- **Frontend**: Environment → alterar `VITE_API_URL` → **Save** → **Manual Deploy** (ou **Clear build cache & deploy**).

Sempre redeploy do frontend após mudar `VITE_API_URL`.

---

## 5. Erros comuns no login

| Mensagem (exemplo) | Causa provável | O que fazer |
|--------------------|----------------|-------------|
| “Configure VITE_API_URL…” | Frontend sem `VITE_API_URL` ou sem redeploy | Definir `VITE_API_URL` no frontend e fazer **Redeploy**. |
| “Não foi possível conectar…” / “Cold start…” | Backend dormindo ou `FRONTEND_URL` errado | Confirmar `FRONTEND_URL`; esperar cold start ou usar plano pago. |
| “Email ou senha inválidos” | Credenciais erradas ou usuário inexistente | Verificar email/senha; criar conta se necessário. |
| CORS / “blocked by CORS” | `FRONTEND_URL` diferente da origem real do frontend | Ajustar `FRONTEND_URL` para a URL exata (com ou sem www, conforme usado). |

---

## 6. Verificar backend

```bash
curl https://seu-backend.onrender.com/api/health
```

Resposta esperada: `{"status":"ok","timestamp":"..."}`.

Se isso funcionar mas o login no frontend falhar, o problema costuma ser `VITE_API_URL` ou `FRONTEND_URL` / CORS.

---

## 7. Resumo rápido

- **Backend:** `FRONTEND_URL` = URL do frontend.
- **Frontend:** `VITE_API_URL` = URL do backend → depois **Redeploy**.
- Sem `VITE_API_URL`, o frontend tenta usar `/api` no próprio domínio e o login quebra em produção.
