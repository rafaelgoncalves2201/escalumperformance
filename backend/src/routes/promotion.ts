import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

export const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
  minOrderValue: z.number().min(0).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

// Listar promoções
router.get('/', async (req: AuthRequest, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      where: { businessId: req.businessId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar promoções' });
  }
});

// Criar promoção
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body);

    const promotion = await prisma.promotion.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderValue: data.minOrderValue ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        active: data.active ?? true,
        order: data.order ?? 0,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(promotion);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao criar promoção' });
  }
});

// Atualizar promoção
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    const existing = await prisma.promotion.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Promoção não encontrada' });
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
        ...(data.minOrderValue !== undefined && { minOrderValue: data.minOrderValue }),
        ...(data.validFrom !== undefined && { validFrom: data.validFrom ? new Date(data.validFrom) : null }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil ? new Date(data.validUntil) : null }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    res.json(promotion);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao atualizar promoção' });
  }
});

// Deletar promoção
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.promotion.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Promoção não encontrada' });
    }

    await prisma.promotion.delete({ where: { id } });
    res.json({ message: 'Promoção deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar promoção' });
  }
});
