import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { ShoppingCart, Plus, Minus, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

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

  // Ajustar forma de pagamento ao trocar tipo: entrega não pode ser "pagar na retirada" e vice-versa
  useEffect(() => {
    if (orderType === 'DELIVERY' && paymentMethod === 'CASH_PICKUP') setPaymentMethod('ONLINE');
    if (orderType === 'PICKUP' && paymentMethod === 'CASH_DELIVERY') setPaymentMethod('ONLINE');
  }, [orderType]);

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
    const deliveryFee = orderType === 'DELIVERY' && business ? Number(business.deliveryFee) : 0;
    return subtotal + deliveryFee;
  };

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
      const orderResponse = await api.post('/orders', {
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
      }, {
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando menu...</p>
        </div>
      </div>
    );
  }

  const primary = business.menuPrimaryColor || '#364C66';
  const bg = business.menuBackgroundColor || '#000000';
  const text = business.menuTextColor || '#FFFFFF';
  const wallpaper = business.menuWallpaperImage ? `http://localhost:3001${business.menuWallpaperImage}` : null;
  const banner = business.menuBannerImage ? `http://localhost:3001${business.menuBannerImage}` : null;

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: bg,
        color: text,
        backgroundImage: wallpaper ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.9)), url(${wallpaper})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 shadow-lg" style={{ backgroundColor: primary }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {business.logo && (
                <img src={`http://localhost:3001${business.logo}`} alt={business.name} className="h-12 w-12 rounded-full object-cover" />
              )}
              <div>
                <h1 className="text-xl font-bold">{business.name}</h1>
                {business.phone && <p className="text-sm text-gray-300">{business.phone}</p>}
              </div>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative px-4 py-2 rounded-lg transition"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <ShoppingCart className="inline mr-2" size={20} />
              Carrinho
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <section className="container mx-auto px-4 pt-4">
          <div className="rounded-xl overflow-hidden shadow-lg">
            <div className="relative">
              <img src={banner} alt="Banner" className="w-full h-36 md:h-52 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <h2 className="text-xl md:text-2xl font-bold">{business.name}</h2>
                <p className="text-sm text-white/80">Menu personalizado</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Menu */}
      <main className="container mx-auto px-4 py-8 pb-24">
        {categories.map(category => (
          <section key={category.id} className="mb-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: primary }}>{category.name}</h2>
            {category.description && (
              <p className="text-gray-400 mb-6">{category.description}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.products.map(product => (
                <div key={product.id} className="bg-gray-900/85 backdrop-blur rounded-lg overflow-hidden hover:bg-gray-800/90 transition">
                  {product.image && (
                    <img
                      src={`http://localhost:3001${product.image}`}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-gray-400 text-sm mb-4">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold" style={{ color: primary }}>
                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="px-4 py-2 rounded-lg transition"
                        style={{ backgroundColor: primary }}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 h-full w-full md:w-96 bg-gray-900 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Carrinho</h2>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-white">
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
                        ? 'bg-primary text-white'
                        : 'bg-gray-800 text-gray-300'
                      }`}
                    disabled={!business.deliveryEnabled}
                  >
                    <MapPin className="inline mr-2" size={16} />
                    Delivery
                  </button>
                  <button
                    onClick={() => setOrderType('PICKUP')}
                    className={`flex-1 py-2 px-4 rounded-lg transition ${orderType === 'PICKUP'
                        ? 'bg-primary text-white'
                        : 'bg-gray-800 text-gray-300'
                      }`}
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
                          onChange={() => setPaymentMethod('CASH_DELIVERY')}
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
                    {orderType === 'DELIVERY' && business.deliveryFee > 0 && (
                      <div className="flex justify-between mb-2 text-gray-400">
                        <span>Taxa de entrega</span>
                        <span>R$ {Number(business.deliveryFee).toFixed(2).replace('.', ',')}</span>
                      </div>
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
                    className="w-full bg-primary hover:bg-primary-light py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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
