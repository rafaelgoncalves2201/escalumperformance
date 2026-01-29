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
