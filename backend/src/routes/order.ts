import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { io } from '../server.js';

export const router = Router();

const createOrderSchema = z.object({
  type: z.enum(['DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['ONLINE', 'CASH_DELIVERY', 'CASH_PICKUP']).optional().default('ONLINE'),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  deliveryAddress: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
    addons: z.any().optional(),
  })).min(1),
}).refine(
  (data) => {
    if (data.type === 'DELIVERY' && data.paymentMethod === 'CASH_PICKUP') return false;
    if (data.type === 'PICKUP' && data.paymentMethod === 'CASH_DELIVERY') return false;
    return true;
  },
  { message: 'Forma de pagamento inválida para o tipo de pedido', path: ['paymentMethod'] }
);

// Criar pedido (público - do menu)
router.post('/', async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const { businessSlug } = req.query;

    if (!businessSlug) {
      return res.status(400).json({ error: 'Slug do negócio é obrigatório' });
    }

    const business = await prisma.business.findUnique({
      where: { slug: businessSlug as string, active: true },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negócio não encontrado' });
    }

    // Validar tipo de pedido
    if (data.type === 'DELIVERY' && !business.deliveryEnabled) {
      return res.status(400).json({ error: 'Delivery não está habilitado' });
    }
    if (data.type === 'PICKUP' && !business.pickupEnabled) {
      return res.status(400).json({ error: 'Retirada não está habilitada' });
    }
    if (data.type === 'DELIVERY' && !data.deliveryAddress) {
      return res.status(400).json({ error: 'Endereço de entrega é obrigatório' });
    }

    // Buscar produtos e calcular valores
    const productIds = data.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: business.id,
        active: true
      }
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Um ou mais produtos não foram encontrados' });
    }

    let subtotal = 0;
    const orderItems = data.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error('Produto não encontrado');

      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;

      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        notes: item.notes,
        addons: item.addons,
      };
    });

    const deliveryFee = data.type === 'DELIVERY' ? Number(business.deliveryFee) : 0;
    const total = subtotal + deliveryFee;

    // Obter próximo número de pedido
    const lastOrder = await prisma.order.findFirst({
      where: { businessId: business.id },
      orderBy: { orderNumber: 'desc' }
    });

    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    // paymentMethod: ONLINE => null (será preenchido pelo webhook do MP); CASH_* => salvar
    const paymentMethodForDb =
      data.paymentMethod === 'CASH_DELIVERY' || data.paymentMethod === 'CASH_PICKUP'
        ? data.paymentMethod
        : null;

    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber,
        type: data.type,
        paymentMethod: paymentMethodForDb,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        deliveryAddress: data.deliveryAddress,
        subtotal,
        deliveryFee,
        total,
        estimatedTime: business.avgPrepTime,
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        }
      }
    });

    // Notificar via WebSocket
    io.to(`business:${business.id}`).emit('new-order', order);

    res.status(201).json(order);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

// Listar pedidos (admin)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        businessId: req.businessId,
        ...(status && { status: status as string })
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

// Obter pedido específico
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        businessId: req.businessId
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

// Atualizar status do pedido
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['NEW', 'PREPARING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        businessId: req.businessId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Pagamento por gateway: só liberar para preparação quando estiver pago
    const isCashPayment = order.paymentMethod === 'CASH_DELIVERY' || order.paymentMethod === 'CASH_PICKUP';
    if (status === 'PREPARING' && !isCashPayment && order.paymentStatus !== 'APPROVED') {
      return res.status(400).json({
        error: 'Aguardando confirmação do pagamento',
        message: 'Pedidos pagos pelo Mercado Pago só podem ir para preparação após o pagamento ser aprovado.',
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        }
      }
    });

    // Notificar via WebSocket
    io.to(`business:${req.businessId}`).emit('order-updated', updated);
    io.to(`order:${id}`).emit('order-status-changed', { id, status });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Obter pedido por número (público - para cliente acompanhar)
router.get('/track/:businessSlug/:orderNumber', async (req, res) => {
  try {
    const { businessSlug, orderNumber } = req.params;

    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }
    });

    if (!business) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const order = await prisma.order.findFirst({
      where: {
        businessId: business.id,
        orderNumber: parseInt(orderNumber)
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});
