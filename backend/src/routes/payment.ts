import { Router } from 'express';
import { z } from 'zod';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import prisma from '../config/database.js';
import { io } from '../server.js';

export const router = Router();

const createPreferenceSchema = z.object({
  orderId: z.string().uuid(),
  businessSlug: z.string().min(1),
});

function getFrontendUrl(): string {
  const url = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
  if (!url) throw new Error('FRONTEND_URL não está configurado no .env');
  return url;
}

function getBackendUrl(): string | null {
  const url = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
  return url || null;
}

// Criar preferência de pagamento (Checkout Pro)
router.post('/preference', async (req, res) => {
  try {
    const data = createPreferenceSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { slug: data.businessSlug, active: true },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negócio não encontrado' });
    }

    if (!business.mercadoPagoToken || business.mercadoPagoToken.trim() === '') {
      return res.status(400).json({
        error: 'Mercado Pago não configurado para este negócio',
        message: 'Configure o Access Token nas Configurações do negócio',
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: data.orderId, businessId: business.id },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (order.paymentStatus === 'APPROVED') {
      return res.status(400).json({ error: 'Pedido já foi pago' });
    }

    if (order.paymentMethod === 'CASH_DELIVERY' || order.paymentMethod === 'CASH_PICKUP') {
      return res.status(400).json({
        error: 'Este pedido é pagamento na entrega/retirada',
        message: 'Não é possível gerar link de pagamento para pedidos que serão pagos na entrega ou na retirada.',
      });
    }

    const client = new MercadoPagoConfig({
      accessToken: business.mercadoPagoToken,
      options: { timeout: 10000 },
    });

    const preference = new Preference(client);

    const items: any[] = order.items.map((item) => ({
      title: item.product.name.substring(0, 256),
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: Number(Number(item.price).toFixed(2)),
      ...(item.notes ? { description: String(item.notes).substring(0, 256) } : {}),
    }));

    if (Number(order.deliveryFee) > 0) {
      items.push({
        title: 'Taxa de entrega',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(Number(order.deliveryFee).toFixed(2)),
      });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'Nenhum item no pedido' });
    }

    const frontendUrl = getFrontendUrl();
    const backUrl = `${frontendUrl}/pedido/${business.slug}/${order.orderNumber}`;

    // IMPORTANTE: Mercado Pago usa "back_urls" (não "redirect_urls")
    const preferenceBody: any = {
      items,
      back_urls: {
        success: backUrl,
        failure: backUrl,
        pending: backUrl,
      },
      external_reference: order.id,
    };

    // IMPORTANTE:
    // Em ambiente local (http/localhost) o Mercado Pago frequentemente retorna:
    // "auto_return invalid. back_url.success must be defined"
    // Mesmo com back_urls definido. Para evitar bloqueio no gateway,
    // não enviamos auto_return aqui (o redirecionamento manual via back_urls continua funcionando).

    const backendUrl = getBackendUrl();
    if (backendUrl) {
      preferenceBody.notification_url = `${backendUrl}/api/payment/webhook`;
    }

    const statementDescriptor = business.name
      .substring(0, 22)
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();
    if (statementDescriptor) {
      preferenceBody.statement_descriptor = statementDescriptor;
    }

    // Debug mínimo (sem token)
    console.log('[MP] Criando preferência', {
      businessSlug: business.slug,
      orderId: order.id,
      hasBackUrls: !!preferenceBody.back_urls?.success,
      backUrl: preferenceBody.back_urls?.success,
      hasNotificationUrl: !!preferenceBody.notification_url,
      hasStatementDescriptor: !!preferenceBody.statement_descriptor,
      hasAutoReturn: !!preferenceBody.auto_return,
    });

    const response = await preference.create({ body: preferenceBody });

    if (!response?.id || !response?.init_point) {
      throw new Error('Mercado Pago não retornou id/init_point na preferência');
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { mercadoPagoId: String(response.id) },
    });

    return res.json({
      initPoint: response.init_point,
      preferenceId: response.id,
    });
  } catch (error: any) {
    console.error('Erro ao criar preferência:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }

    const mpMessage =
      error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      'Erro ao criar preferência de pagamento';

    return res.status(500).json({ error: mpMessage });
  }
});

// Webhook do Mercado Pago (pagamentos)
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body ?? {};
    const paymentId = data?.id;
    const externalReference = data?.external_reference;

    if (type !== 'payment' || !paymentId) {
      return res.status(200).send('OK');
    }

    if (!externalReference) {
      return res.status(200).send('OK');
    }

    const order = await prisma.order.findUnique({
      where: { id: String(externalReference) },
      include: { business: { select: { mercadoPagoToken: true } } },
    });

    if (!order?.business?.mercadoPagoToken) {
      return res.status(200).send('OK');
    }

    const client = new MercadoPagoConfig({
      accessToken: order.business.mercadoPagoToken,
      options: { timeout: 10000 },
    });

    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });
    const status = paymentData?.status;

    const paymentStatus =
      status === 'approved'
        ? 'APPROVED'
        : status === 'rejected'
          ? 'REJECTED'
          : status === 'cancelled'
            ? 'CANCELLED'
            : 'PENDING';

    const paymentMethod = paymentData?.payment_method_id
      ? String(paymentData.payment_method_id).toUpperCase()
      : null;

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus, paymentMethod },
    });

    io.to(`business:${order.businessId}`).emit('payment-updated', {
      orderId: order.id,
      paymentStatus,
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(200).send('OK');
  }
});

// Status do pagamento/pedido (para front)
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, paymentMethod: true, status: true },
    });

    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    return res.json({
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      orderStatus: order.status,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

