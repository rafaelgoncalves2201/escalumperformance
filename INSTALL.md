# Guia de Instalação - Escalum

## Passo a Passo Completo

### 1. Instalar Dependências

```bash
# Na raiz do projeto
npm install

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ../frontend
npm install
```

### 2. Configurar Banco de Dados PostgreSQL

1. Instale o PostgreSQL se ainda não tiver
2. Crie um banco de dados:
```sql
CREATE DATABASE escalum;
```

3. Configure o arquivo `.env` no backend:
```bash
cd backend
cp .env.example .env
```

Edite o `.env` com suas configurações:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/escalum?schema=public"
JWT_SECRET="sua-chave-secreta-super-segura-aqui"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001"
```

### 3. Configurar Prisma

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

Isso criará todas as tabelas no banco de dados.

### 4. Criar Diretórios de Upload

```bash
cd backend
mkdir -p uploads/logos
mkdir -p uploads/products
```

### 5. Iniciar o Servidor

**Opção 1: Usando o script da raiz (recomendado)**
```bash
# Na raiz do projeto
npm run dev
```

Isso iniciará tanto o backend quanto o frontend simultaneamente.

**Opção 2: Separadamente**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 6. Acessar a Aplicação

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Prisma Studio** (opcional): `cd backend && npx prisma studio`

### 7. Criar Primeira Conta

1. Acesse http://localhost:5173/admin/register
2. Preencha os dados:
   - Nome do negócio
   - Email
   - Slug (será usado no link do menu, ex: `meu-restaurante`)
   - Senha (mínimo 6 caracteres)
3. Após criar a conta, você será redirecionado para o dashboard

### 8. Configurar Mercado Pago (Opcional)

1. Acesse https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação
3. Obtenha seu Access Token
4. No dashboard do Escalum, vá em Configurações
5. Cole o Access Token no campo "Integração Mercado Pago"

## Estrutura de URLs

### Cliente (Público)
- Menu: `/menu/{slug-do-negocio}`
- Acompanhar pedido: `/pedido/{slug}/{numero-do-pedido}`

### Admin
- Login: `/admin/login`
- Registro: `/admin/register`
- Dashboard: `/admin`
- Categorias: `/admin/categories`
- Produtos: `/admin/products`
- Pedidos: `/admin/orders`
- Configurações: `/admin/settings`

## Troubleshooting

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`
- Teste a conexão: `psql -U usuario -d escalum`

### Erro ao fazer upload de imagens
- Verifique se os diretórios `uploads/logos` e `uploads/products` existem
- Verifique permissões de escrita

### Erro de CORS
- Verifique se `FRONTEND_URL` no `.env` está correto
- Certifique-se de que o frontend está rodando na porta 5173

### WebSocket não conecta
- Verifique se o backend está rodando
- Confirme que o token JWT está sendo enviado corretamente

## Próximos Passos

1. Configure seu negócio em Configurações
2. Crie categorias
3. Adicione produtos
4. Configure o Mercado Pago
5. Compartilhe o link do menu com seus clientes!
