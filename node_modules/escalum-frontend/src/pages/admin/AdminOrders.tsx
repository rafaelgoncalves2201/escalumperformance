import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Clock, XCircle, Package } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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
  paymentMethod: string | null; // CASH_DELIVERY | CASH_PICKUP | PIX | CREDIT_CARD | etc
  createdAt: string;
  items: OrderItem[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    loadOrders();
    connectSocket();
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new-order', (order: Order) => {
        setOrders(prev => [order, ...prev]);
        toast.success(`Novo pedido #${order.orderNumber}!`);
      });
      socket.on('order-updated', (order: Order) => {
        setOrders(prev => prev.map(o => o.id === order.id ? order : o));
      });
    }
  }, [socket]);

  const connectSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:3001', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Conectado ao WebSocket');
    });

    setSocket(newSocket);
  };

  const loadOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/orders', { params });
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success('Status atualizado!');
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'PREPARING':
        return <Package className="text-primary-light" size={20} />;
      case 'CANCELLED':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-yellow-500" size={20} />;
    }
  };

  const getPaymentMethodText = (order: Order) => {
    if (order.paymentMethod === 'CASH_DELIVERY') return 'Pagar na entrega';
    if (order.paymentMethod === 'CASH_PICKUP') return 'Pagar na retirada';
    if (order.paymentMethod) return `Mercado Pago (${order.paymentMethod})`;
    return 'Mercado Pago';
  };

  const canStartPreparing = (order: Order) => {
    const isCash = order.paymentMethod === 'CASH_DELIVERY' || order.paymentMethod === 'CASH_PICKUP';
    if (isCash) return true;
    return order.paymentStatus === 'APPROVED';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'Novo';
      case 'PREPARING':
        return 'Em Preparação';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-primary hover:text-primary-light">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold">Pedidos</h1>
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              loadOrders();
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">Todos</option>
            <option value="NEW">Novos</option>
            <option value="PREPARING">Em Preparação</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">Pedido #{order.orderNumber}</h2>
                    {getStatusIcon(order.status)}
                    <span className="text-sm text-gray-400">{getStatusText(order.status)}</span>
                  </div>
                  <p className="text-gray-400">
                    {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-light">
                    R$ {Number(order.total).toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-sm text-gray-400">
                    {order.type === 'DELIVERY' ? 'Delivery' : 'Retirada'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {getPaymentMethodText(order)} · {order.paymentStatus === 'APPROVED' ? 'Pago' : 'Pendente'}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="font-semibold">{order.customerName}</p>
                <p className="text-gray-400">{order.customerPhone}</p>
                {order.deliveryAddress && (
                  <p className="text-gray-400">{order.deliveryAddress}</p>
                )}
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Itens:</h3>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>
                        {item.quantity}x {item.product.name}
                        {item.notes && <span className="text-gray-400"> - {item.notes}</span>}
                      </span>
                      <span>R$ {(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {order.status === 'NEW' && (
                  <>
                    {!canStartPreparing(order) && (
                      <p className="text-sm text-amber-400">Aguardando confirmação do pagamento para liberar preparação.</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, 'PREPARING')}
                        disabled={!canStartPreparing(order)}
                        className="flex-1 bg-primary hover:bg-primary-light py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Iniciar Preparação
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, 'CANCELLED')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
                {order.status === 'PREPARING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(order.id, 'COMPLETED')}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg transition"
                    >
                      Marcar como Concluído
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, 'CANCELLED')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {order.status === 'COMPLETED' && (
                  <span className="px-4 py-2 bg-green-600 rounded-lg">Pedido Concluído</span>
                )}
                {order.status === 'CANCELLED' && (
                  <span className="px-4 py-2 bg-red-600 rounded-lg">Pedido Cancelado</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-gray-900 rounded-lg">
            Nenhum pedido encontrado
          </div>
        )}
      </div>
    </div>
  );
}
