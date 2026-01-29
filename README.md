# Escalum - Sistema SaaS de Pedidos Online

Sistema completo de pedidos online para restaurantes, com área do cliente e dashboard administrativo.

## 🚀 Tecnologias

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Socket.io (WebSockets para tempo real)
- Mercado Pago SDK
- JWT para autenticação
- Multer para upload de imagens

### Frontend
- React + TypeScript + Vite
- TailwindCSS
- React Router
- Zustand (gerenciamento de estado)
- Socket.io Client
- React Hot Toast

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL
- npm ou yarn

## 🛠️ Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm run install:all
```

3. Configure o banco de dados:
```bash
cd backend
cp .env.example .env
# Edite o .env com suas configurações
```

4. Configure o banco de dados:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Inicie o servidor:
```bash
# Na raiz do projeto
npm run dev
```

O backend estará em `http://localhost:3001` e o frontend em `http://localhost:5173`

## 📁 Estrutura do Projeto

```
escalum/
├── backend/
│   ├── src/
│   │   ├── routes/       # Rotas da API
│   │   ├── middleware/   # Middlewares (auth, etc)
│   │   ├── config/       # Configurações
│   │   └── websocket.ts  # WebSocket setup
│   ├── prisma/
│   │   └── schema.prisma # Schema do banco
│   └── uploads/          # Imagens enviadas
├── frontend/
│   ├── src/
│   │   ├── pages/        # Páginas
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── store/        # Estado global (Zustand)
│   │   └── lib/          # Utilitários
└── package.json          # Workspace root
```

## 🎨 Design System

- **Fundo**: Preto (#000000)
- **Cor Primária**: Azul #364C66
- **Variações**: Azul claro (#4A6B8A) e escuro (#2A3A4D)
- **Mobile-first**: Design totalmente responsivo

## 🔐 Autenticação

O sistema usa JWT para autenticação. O token é armazenado no localStorage e enviado em todas as requisições autenticadas.

## 💳 Integração Mercado Pago

**Importante:** Cada estabelecimento deve fornecer seu próprio Access Token do Mercado Pago.

1. O proprietário do negócio acessa o painel do Mercado Pago: https://www.mercadopago.com.br/developers/panel
2. Obtém seu Access Token (Production ou Test)
3. Configura no dashboard do Escalum em **Configurações > Integração Mercado Pago**
4. Os pagamentos são creditados **diretamente na conta do Mercado Pago do estabelecimento**
5. Cada negócio tem isolamento completo - não há compartilhamento de tokens ou contas

## 📱 Funcionalidades

### Área do Cliente
- Menu público por link único
- Carrinho de compras
- Seleção de tipo de pedido (Delivery/Pickup)
- Checkout integrado com Mercado Pago
- Acompanhamento de pedido em tempo real

### Dashboard Admin
- Gerenciamento de categorias e produtos
- Upload de imagens
- Gerenciamento de pedidos em tempo real
- Estatísticas do dia
- Configurações do negócio
- Integração Mercado Pago

## 🔒 Segurança

- Isolamento de dados por negócio (multi-tenancy)
- Validação de dados com Zod
- Senhas hasheadas com bcrypt
- Autenticação JWT
- CORS configurado

## 📝 Notas

- Cada negócio tem um link único e permanente
- O sistema não gera dados fake - tudo começa vazio
- Arquitetura preparada para escalar como SaaS
- Webhooks do Mercado Pago para confirmação automática de pagamentos

## 🚀 Deploy

Para produção:
1. Configure variáveis de ambiente
2. Execute `npm run build` em ambos frontend e backend
3. Configure um servidor web (nginx) para servir o frontend
4. Configure PM2 ou similar para o backend
5. Configure SSL para webhooks do Mercado Pago

## 📄 Licença

Este projeto é privado e proprietário.
