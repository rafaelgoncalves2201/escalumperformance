# Troubleshooting - Erro ao Criar Preferência de Pagamento

## Possíveis Causas e Soluções

### 1. Token do Mercado Pago não configurado ou inválido

**Sintoma:** Erro "Mercado Pago não configurado para este negócio"

**Solução:**
- Acesse o dashboard administrativo
- Vá em **Configurações > Integração Mercado Pago**
- Insira seu Access Token do Mercado Pago
- Certifique-se de usar o token correto (Production ou Test)

**Como obter o token:**
1. Acesse https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação ou selecione uma existente
3. Copie o **Access Token** (Production para produção, Test para testes)

### 2. Token inválido ou expirado

**Sintoma:** Erro 401 ou "Unauthorized" do Mercado Pago

**Solução:**
- Verifique se o token está correto (sem espaços extras)
- Gere um novo token no painel do Mercado Pago
- Certifique-se de estar usando o token correto (Production vs Test)

### 3. Formato dos dados incorreto

**Sintoma:** Erro 400 do Mercado Pago

**Possíveis problemas:**
- Valores monetários inválidos
- Campos obrigatórios faltando
- Caracteres especiais em campos que não aceitam

**Solução:**
- Verifique os logs do servidor (console.log)
- Os valores devem estar em formato numérico (não string)
- Nomes e descrições têm limites de caracteres

### 4. Problemas de rede ou timeout

**Sintoma:** Timeout ou erro de conexão

**Solução:**
- Verifique sua conexão com a internet
- O timeout padrão é de 5 segundos
- Em caso de problemas, aumente o timeout nas configurações

### 5. URLs de callback inválidas

**Sintoma:** Erro ao processar webhook

**Solução:**
- Certifique-se de que `FRONTEND_URL` e `BACKEND_URL` estão configurados no `.env`
- As URLs devem ser acessíveis publicamente (não localhost em produção)
- Para desenvolvimento local, use ngrok ou similar para webhooks

## Como Verificar o Erro

### 1. Verificar logs do servidor

O código agora imprime logs detalhados:
- Dados enviados ao Mercado Pago
- Resposta recebida
- Erros detalhados

### 2. Verificar no console do navegador

Abra o DevTools (F12) e verifique:
- Requisições na aba Network
- Erros na aba Console
- Resposta da API

### 3. Testar o token diretamente

Você pode testar o token usando curl:

```bash
curl -X POST \
  'https://api.mercadopago.com/checkout/preferences' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
  -d '{
    "items": [
      {
        "title": "Teste",
        "quantity": 1,
        "currency_id": "BRL",
        "unit_price": 10.50
      }
    ]
  }'
```

## Checklist de Verificação

- [ ] Token do Mercado Pago configurado nas Configurações
- [ ] Token válido e não expirado
- [ ] Variáveis de ambiente configuradas (FRONTEND_URL, BACKEND_URL)
- [ ] Pedido tem itens válidos
- [ ] Valores monetários estão corretos
- [ ] Conexão com internet funcionando
- [ ] Logs do servidor sendo verificados

## Mensagens de Erro Comuns

### "Mercado Pago não configurado para este negócio"
→ Configure o Access Token em Configurações

### "Erro ao criar preferência de pagamento"
→ Verifique os logs do servidor para detalhes
→ Verifique se o token está correto
→ Verifique se os dados do pedido estão válidos

### "Unauthorized" ou "401"
→ Token inválido ou expirado
→ Gere um novo token no painel do Mercado Pago

### "Bad Request" ou "400"
→ Dados inválidos na preferência
→ Verifique os logs para ver qual campo está incorreto

## Suporte

Se o problema persistir:
1. Verifique os logs completos do servidor
2. Copie a mensagem de erro completa
3. Verifique se o token está funcionando no painel do Mercado Pago
4. Teste com um pedido simples primeiro
