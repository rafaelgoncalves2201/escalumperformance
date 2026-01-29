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
        menuSubtitle: true,
        menuOpeningText: true,
        menuMoreInfoLabel: true,
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

// Distância em km entre dois pontos (fórmula de Haversine)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Buscar coordenadas de um CEP via BrasilAPI (v2 retorna location.coordinates)
async function getCepCoordinates(cep: string): Promise<{ lat: number; lon: number } | null> {
  const normalized = cep.replace(/\D/g, '').slice(0, 8);
  if (normalized.length !== 8) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${normalized}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.location?.coordinates;
    if (!coords) return null;
    const lat = coords.latitude != null ? parseFloat(String(coords.latitude)) : null;
    const lon = coords.longitude != null ? parseFloat(String(coords.longitude)) : null;
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

// Calcular taxa e tempo de entrega por CEP
router.get('/:slug/calculate-delivery', async (req, res) => {
  try {
    const { slug } = req.params;
    const cep = String(req.query.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido. Informe 8 dígitos.' });
    }

    const business = await prisma.business.findUnique({
      where: { slug, active: true },
      select: {
        deliveryFee: true,
        deliveryFeePerKm: true,
        businessCep: true,
        avgPrepTime: true,
        deliveryEnabled: true,
      },
    });

    if (!business || !business.deliveryEnabled) {
      return res.status(404).json({ error: 'Delivery não disponível para este estabelecimento.' });
    }

    const businessCepNorm = business.businessCep?.replace(/\D/g, '').slice(0, 8);
    const hasPerKm =
      businessCepNorm?.length === 8 &&
      business.deliveryFeePerKm != null &&
      Number(business.deliveryFeePerKm) >= 0;

    let fee: number;
    let distanceKm: number | undefined;

    if (hasPerKm) {
      const [businessCoords, customerCoords] = await Promise.all([
        getCepCoordinates(businessCepNorm),
        getCepCoordinates(cep),
      ]);
      if (!businessCoords || !customerCoords) {
        // Fallback: usar taxa fixa quando não conseguir coordenadas (ex.: BrasilAPI fora do ar)
        fee = Number(business.deliveryFee);
      } else {
        distanceKm = haversineKm(
          businessCoords.lat,
          businessCoords.lon,
          customerCoords.lat,
          customerCoords.lon
        );
        fee = Math.round(distanceKm * Number(business.deliveryFeePerKm) * 100) / 100;
      }
    } else {
      fee = Number(business.deliveryFee);
    }

    const estimatedMinutes = business.avgPrepTime || 30;

    res.json({
      fee,
      estimatedMinutes,
      cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      ...(distanceKm != null && { distanceKm: Math.round(distanceKm * 100) / 100 }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular entrega' });
  }
});
