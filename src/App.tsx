import { useState, useMemo, useEffect } from 'react';
import { supabase } from './lib/supabase';

// --- Tipos ---
interface Product {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
  imagen_url?: string;
}

interface CartItem extends Product {
  qty: number;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // --- Cargar Productos desde Supabase ---
  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error cargando productos:', err);
        showToast('Error al conectar con la base de datos');
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2500);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: { ...product, qty: (existing?.qty || 0) + 1 },
      };
    });
    showToast(`${product.nombre} agregado`);
  };

  const changeQty = (id: number, delta: number) => {
    setCart((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...item, qty: newQty } };
    });
  };

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartTotal = useMemo(() => cartItems.reduce((acc, item) => acc + item.price * item.qty, 0), [cartItems]);
  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.qty, 0), [cartItems]);

  const checkout = async () => {
    if (cartItems.length === 0) {
      showToast('Agrega productos primero');
      return;
    }
    try {
      const { error } = await supabase.from('pedidos').insert([
        { items: cartItems, total: cartTotal, cliente_nombre: 'Cliente Web' },
      ]);
      if (error) throw error;
      showToast('¡Pedido enviado! Pronto te contactamos.');
      setCart({});
      setIsCartOpen(false);
    } catch (err) {
      console.error('Error al enviar pedido:', err);
      showToast('Hubo un error al procesar tu pedido');
    }
  };

  const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

  return (
    <div className="site">
      {/* HEADER */}
      <header className="main-header">
        <div className="logo">MISCELÁNEA SHANNY</div>
        <nav>
          <a href="#inicio">Inicio</a>
          <a href="#productos">Productos</a>
          <a href="#servicios">Servicios</a>
          <a href="#contacto">Contacto</a>
          <button className="btn-pedidos" onClick={() => setIsCartOpen(true)}>
            Pedidos {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
        </nav>
      </header>

      {/* INICIO */}
      <section id="inicio" className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-text">
          <h1>MISCELÁNEA SHANNY</h1>
          <p>Todo en papelería, detalles y servicios creativos</p>
          <a href="#productos" className="btn-primary-hero">Ver productos</a>
        </div>
      </section>

      <section className="descripcion-section">
        <div className="container">
          <p>
            En <strong>Miscelánea Shanny</strong> ofrecemos una amplia variedad de artículos de papelería, 
            detalles y servicios personalizados como impresiones, copias y diseño creativo.
          </p>
        </div>
      </section>

      <section className="destacados-section">
        <div className="grid-3">
          <div className="card-highlight">
            <span className="icon">📚</span>
            <h3>Papelería</h3>
          </div>
          <div className="card-highlight">
            <span className="icon">🎁</span>
            <h3>Detalles</h3>
          </div>
          <div className="card-highlight">
            <span className="icon">🖨️</span>
            <h3>Servicios</h3>
          </div>
        </div>
      </section>

      {/* PRODUCTOS */}
      <section id="productos" className="products-section">
        <div className="container">
          <h2 className="section-title">Productos</h2>
          {loading ? (
            <div className="loading">Cargando productos...</div>
          ) : (
            <div className="grid-auto">
              {products.map((p) => (
                <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                  <div className="product-image-placeholder">📦</div>
                  <div className="product-info">
                    <h3>{p.nombre}</h3>
                    <p className="category">{p.categoria}</p>
                    <p className="price">{fmt(p.precio)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="services-section">
        <div className="container">
          <h2 className="section-title">Servicios</h2>
          <div className="grid-auto">
            <div className="card-service">🖨️ Impresiones</div>
            <div className="card-service">📄 Copias</div>
            <div className="card-service">🎨 Diseño de tarjetas</div>
            <div className="card-service">📑 Folletos</div>
            <div className="card-service">✂️ Papelería creativa</div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="contact-section">
        <div className="container">
          <h2 className="section-title">Contacto</h2>
          <div className="contact-links">
            <a href="#" className="contact-link">📱 WhatsApp</a>
            <a href="#" className="contact-link">📷 Instagram</a>
            <a href="#" className="contact-link">👍 Facebook</a>
            <a href="#" className="contact-link">🎵 TikTok</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="main-footer">
        <p>© 2025 Miscelánea Shanny · Todos los derechos reservados</p>
      </footer>

      {/* BOTÓN FLOTANTE */}
      <button className="floating-btn" onClick={() => setIsCartOpen(true)}>
        🛒 Pedidos {cartCount > 0 && <span className="badge">{cartCount}</span>}
      </button>

      {/* MODAL DE CARRITO (Simplificado para el "Pedidos") */}
      {isCartOpen && (
        <div className="cart-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Mi Carrito</h2>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>×</button>
            </div>
            <div className="cart-content">
              {cartItems.length === 0 ? (
                <p className="empty-msg">Tu carrito está vacío</p>
              ) : (
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="item-info">
                        <h4>{item.nombre}</h4>
                        <p>{fmt(item.price)} x {item.qty}</p>
                      </div>
                      <div className="item-actions">
                        <button onClick={() => changeQty(item.id, -1)}>−</button>
                        <span>{item.qty}</span>
                        <button onClick={() => changeQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="cart-footer">
              <div className="total">
                <span>Total:</span>
                <strong>{fmt(cartTotal)}</strong>
              </div>
              <button className="btn-checkout" onClick={checkout}>Confirmar Pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}

export default App;
