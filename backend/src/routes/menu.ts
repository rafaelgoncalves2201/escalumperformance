import { Router } from 'express';
import prisma from '../config/database.js';

export const router = Router();

// Obter menu público por slug
router.get('/:slug', async (req, res) => {
  try {
    const slugNorm = String(req.params.slug || '').trim();

    const business = await prisma.business.findFirst({
      where: { slug: slugNorm },
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

// Distância em km entre dois pontos (Haversine)
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

type ViaCepResp = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

async function getAddressFromCep(cep: string): Promise<string | null> {
  const normalized = cep.replace(/\D/g, '').slice(0, 8);
  if (normalized.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${normalized}/json/`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as ViaCepResp;
    if (data.erro) return null;

    const parts = [data.logradouro, data.bairro, data.localidade, data.uf, 'Brasil'].filter(Boolean);
    const q = parts.join(', ').trim();
    return q ? q : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeWithNominatim(query: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&addressdetails=0&q=${encodeURIComponent(query)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          // ideal: colocar um contato real
          'User-Agent': 'escalum/1.0 (contact: suporte@escalum.app)',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      });

      // rate-limit do nominatim
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1200 * attempt));
        continue;
      }

      if (!res.ok) return null;

      const data = (await res.json()) as any[];
      if (!data?.length) return null;

      const lat = Number(data[0]?.lat);
      const lon = Number(data[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      return { lat, lon };
    } catch {
      await new Promise(r => setTimeout(r, 500 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

async function getCepCoordinates(cep: string): Promise<{ lat: number; lon: number } | null> {
  const normalized = cep.replace(/\D/g, '').slice(0, 8);
  if (normalized.length !== 8) return null;

  // 1) BrasilAPI (se tiver coords)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${normalized}`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      const coords = data?.location?.coordinates;
      if (coords) {
        const lat = Number(coords.latitude);
        const lon = Number(coords.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
      }
    }
  } catch {}

  // 2) Nominatim: tenta pelo CEP direto
  const byCep = await geocodeWithNominatim(`${normalized}, Brasil`);
  if (byCep) return byCep;

  // 3) ViaCEP + endereço completo
  const addrQuery = await getAddressFromCep(normalized);
  if (!addrQuery) return null;

  const byAddress = await geocodeWithNominatim(addrQuery);
  if (byAddress) return byAddress;

  // 4) Último fallback: cidade/UF (evita quebrar, mas pode ser centro da cidade)
  const parts = addrQuery.split(',').map(s => s.trim());
  const city = parts.length >= 3 ? parts[parts.length - 3] : null;
  const uf = parts.length >= 2 ? parts[parts.length - 2] : null;

  if (city && uf) {
    return geocodeWithNominatim(`${city}, ${uf}, Brasil`);
  }

  return null;
}

// Calcular taxa e tempo de entrega por CEP (POR KM)
router.get('/:slug/calculate-delivery', async (req, res) => {
  try {
    const slugNorm = String(req.params.slug || '').trim().toLowerCase();
    const cep = String(req.query.cep || '').replace(/\D/g, '').slice(0, 8);

    if (cep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido. Informe 8 dígitos.' });
    }

    const business = await prisma.business.findFirst({
      where: { slug: slugNorm, active: true },
      select: {
        deliveryFeePerKm: true,
        businessCep: true,
        avgPrepTime: true,
        deliveryEnabled: true,
      },
    });

    if (!business || !business.deliveryEnabled) {
      return res.status(404).json({ error: 'Delivery não disponível para este estabelecimento.' });
    }

    const businessCepNorm = (business.businessCep || '').replace(/\D/g, '').slice(0, 8);
    const perKm = Number(business.deliveryFeePerKm);

    if (businessCepNorm.length !== 8) {
      return res.status(400).json({ error: 'CEP do estabelecimento inválido/ausente. Configure no admin.' });
    }

    if (!Number.isFinite(perKm) || perKm <= 0) {
      return res.status(400).json({ error: 'Valor por KM inválido. Configure um valor maior que 0 no admin.' });
    }

    const [businessCoords, customerCoords] = await Promise.all([
      getCepCoordinates(businessCepNorm),
      getCepCoordinates(cep),
    ]);

    if (!businessCoords) {
      return res.status(422).json({ error: 'Não foi possível obter coordenadas do CEP do estabelecimento.' });
    }
    if (!customerCoords) {
      return res.status(422).json({ error: 'Não foi possível obter coordenadas do CEP informado.' });
    }

    const distanceKm = haversineKm(
      businessCoords.lat,
      businessCoords.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    // proteção: se o geocode cair no mesmo ponto por alguma razão
    const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;

    const rawFee = safeDistance * perKm;
    const fee = Math.round(rawFee * 100) / 100;

    return res.json({
      fee,
      estimatedMinutes: business.avgPrepTime || 30,
      cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      distanceKm: Math.round(safeDistance * 100) / 100,
      perKm,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao calcular entrega' });
  }
});

