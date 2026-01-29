import { Router } from 'express';
import prisma from '../config/database.js';

export const router = Router();

// Obter menu público por slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const business = await prisma.business.findUnique({
      where: { slug, active: true },
      select: {
        id: true,
        name: true,
        logo: true,
        menuBannerImage: true,
        menuWallpaperImage: true,
        menuPrimaryColor: true,
        menuBackgroundColor: true,
        menuTextColor: true,
        slug: true,
        phone: true,
        address: true,
        openingHours: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: true,
        avgPrepTime: true,
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'Menu não encontrado' });
    }

    const categories = await prisma.category.findMany({
      where: {
        businessId: business.id,
        active: true
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        products: {
          where: { active: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
          }
        }
      }
    });

    res.json({
      business,
      categories,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar menu' });
  }
});

// Calcular taxa e tempo de entrega por CEP (para calculador no frontend)
router.get('/:slug/calculate-delivery', async (req, res) => {
  try {
    const { slug } = req.params;
    const cep = String(req.query.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido. Informe 8 dígitos.' });
    }

    const business = await prisma.business.findUnique({
      where: { slug, active: true },
      select: { deliveryFee: true, avgPrepTime: true, deliveryEnabled: true },
    });

    if (!business || !business.deliveryEnabled) {
      return res.status(404).json({ error: 'Delivery não disponível para este estabelecimento.' });
    }

    // Por enquanto retorna a taxa fixa do negócio; depois pode-se adicionar zonas por CEP
    const fee = Number(business.deliveryFee);
    const estimatedMinutes = business.avgPrepTime || 30;

    res.json({
      fee,
      estimatedMinutes,
      cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular entrega' });
  }
});
