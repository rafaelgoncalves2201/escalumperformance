# Solução Definitiva: "auto_return invalid. back_url.success must be defined"

## Problema

O Mercado Pago retorna erro mesmo quando `back_urls.success` parece estar definido.

## Causa Raiz

O problema pode ocorrer quando:
1. O objeto `back_urls` não está sendo serializado corretamente
2. A URL contém valores `undefined` ou está vazia
3. O SDK do Mercado Pago está recebendo o objeto em formato incorreto

## Solução Implementada

### 1. Construção Explícita do Objeto

O código agora constrói o objeto `back_urls` de forma explícita ANTES de adicionar ao `preferenceData`:

```typescript
const backUrls = {
  success: successUrl,
  failure: successUrl,
  pending: successUrl,
};
```

### 2. Validações Múltiplas

Foram adicionadas validações em várias etapas:
- Antes de construir o objeto
- Depois de construir o objeto
- Antes de enviar ao Mercado Pago
- Garantindo que todas as URLs são strings válidas

### 3. Sanitização Final

Antes de enviar, o código:
- Converte todas as URLs para string explicitamente
- Remove espaços em branco com `.trim()`
- Garante que failure e pending têm valores válidos (usam success como fallback)

### 4. Logs Detalhados

O código agora mostra:
- URL de sucesso configurada
- Objeto back_urls completo
- Objeto final antes de enviar
- Qualquer erro com detalhes

## Como Verificar se Está Funcionando

### 1. Verifique os Logs do Servidor

Quando criar um pedido, você verá logs como:

```
URL de sucesso configurada: http://localhost:5173/pedido/seu-slug/1
back_urls que será enviado: {
  "success": "http://localhost:5173/pedido/seu-slug/1",
  "failure": "http://localhost:5173/pedido/seu-slug/1",
  "pending": "http://localhost:5173/pedido/seu-slug/1"
}
Objeto final que será enviado ao Mercado Pago: { ... }
```

### 2. Se Ainda Houver Erro

Os logs mostrarão exatamente qual parte está falhando:
- Se a URL está vazia
- Se há valores undefined
- Se o tipo está incorreto

### 3. Verifique o .env

Certifique-se de que está configurado:

```env
FRONTEND_URL=http://localhost:5173
```

**IMPORTANTE:** Sem barra no final!

## Checklist de Verificação

- [ ] `FRONTEND_URL` está configurado no `.env` do backend
- [ ] `FRONTEND_URL` não tem barra no final
- [ ] Servidor backend foi reiniciado após alterar `.env`
- [ ] Logs mostram URL válida sendo gerada
- [ ] Logs mostram `back_urls` com valores válidos
- [ ] Não há erros de validação antes de enviar ao Mercado Pago

## Se o Problema Persistir

1. **Verifique os logs completos** - eles mostram exatamente o que está sendo enviado
2. **Teste a URL manualmente** - copie a URL dos logs e teste no navegador
3. **Verifique se há caracteres especiais** - URLs devem ser válidas
4. **Teste com um token de teste** do Mercado Pago primeiro

## Código de Validação

O código agora tem múltiplas camadas de validação:

1. Validação da URL base (`FRONTEND_URL`)
2. Validação da URL completa antes de usar
3. Validação do objeto `back_urls` após construção
4. Validação final antes de enviar ao SDK
5. Sanitização e conversão explícita para string

Isso garante que o erro seja capturado ANTES de chegar ao Mercado Pago, com mensagens claras sobre o que está errado.
