import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { resolveImageUrl } from '../utils/resolveImage';
import { ShoppingCart, Plus, Minus, MapPin, Clock, Home, Percent, User, ChevronDown, Search, Gift, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CUSTOMER_STORAGE_KEY = (s: string) => `customer_${s}`;

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  products: Product[];
}

interface Business {
  id: string;
  name: string;
  logo: string | null;
  menuBannerImage?: string | null;
  menuWallpaperImage?: string | null;
  menuPrimaryColor?: string | null;
  menuBackgroundColor?: string | null;
  menuTextColor?: string | null;
  menuSubtitle?: string | null;
  menuOpeningText?: string | null;
  menuMoreInfoLabel?: string | null;
  slug: string;
  phone: string | null;
  address: string | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: number;
  avgPrepTime: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  addons: any[];
}

function ProductCard({
  product,
  primary,
  addToCart,
  resolveImageUrl,
}: {
  product: Product;
  primary: string;
  addToCart: (p: Product) => void;
  resolveImageUrl: (url: string | null) => string;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
      {product.image && (
        <div className="relative overflow-hidden aspect-[4/3] bg-gray-100">
          <img
            src={resolveImageUrl(product.image)}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-base sm:text-lg font-bold text-green-600">
            R$ {Number(product.price).toFixed(2).replace('.', ',')}
          </span>
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="p-2 rounded-xl text-white transition hover:opacity-90 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 active:opacity-95"
            style={{ background: primary }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH_DELIVERY' | 'CASH_PICKUP'>('ONLINE');
  const [showCart, setShowCart] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
  });
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customer, setCustomer] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [deliveryCalcCep, setDeliveryCalcCep] = useState('');
  const [deliveryPreview, setDeliveryPreview] = useState<{ fee: number; estimatedMinutes: number; cep: string; distanceKm?: number } | null>(null); // sidebar
  const [deliveryCheckout, setDeliveryCheckout] = useState<{ fee: number; estimatedMinutes: number; cep: string; distanceKm?: number } | null>(null); // carrinho/checkout  
  const [deliveryPreviewLoading, setDeliveryPreviewLoading] = useState(false);
  const [deliveryCheckoutLoading, setDeliveryCheckoutLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const onlyDigits = (value: string) => value.replace(/\D/g, '');

  // Formato solicitado: DDD + 5 dígitos + "-" + 4 dígitos
  // Ex: 99999999999 => 99999-9999
  const formatPhone = (value: string) => {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits;
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length <= 5) return `${ddd}${rest}`;
    const first = rest.slice(0, 5);
    const last = rest.slice(5, 9);
    return `${ddd}${first}${last ? `-${last}` : ''}`;
  };

  const formatCep = (value: string) => {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const [deliveryReqId, setDeliveryReqId] = useState(0);

import { useEffect, useMemo, useRef, useState } from 'react';

const deliveryReqRef = useRef(0);

const fetchDelivery = async (cepDigits: string, target: 'preview' | 'checkout') => {
  if (!slug) return;

  const reqId = ++deliveryReqRef.current;

  if (target === 'preview') setDeliveryPreviewLoading(true);
  else setDeliveryCheckoutLoading(true);

  try {
    const res = await api.get(`/menu/${slug}/calculate-delivery`, { params: { cep: cepDigits } });

    // ignora resposta antiga
    if (reqId !== deliveryReqRef.current) return;

    const fee = Number(res.data?.fee);
    const estimatedMinutes = Number(res.data?.estimatedMinutes);
    const distanceKm = res.data?.distanceKm != null ? Number(res.data.distanceKm) : undefined;

    if (!Number.isFinite(fee) || !Number.isFinite(estimatedMinutes)) {
      throw new Error('Resposta inválida do servidor');
    }

    const payload = {
      fee,
      estimatedMinutes,
      cep: String(res.data?.cep || formatCep(cepDigits)),
      distanceKm: Number.isFinite(distanceKm as number) ? distanceKm : undefined,
    };

    if (target === 'preview') setDeliveryPreview(payload);
    else setDeliveryCheckout(payload);
  } catch {
    if (reqId !== deliveryReqRef.current) return;
    if (target === 'preview') setDeliveryPreview(null);
    else setDeliveryCheckout(null);
  } finally {
    if (reqId !== deliveryReqRef.current) return;
    if (target === 'preview') setDeliveryPreviewLoading(false);
    else setDeliveryCheckoutLoading(false);
  }
};



  const buildDeliveryAddress = () => {
    const parts = [
      customerData.street?.trim(),
      customerData.number?.trim() ? `nº ${customerData.number.trim()}` : '',
      customerData.complement?.trim() ? `(${customerData.complement.trim()})` : '',
      customerData.neighborhood?.trim(),
      customerData.city?.trim() && customerData.state?.trim()
        ? `${customerData.city.trim()}-${customerData.state.trim()}`
        : '',
      customerData.cep?.trim() ? `CEP ${formatCep(customerData.cep.trim())}` : '',
    ].filter(Boolean);
    return parts.join(', ');
  };

  const lookupCep = async (rawCep: string) => {
    const cepDigits = onlyDigits(rawCep);
    if (cepDigits.length !== 8) return;

    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setCustomerData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch {
      toast.error('Falha ao consultar CEP');
    } finally {
      setIsCepLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY(slug));
      if (raw) {
        const data = JSON.parse(raw) as { name: string; email: string; phone: string };
        setCustomer(data);
        setCustomerData(prev => ({ ...prev, name: data.name, email: data.email, phone: data.phone }));
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    }
  }, [slug]);

  // Ajustar forma de pagamento ao trocar tipo: entrega não pode ser "pagar na retirada" e vice-versa
  useEffect(() => {
    if (orderType === 'DELIVERY' && paymentMethod === 'CASH_PICKUP') setPaymentMethod('ONLINE');
    if (orderType === 'PICKUP' && paymentMethod === 'CASH_DELIVERY') setPaymentMethod('ONLINE');
  }, [orderType]);
  const calculateDeliveryFromCustomerCep = async (cepRaw: string) => {
  const cepDigits = onlyDigits(cepRaw).slice(0, 8);

  if (cepDigits.length !== 8) {
    setDeliveryCalcResult(null);
    return;
  }

  if (!slug) return;

  setDeliveryCalcLoading(true);

  try {
    const res = await api.get(`/menu/${slug}/calculate-delivery`, {
      params: { cep: cepDigits },
    });

    const fee = Number(res.data?.fee);
    const estimatedMinutes = Number(res.data?.estimatedMinutes);
    const distanceKm = res.data?.distanceKm != null ? Number(res.data.distanceKm) : undefined;

    if (!Number.isFinite(fee) || !Number.isFinite(estimatedMinutes)) {
      throw new Error('Resposta inválida do servidor');
    }

    setDeliveryCalcResult({
      fee,
      estimatedMinutes,
      cep: String(res.data?.cep || formatCep(cepDigits)),
      distanceKm: Number.isFinite(distanceKm as number) ? distanceKm : undefined,
    });
  } catch (err) {
    setDeliveryCalcResult(null);
  } finally {
    setDeliveryCalcLoading(false);
  }
};


  const saveCustomerLogin = (name: string, email: string, phone: string) => {
    if (!slug) return;
    const data = { name, email, phone };
    localStorage.setItem(CUSTOMER_STORAGE_KEY(slug), JSON.stringify(data));
    setCustomer(data);
    setCustomerData(prev => ({ ...prev, name, email, phone }));
    setShowLoginModal(false);
    toast.success('Dados salvos! Seus dados serão preenchidos nos pedidos.');
  };

  const logoutCustomer = () => {
    if (!slug) return;
    localStorage.removeItem(CUSTOMER_STORAGE_KEY(slug));
    setCustomer(null);
    setCustomerData(prev => ({ ...prev, name: '', email: '', phone: '' }));
    toast.success('Você saiu da sua conta.');
  };

  const calculateDelivery = async () => {
  const cepDigits = onlyDigits(deliveryCalcCep).slice(0, 8);
  if (cepDigits.length !== 8) {
    toast.error('Informe um CEP válido (8 dígitos)');
    return;
  }
  await fetchDelivery(cepDigits, 'preview');
  toast.success('Entrega calculada!');
};

  if (!slug) {
    toast.error('Menu inválido (slug não encontrado).');
    return;
  }

  setDeliveryCalcLoading(true);

  try {
    const res = await api.get(`/menu/${slug}/calculate-delivery`, {
      params: { cep: cepDigits },
    });

    const fee = Number(res.data?.fee);
    const estimatedMinutes = Number(res.data?.estimatedMinutes);
    const distanceKm =
      res.data?.distanceKm != null ? Number(res.data.distanceKm) : undefined;

    if (!Number.isFinite(fee) || !Number.isFinite(estimatedMinutes)) {
      throw new Error(`Resposta inválida do servidor: ${JSON.stringify(res.data)}`);
    }

    setDeliveryCalcResult({
      fee,
      estimatedMinutes,
      cep: String(res.data?.cep || deliveryCalcCep),
      distanceKm: Number.isFinite(distanceKm as number) ? distanceKm : undefined,
    });

    toast.success('Entrega calculada!');
  } catch (err: any) {
    toast.error(err?.response?.data?.error || err?.message || 'Erro ao calcular entrega');
    setDeliveryCalcResult(null);
  } finally {
    setDeliveryCalcLoading(false);
  }
};

useEffect(() => {
  if (orderType !== 'DELIVERY') return;

  const cepDigits = onlyDigits(customerData.cep).slice(0, 8);
  if (cepDigits.length !== 8) {
    setDeliveryCheckout(null);
    return;
  }

  const t = setTimeout(() => {
    fetchDelivery(cepDigits, 'checkout');
  }, 600);

  return () => clearTimeout(t);
}, [customerData.cep, orderType, slug]);
  
  const loadMenu = async () => {
    try {
      const response = await api.get(`/menu/${slug}`);
      setBusiness(response.data.business);
      setCategories(response.data.categories);
    } catch (error: any) {
      toast.error('Erro ao carregar menu');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '', addons: [] }];
    });
    toast.success('Produto adicionado ao carrinho');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (item && item.quantity > 1) {
        return prev.map(i =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter(i => i.product.id !== productId);
    });
  };

  const getTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    let deliveryFee = 0;
    if (orderType === 'DELIVERY' && business) {
      deliveryFee = deliveryCheckout != null ? deliveryCheckout.fee : Number(business.deliveryFee);
    }
    return subtotal + deliveryFee;
  };

    const deliveryFeeDisplay = orderType === 'DELIVERY' && business
      ? (deliveryCheckout != null ? deliveryCheckout.fee : Number(business.deliveryFee))
      : 0;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.map(cat => ({
      ...cat,
      products: cat.products.filter(
        p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      ),
    })).filter(cat => cat.products.length > 0);
  }, [categories, searchQuery]);

  const handleCheckout = async () => {
    if (!business) return;

    if (!customerData.name || !customerData.phone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    if (orderType === 'DELIVERY') {
      const cepDigits = onlyDigits(customerData.cep);
      if (cepDigits.length !== 8) {
        toast.error('Informe um CEP válido');
        return;
      }
      if (!customerData.street || !customerData.number || !customerData.neighborhood || !customerData.city || !customerData.state) {
        toast.error('Preencha endereço completo (rua, número, bairro, cidade e UF)');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const deliveryAddress = orderType === 'DELIVERY' ? buildDeliveryAddress() : undefined;

      // Criar pedido (com forma de pagamento)
      const paymentMethodValue = orderType === 'DELIVERY' ? (paymentMethod === 'CASH_PICKUP' ? 'ONLINE' : paymentMethod) : (paymentMethod === 'CASH_DELIVERY' ? 'ONLINE' : paymentMethod);
      const orderPayload: Record<string, unknown> = {
        type: orderType,
        paymentMethod: paymentMethodValue,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email || undefined,
        deliveryAddress,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          addons: item.addons,
        })),
      };
      if (orderType === 'DELIVERY' && deliveryCheckout != null) {
        orderPayload.deliveryFee = deliveryCheckout.fee;
      }

      
      const orderResponse = await api.post('/orders', orderPayload, {
        params: { businessSlug: slug }
      });

      const order = orderResponse.data;

      // Pagar na entrega ou na retirada: ir direto para página de acompanhamento
      if (paymentMethodValue === 'CASH_DELIVERY' || paymentMethodValue === 'CASH_PICKUP') {
        toast.success(`Pedido #${order.orderNumber} criado! Pague na ${orderType === 'DELIVERY' ? 'entrega' : 'retirada'}.`);
        window.location.href = `/pedido/${slug}/${order.orderNumber}`;
        return;
      }

      // Pagamento online: criar preferência e redirecionar para Mercado Pago
      const paymentResponse = await api.post('/payment/preference', {
        orderId: order.id,
        businessSlug: slug,
      });

      if (!paymentResponse.data?.initPoint) {
        toast.success(`Pedido #${order.orderNumber} criado!`);
        window.location.href = `/pedido/${slug}/${order.orderNumber}`;
        return;
      }

      window.location.href = paymentResponse.data.initPoint;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao processar pedido');
      setIsProcessing(false);
    }
  };

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%)', backgroundAttachment: 'fixed' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-gray-400 mx-auto mb-4"></div>
          <p>Carregando menu...</p>
        </div>
      </div>
    );
  }

  const primary = business.menuPrimaryColor || '#1323FD';
  const bg = business.menuBackgroundColor || '#0a0a1a';
  const text = business.menuTextColor || '#FFFFFF';
  const wallpaper = business.menuWallpaperImage ? resolveImageUrl(business.menuWallpaperImage) : null;
  const banner = business.menuBannerImage ? resolveImageUrl(business.menuBannerImage) : null;

  const backgroundStyle = wallpaper
    ? {
        color: text,
        backgroundImage: `linear-gradient(180deg, rgba(19,35,253,0.35) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.92) 100%), url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        color: text,
        background: `linear-gradient(160deg, ${bg} 0%, #171717 35%, #262626 70%, #0a0a0a 100%)`,
        backgroundAttachment: 'fixed',
      };

  return (
    <div className="min-h-screen bg-gray-100 pb-6 sm:pb-0" style={wallpaper ? { ...backgroundStyle, backgroundImage: backgroundStyle.backgroundImage } : { color: text, background: bg }}>
      {/* Header: cores do negócio - responsivo */}
      <header
        className="sticky top-0 z-40 shadow-lg text-white"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 50%, ${primary}99 100%)` }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <nav className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap min-h-[44px]">
            <a href="#top" className="flex items-center gap-1.5 sm:gap-2 py-2 px-1 hover:opacity-90 min-w-[44px] min-h-[44px] justify-center sm:justify-start"><Home size={22} className="flex-shrink-0" /><span className="text-sm sm:text-base hidden sm:inline">Início</span></a>
            <a href="#destaques" className="flex items-center gap-1.5 sm:gap-2 py-2 px-1 hover:opacity-90 min-w-[44px] min-h-[44px] justify-center sm:justify-start"><Percent size={22} className="flex-shrink-0" /><span className="text-sm sm:text-base hidden sm:inline">Promoções</span></a>
            <button type="button" onClick={() => setShowCart(true)} className="relative flex items-center gap-1.5 sm:gap-2 py-2 px-1 hover:opacity-90 min-w-[44px] min-h-[44px] justify-center sm:justify-start">
              <ShoppingCart size={22} className="flex-shrink-0" />
              <span className="text-sm sm:text-base hidden sm:inline">Pedidos</span>
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 sm:-top-2 sm:-right-2 text-white text-xs rounded-full h-5 w-5 min-w-[20px] flex items-center justify-center" style={{ background: primary }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
            {customer ? (
              <div className="flex items-center gap-1 sm:gap-2 py-2">
                <span className="text-xs sm:text-sm text-white/90 truncate max-w-[100px] sm:max-w-none">Olá, {customer.name}</span>
                <button type="button" onClick={logoutCustomer} className="text-xs sm:text-sm underline hover:no-underline py-1 min-h-[44px] flex items-center">Sair</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 sm:gap-2 py-2 px-1 hover:opacity-90 min-w-[44px] min-h-[44px] justify-center sm:justify-start">
                <User size={22} className="flex-shrink-0" />
                <span className="text-sm sm:text-base hidden sm:inline">Entrar</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Banner maior - responsivo (admin configura a imagem, cliente vê maior) */}
      <section id="top" className="w-full h-[200px] sm:h-[260px] md:h-[320px] lg:h-[380px] flex items-center justify-center overflow-hidden shrink-0" style={{ background: banner ? undefined : primary }}>
        {banner ? (
          <img src={banner} alt="" className="w-full h-full object-cover object-center" />
        ) : (
          <span className="text-white/90 text-base sm:text-lg md:text-xl font-semibold px-4 text-center">{business.name}</span>
        )}
      </section>

      {/* Info da loja - responsivo */}
      <section className="container mx-auto px-3 sm:px-4 -mt-4 sm:-mt-6 relative z-10">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 p-3 sm:p-4 md:p-6 flex flex-wrap items-start gap-3 sm:gap-4">
          {business.logo && (
            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-amber-50 ring-2 ring-amber-200/50">
              <img src={resolveImageUrl(business.logo)} alt={business.name} className="w-full h-full object-cover" loading="eager" decoding="async" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-words" style={{ color: primary }}>{business.name}</h1>
            {business.menuSubtitle?.trim() && (
              <p className="font-medium mt-0.5 sm:mt-1 text-sm sm:text-base" style={{ color: primary }}>{business.menuSubtitle}</p>
            )}
            {business.menuOpeningText?.trim() && (
              <p className="text-xs sm:text-sm mt-0.5 opacity-90" style={{ color: primary }}>{business.menuOpeningText}</p>
            )}
            {business.address && <p className="text-gray-500 text-xs sm:text-sm mt-1 break-words">{business.address}</p>}
            {business.phone && <p className="text-gray-500 text-xs sm:text-sm">{business.phone}</p>}
            <a href="#categorias" className="inline-block mt-2 text-xs sm:text-sm font-medium hover:underline min-h-[44px] flex items-center" style={{ color: primary }}>
              {business.menuMoreInfoLabel?.trim() || 'Mais informações'}
            </a>
          </div>
        </div>
      </section>

      {/* Main: conteúdo + sidebar - responsivo */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
        <main className="flex-1 min-w-0 w-full">
          <div id="categorias" className="mb-3 sm:mb-4">
            <button type="button" onClick={() => setCategoriesOpen(!categoriesOpen)} className="flex items-center justify-between w-full px-3 sm:px-4 py-3 min-h-[48px] bg-white rounded-xl border shadow-sm hover:opacity-90 transition active:opacity-95" style={{ borderColor: primary + '40' }}>
              <span className="font-medium text-sm sm:text-base" style={{ color: primary }}>Lista de categorias</span>
              <ChevronDown className={`w-5 h-5 flex-shrink-0 transition ${categoriesOpen ? 'rotate-180' : ''}`} style={{ color: primary }} />
            </button>
            {categoriesOpen && (
              <div className="mt-2 p-2 sm:p-3 bg-white rounded-xl border border-gray-200 shadow-sm space-y-0.5">
                {categories.map(cat => (
                  <a key={cat.id} href={`#cat-${cat.id}`} className="block py-2.5 px-3 rounded-lg hover:bg-gray-100 text-gray-700 text-sm sm:text-base min-h-[44px] flex items-center">{cat.name}</a>
                ))}
              </div>
            )}
          </div>

          {filteredCategories.length > 0 && (
            <section id="destaques" className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4" style={{ color: primary }}>Destaques</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredCategories[0].products.map(product => (
                  <ProductCard key={product.id} product={product} primary={primary} addToCart={addToCart} resolveImageUrl={resolveImageUrl} />
                ))}
              </div>
            </section>
          )}

          {filteredCategories.slice(1).map(category => (
            <section key={category.id} id={`cat-${category.id}`} className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4" style={{ color: primary }}>{category.name}</h2>
              {category.description && <p className="text-gray-500 text-sm sm:text-base mb-3 sm:mb-4">{category.description}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {category.products.map(product => (
                  <ProductCard key={product.id} product={product} primary={primary} addToCart={addToCart} resolveImageUrl={resolveImageUrl} />
                ))}
              </div>
            </section>
          ))}

          {filteredCategories.length === 0 && <p className="text-gray-500 py-6 sm:py-8 text-center text-sm sm:text-base">Nenhum produto encontrado para &quot;{searchQuery}&quot;</p>}
        </main>

        <aside className="w-full lg:w-80 flex-shrink-0 space-y-3 sm:space-y-4">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70 pointer-events-none" style={{ color: primary }} />
              <input type="search" placeholder="Busque por um produto" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 sm:py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-base min-h-[48px]" style={{ ['--tw-ring-color' as string]: primary } as React.CSSProperties} />
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <Gift className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 mt-0.5" style={{ color: primary }} />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Programa de fidelidade</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">A cada R$ 1,00 em compras você ganha 1 ponto que pode ser trocado por prêmios.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: primary }} />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Calcular taxa e tempo de entrega</h3>
            </div>
            <div className="space-y-2">
              <input type="text" inputMode="numeric" placeholder="CEP (8 dígitos)" value={deliveryCalcCep} onChange={(e) => setDeliveryCalcCep(e.target.value.replace(/\D/g, '').slice(0, 8))} className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 min-h-[44px] text-base" style={{ ['--tw-ring-color' as string]: primary } as React.CSSProperties} />
              <button type="button" onClick={calculateDelivery} disabled={deliveryCalcLoading || onlyDigits(deliveryCalcCep).length !== 8} className="w-full py-2.5 rounded-lg font-medium text-white transition disabled:opacity-50 min-h-[44px]" style={{ background: primary }}>
                {deliveryCalcLoading ? 'Calculando...' : 'Calcular'}
              </button>
              {deliveryCalcResult && Number.isFinite(deliveryCalcResult.fee) ? (
              <div className="mt-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg text-xs sm:text-sm">
                <p className="font-medium text-gray-800">CEP {deliveryCalcResult.cep}</p>
                {deliveryCalcResult.distanceKm != null && (
                  <p className="text-gray-600">Distância: {deliveryCalcResult.distanceKm} km</p>
                )}
                <p className="text-gray-600">
                  Taxa: R$ {deliveryCalcResult.fee.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-gray-600">Tempo estimado: {deliveryCalcResult.estimatedMinutes} min</p>
              </div>
            ) : null}

            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <button type="button" onClick={() => setShowCart(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-gray-600 hover:opacity-90 transition min-h-[48px] active:opacity-95" style={{ borderColor: primary + '60' }}>
              <ShoppingCart className="w-6 h-6 flex-shrink-0" style={{ color: primary }} />
              <span className="text-sm sm:text-base">{cart.length === 0 ? 'Sacola vazia' : `${cart.reduce((s, i) => s + i.quantity, 0)} item(ns)`}</span>
            </button>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <Percent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: primary }} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Que tal usar um cupom?</h3>
              <p className="text-xs sm:text-sm text-gray-500">2 disponíveis</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal Entrar / Cadastrar - responsivo */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 text-gray-900 my-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Entrar / Cadastrar</h2>
            <p className="text-sm text-gray-500 mb-4">Salve seus dados para preencher automaticamente nos pedidos.</p>
            <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const name = (form.querySelector('[name="loginName"]') as HTMLInputElement)?.value; const email = (form.querySelector('[name="loginEmail"]') as HTMLInputElement)?.value; const phone = (form.querySelector('[name="loginPhone"]') as HTMLInputElement)?.value; if (name && phone) saveCustomerLogin(name, email || '', phone); }}>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input name="loginName" type="text" required defaultValue={customer?.name} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50" placeholder="Seu nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="loginEmail" type="email" defaultValue={customer?.email} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50" placeholder="seu@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone *</label>
                  <input name="loginPhone" type="tel" required defaultValue={customer?.phone} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50" placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-lg font-medium text-white transition min-h-[44px]" style={{ background: primary }}>Salvar</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rodapé - responsivo */}
      <footer className="py-4 sm:py-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm px-3 sm:px-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="container mx-auto flex flex-col items-center gap-2 sm:gap-3">
          <p className="text-sm text-gray-500">Desenvolvido por</p>
          <a href="/" className="flex items-center gap-2 opacity-90 hover:opacity-100 transition" aria-label="Logo da empresa desenvolvedora">
            <img src="/logo-desenvolvedor.png" alt="Logo da empresa que desenvolveu o sistema" className="h-10 w-auto max-w-[140px] object-contain object-center" loading="lazy" decoding="async" />
          </a>
        </div>
      </footer>

      {/* Cart Sidebar - full screen no mobile, responsivo */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 safe-area-padding" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-full sm:max-w-md md:w-96 bg-gradient-to-b from-gray-900 to-gray-950 shadow-2xl border-l border-white/10 overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
            <div className="p-4 sm:p-6 pb-8 sm:pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
              <div className="flex items-center justify-between mb-4 sm:mb-6 min-h-[44px]">
                <h2 className="text-xl sm:text-2xl font-bold">Carrinho</h2>
                <button type="button" onClick={() => setShowCart(false)} className="p-2 -m-2 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/10">
                  ✕
                </button>
              </div>

              {/* Order Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Tipo de Pedido</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderType('DELIVERY')}
                    className={`flex-1 py-2 px-4 rounded-lg transition ${orderType === 'DELIVERY'
                        ? 'text-white shadow-lg'
                        : 'bg-gray-800 text-gray-300'
                      }`}
                    style={orderType === 'DELIVERY' ? { background: `linear-gradient(135deg, ${primary} 0%, #0E1BC7 100%)` } : undefined}
                    disabled={!business.deliveryEnabled}
                  >
                    <MapPin className="inline mr-2" size={16} />
                    Delivery
                  </button>
                  <button
                    onClick={() => setOrderType('PICKUP')}
                    className={`flex-1 py-2 px-4 rounded-lg transition ${orderType === 'PICKUP'
                        ? 'text-white shadow-lg'
                        : 'bg-gray-800 text-gray-300'
                      }`}
                    style={orderType === 'PICKUP' ? { background: `linear-gradient(135deg, ${primary} 0%, #0E1BC7 100%)` } : undefined}
                    disabled={!business.pickupEnabled}
                  >
                    <Clock className="inline mr-2" size={16} />
                    Retirada
                  </button>
                </div>
              </div>

              {/* Forma de pagamento - só mostra quando tem itens */}
              {cart.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Forma de pagamento</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition border-gray-700 hover:bg-gray-800/50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'ONLINE'}
                        onChange={() => setPaymentMethod('ONLINE')}
                        className="text-primary"
                      />
                      <span>Pagar com PIX/Cartão (Mercado Pago)</span>
                    </label>
                    {orderType === 'DELIVERY' && (
                      <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition border-gray-700 hover:bg-gray-800/50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'CASH_DELIVERY'}
                          onChange={(e) => {
                            const digits = onlyDigits(e.target.value).slice(0, 8);
                            setCustomerData({ ...customerData, cep: digits });
                          
                            if (digits.length === 8) lookupCep(digits);
                          }}
                          onBlur={() => lookupCep(customerData.cep)}
                          className="text-primary"
                        />
                        <span>Pagar na entrega</span>
                      </label>
                    )}
                    {orderType === 'PICKUP' && (
                      <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition border-gray-700 hover:bg-gray-800/50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'CASH_PICKUP'}
                          onChange={() => setPaymentMethod('CASH_PICKUP')}
                          className="text-primary"
                        />
                        <span>Pagar na retirada</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Carrinho vazio</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map(item => (
                      <div key={item.product.id} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.product.name}</h3>
                            <p className="text-sm text-gray-400">
                              R$ {Number(item.product.price).toFixed(2).replace('.', ',')} x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item.product)}
                              className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-primary-light font-bold">
                          R$ {(Number(item.product.price) * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Customer Data */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome *</label>
                      <input
                        type="text"
                        value={customerData.name}
                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Telefone *</label>
                      <input
                        type="tel"
                        value={customerData.phone}
                        onChange={(e) => setCustomerData({ ...customerData, phone: formatPhone(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="99999-9999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="seu@email.com"
                      />
                    </div>
                    {orderType === 'DELIVERY' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">CEP *</label>
                          <input
                            type="text"
                            value={formatCep(customerData.cep)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setCustomerData({ ...customerData, cep: raw });
                              const digits = onlyDigits(raw);
                              if (digits.length === 8) lookupCep(digits);
                            }}
                            onBlur={() => lookupCep(customerData.cep)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                            placeholder="99999999"
                          />
                          {isCepLoading && (
                            <p className="text-xs text-gray-400 mt-1">Consultando CEP...</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Rua *</label>
                          <input
                            type="text"
                            value={customerData.street}
                            onChange={(e) => setCustomerData({ ...customerData, street: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                            placeholder="Rua/Av..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Número *</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={customerData.number}
                              onChange={(e) => setCustomerData({ ...customerData, number: onlyDigits(e.target.value) })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                              placeholder="123"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Complemento</label>
                            <input
                              type="text"
                              value={customerData.complement}
                              onChange={(e) => setCustomerData({ ...customerData, complement: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                              placeholder="Apto / Bloco"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Bairro *</label>
                          <input
                            type="text"
                            value={customerData.neighborhood}
                            onChange={(e) => setCustomerData({ ...customerData, neighborhood: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                            placeholder="Bairro"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Cidade *</label>
                            <input
                              type="text"
                              value={customerData.city}
                              onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                              placeholder="Cidade"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">UF *</label>
                            <input
                              type="text"
                              value={customerData.state}
                              onChange={(e) => setCustomerData({ ...customerData, state: e.target.value.toUpperCase().slice(0, 2) })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                              placeholder="SP"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-gray-700 pt-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>R$ {cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                    {orderType === 'DELIVERY' && deliveryFeeDisplay > 0 && (
                      <div className="flex justify-between mb-2 text-gray-400">
                        <span>Taxa de entrega</span>
                        <span>R$ {deliveryFeeDisplay.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    {orderType === 'DELIVERY' && (
                      <p className="text-xs text-gray-500 mt-1">
                        debug: result={deliveryCalcResult ? JSON.stringify(deliveryCalcResult) : 'null'} | fixo={Number(business.deliveryFee)}
                      </p>
                    )}
                    <div className="flex justify-between text-xl font-bold mt-4">
                      <span>Total</span>
                      <span className="text-primary-light">R$ {getTotal().toFixed(2).replace('.', ',')}</span>
                    </div>
                    {business.avgPrepTime && (
                      <p className="text-sm text-gray-400 mt-2">
                        <Clock className="inline mr-1" size={14} />
                        Tempo estimado: {business.avgPrepTime} minutos
                      </p>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing || cart.length === 0}
                    className="w-full py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${primary} 0%, #0E1BC7 100%)` }}
                  >
                    {isProcessing ? 'Processando...' : 'Finalizar Pedido'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
