import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, Clock, XCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: number;
  type: 'DELIVERY' | 'PICKUP';
  status: 'NEW' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  paymentMethod: string | null;
  estimatedTime: number | null;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderTrackingPage() {
  const { slug, orderNumber } = useParams<{ slug: string; orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    // Polling para atualizar status
    const interval = setInterval(loadOrder, 5000);
    return () => clearInterval(interval);
  }, [slug, orderNumber]);

  const loadOrder = async () => {
    try {
      const response = await api.get(`/orders/track/${slug}/${orderNumber}`);
      setOrder(response.data);
      setLoading(false);
    } catch (error: any) {
      toast.error('Erro ao carregar pedido');
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'PREPARING':
        return <Package className="text-primary-light" size={24} />;
      case 'CANCELLED':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <Clock className="text-yellow-500" size={24} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'Novo';
      case 'PREPARING':
        return 'Em preparação';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Aprovado';
      case 'PENDING':
        return 'Pendente';
      case 'REJECTED':
        return 'Rejeitado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (paymentMethod: string | null) => {
    if (paymentMethod === 'CASH_DELIVERY') return 'Pagar na entrega';
    if (paymentMethod === 'CASH_PICKUP') return 'Pagar na retirada';
    if (paymentMethod) return `Mercado Pago (${paymentMethod})`;
    return 'Mercado Pago';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="text-2xl font-bold mb-2">Pedido não encontrado</h1>
          <p className="text-gray-400">Verifique o número do pedido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(160deg, #0a0a1a 0%, #0E1BC7 25%, #1323FD 45%, #0a0a1a 100%)', backgroundAttachment: 'fixed' }}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-gray-900/90 backdrop-blur rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Pedido #{order.orderNumber}</h1>
            {getStatusIcon(order.status)}
          </div>
          <p className="text-gray-400">Status: <span className="text-white font-semibold">{getStatusText(order.status)}</span></p>
          <p className="text-gray-400">Pagamento: <span className="text-white font-semibold">{getPaymentMethodLabel(order.paymentMethod)} · {getPaymentStatusText(order.paymentStatus)}</span></p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Itens do Pedido</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex items-start gap-4">
                {item.product.image && (
                  <img
                    src={`http://localhost:3001${item.product.image}`}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-lg object-cover object-center ring-2 ring-white/10"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{item.product.name}</h3>
                  <p className="text-gray-400 text-sm">Quantidade: {item.quantity}</p>
                  {item.notes && (
                    <p className="text-gray-400 text-sm mt-1">Observação: {item.notes}</p>
                  )}
                </div>
                <p className="font-semibold text-primary-light">
                  R$ {(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Informações do Cliente</h2>
          <div className="space-y-2">
            <p><span className="text-gray-400">Nome:</span> {order.customerName}</p>
            <p><span className="text-gray-400">Telefone:</span> {order.customerPhone}</p>
            {order.deliveryAddress && (
              <p><span className="text-gray-400">Endereço:</span> {order.deliveryAddress}</p>
            )}
            <p><span className="text-gray-400">Tipo:</span> {order.type === 'DELIVERY' ? 'Delivery' : 'Retirada'}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Resumo</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span>R$ {Number(order.subtotal).toFixed(2).replace('.', ',')}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Taxa de entrega</span>
                <span>R$ {Number(order.deliveryFee).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t border-gray-700">
              <span>Total</span>
              <span className="text-primary-light">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
            </div>
            {order.estimatedTime && (
              <p className="text-sm text-gray-400 mt-4">
                <Clock className="inline mr-1" size={14} />
                Tempo estimado: {order.estimatedTime} minutos
              </p>
            )}
          </div>
        </div>

        {/* Logo da empresa desenvolvedora */}
        <footer className="pt-8 pb-6 text-center border-t border-white/10">
          <p className="text-sm text-white/60 mb-2">Desenvolvido por</p>
          <img
            src="/logo-desenvolvedor.png"
            alt="Logo da empresa que desenvolveu o sistema"
            className="h-8 w-auto max-w-[120px] mx-auto object-contain opacity-90"
            loading="lazy"
          />
        </footer>
      </div>
    </div>
  );
}
