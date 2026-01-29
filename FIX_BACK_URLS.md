# Correção: Erro "auto_return invalid. back_url.success must be defined"

## Problema

O Mercado Pago retorna o erro:
```
auto_return invalid. back_url.success must be defined
```

Isso acontece quando você usa `auto_return: 'approved'` mas o campo `back_urls.success` não está definido ou está vazio.

## Solução Aplicada

### 1. Validação da URL

O código agora:
- Valida que `FRONTEND_URL` está configurado no `.env`
- Garante que a URL não está vazia
- Remove barras finais duplicadas
- Valida que a URL começa com `http` ou `https`

### 2. Configuração do .env

**IMPORTANTE:** Adicione estas variáveis no arquivo `.env` do backend:

```env
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
```

Para produção, use suas URLs reais:
```env
FRONTEND_URL=https://seu-dominio.com
BACKEND_URL=https://api.seu-dominio.com
```

### 3. Verificação

O código agora:
- Valida a URL antes de criar a preferência
- Mostra logs detalhados para debug
- Lança erros descritivos se algo estiver errado

## Como Verificar

1. **Verifique o arquivo `.env` do backend:**
   ```bash
   cd backend
   cat .env | grep FRONTEND_URL
   ```

2. **Se não estiver configurado, adicione:**
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

3. **Reinicie o servidor backend** após alterar o `.env`

4. **Verifique os logs** quando criar um pedido - você verá:
   ```
   URL de sucesso configurada: http://localhost:5173/pedido/seu-slug/1
   Preferência configurada com back_urls: { success: '...', failure: '...', pending: '...' }
   ```

## Erros Comuns

### "FRONTEND_URL não está configurado"
→ Adicione `FRONTEND_URL=http://localhost:5173` no `.env` do backend

### "URL de sucesso inválida"
→ Verifique se `FRONTEND_URL` não está vazio
→ Verifique se não há `undefined` na URL (pode indicar variável não definida)

### "back_urls.success não pode estar vazio"
→ A URL foi gerada como string vazia
→ Verifique se `business.slug` e `order.orderNumber` estão definidos

## Teste

Após configurar, teste criando um pedido. Os logs mostrarão:
- A URL configurada
- Os dados da preferência
- Qualquer erro detalhado

Se ainda houver problemas, verifique os logs do servidor para ver exatamente qual URL está sendo gerada.
