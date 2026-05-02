import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// --- Configuración ---
const WHATSAPP_NUMBER = "573004626384"; // Reemplaza con tu número real

interface Product {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
}

interface CartItem extends Product {
  qty: number;
}

const SERVICIOS = [
  { id: 1, name: '🖨️ Impresiones', desc: 'Calidad láser a color y B/N.' },
  { id: 2, name: '📄 Copias', desc: 'Nítidas y rápidas en todos los tamaños.' },
  { id: 3, name: '🎨 Diseño de tarjetas', desc: 'Diseños únicos para tus eventos.' },
  { id: 4, name: '📑 Folletos', desc: 'Material publicitario de alto impacto.' },
  { id: 5, name: '✂️ Papelería creativa', desc: 'Detalles y manualidades a medida.' },
];

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ nombre: '', categoria: '', precio: '', descripcion: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        showToast('Error de conexión');
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
      return { ...prev, [product.id]: { ...product, qty: (existing?.qty || 0) + 1 } };
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

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.precio * item.qty, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

  const sendToWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return showToast('El carrito está vacío');
    try {
      await supabase.from('pedidos').insert([{ items: cartItems, total: cartTotal }]);
      let msg = `✨ *NUEVO PEDIDO - MISCELÁNEA SHANNY*\n\n`;
      cartItems.forEach(item => {
        msg += `• ${item.nombre} (x${item.qty}) - ${fmt(item.precio * item.qty)}\n`;
      });
      msg += `\n💰 *TOTAL: ${fmt(cartTotal)}*`;
      sendToWhatsApp(msg);
      setCart({});
      setIsCartOpen(false);
    } catch (err) {
      showToast('Error al procesar');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      showToast('Sesión iniciada como administrador');
      setIsLoginOpen(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      showToast('Error: Credenciales incorrectas');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast('Sesión cerrada');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const precioNum = Number(newProduct.precio);
    if (!newProduct.nombre || !newProduct.categoria || isNaN(precioNum) || precioNum <= 0) {
      return showToast('Por favor completa todos los campos requeridos correctamente');
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('productos').insert([
        { 
          nombre: newProduct.nombre, 
          categoria: newProduct.categoria, 
          precio: precioNum, 
          descripcion: newProduct.descripcion || null
        }
      ]).select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setProducts((prev) => [...prev, data[0]]);
        showToast('Producto agregado exitosamente');
        setIsAddProductOpen(false);
        setNewProduct({ nombre: '', categoria: '', precio: '', descripcion: '' });
      }
    } catch (err: any) {
      showToast('Error al agregar el producto');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceClick = (serviceName: string) => {
    const msg = `Hola Shanny, me interesa el servicio de: *${serviceName}*.`;
    sendToWhatsApp(msg);
  };

  // --- NUEVA LÓGICA DE ACCIÓN PARA TARJETAS DESTACADAS ---
  const handleFeatureClick = (category: string) => {
    if (category === 'Servicios') {
      document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setSearchQuery(category); // Activa el filtro automáticamente
      document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
      showToast(`Mostrando ${category}`);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="site">
      <header className="main-header">
        <div className="logo">MISCELÁNEA SHANNY</div>
        <nav>
          <a href="#inicio">Inicio</a>
          <a href="#productos">Productos</a>
          <a href="#servicios">Servicios</a>
          <a href="#contacto">Contacto</a>
          {session ? (
            <button className="btn-pedidos" onClick={handleLogout} style={{background: 'var(--ink)', color: 'white', border: 'none'}}>
              Cerrar sesión
            </button>
          ) : (
            <button className="btn-pedidos" onClick={() => setIsLoginOpen(true)} style={{background: 'transparent', color: 'var(--ink)', border: '1px solid var(--border)'}}>
              Admin
            </button>
          )}
          <button className="btn-pedidos" onClick={() => setIsCartOpen(true)}>
            Pedidos {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
        </nav>
      </header>

      <section id="inicio" className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-text">
          <h1>MISCELÁNEA SHANNY</h1>
          <p>Todo en papelería, detalles y servicios creativos</p>
          <div className="hero-btns">
            <a href="#productos" className="btn-primary-hero">Ver productos</a>
            <button className="btn-secondary-hero" onClick={() => setIsCartOpen(true)}>Hacer Pedido</button>
          </div>
        </div>
      </section>

      <section className="descripcion-section">
        <div className="container">
          <p>En <strong>Miscelánea Shanny</strong> ofrecemos una amplia variedad de artículos de papelería, detalles y servicios personalizados como impresiones, copias y diseño creativo.</p>
        </div>
      </section>

      {/* SECCIÓN DESTACADOS CON ACCIONES REALES */}
      <section className="destacados-section">
        <div className="grid-3">
          <div className="card-highlight" onClick={() => handleFeatureClick('Papelería')}>
            <span className="icon">📚</span>
            <h3>Papelería</h3>
            <p style={{fontSize: '11px', color: 'var(--ink-muted)'}}>Ver artículos</p>
          </div>
          <div className="card-highlight" onClick={() => handleFeatureClick('Detalles')}>
            <span className="icon">🎁</span>
            <h3>Detalles</h3>
            <p style={{fontSize: '11px', color: 'var(--ink-muted)'}}>Ver regalos</p>
          </div>
          <div className="card-highlight" onClick={() => handleFeatureClick('Servicios')}>
            <span className="icon">🖨️</span>
            <h3>Servicios</h3>
            <p style={{fontSize: '11px', color: 'var(--ink-muted)'}}>Ver opciones</p>
          </div>
        </div>
      </section>

      <section id="productos" className="products-section">
        <div className="container">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px'}}>
            <h2 className="section-title" style={{marginBottom: 0}}>Nuestros Productos</h2>
            {session && (
              <button className="btn-pedidos" onClick={() => setIsAddProductOpen(true)} style={{background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px'}}>
                + Añadir Producto
              </button>
            )}
          </div>
          <div className="search-container">
            <div style={{display:'flex', gap: '10px', marginBottom: '10px'}}>
               <input type="text" placeholder="🔍 Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" style={{flex: 1}} />
               {searchQuery && <button onClick={() => setSearchQuery('')} className="btn-clear-search" style={{padding: '0 15px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer'}}>Limpiar</button>}
            </div>
          </div>
          {loading ? <div className="loading">Cargando catálogo...</div> : (
            <div className="grid-auto">
              {filteredProducts.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-image-placeholder">📦</div>
                  <div className="product-info">
                    <h3>{p.nombre}</h3>
                    <p className="category">{p.categoria}</p>
                    <p className="price">{fmt(p.precio)}</p>
                    <button className="btn-add" onClick={() => addToCart(p)}>Agregar al carrito</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="servicios" className="services-section">
        <div className="container">
          <h2 className="section-title">Servicios</h2>
          <div className="grid-auto">
            {SERVICIOS.map(s => (
              <div key={s.id} className="card-service" onClick={() => handleServiceClick(s.name)}>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
                <button className="btn-cotizar-sm">Cotizar por WhatsApp</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="contact-section">
        <div className="container">
          <h2 className="section-title">Contacto</h2>
          <div className="contact-links">
            <button onClick={() => sendToWhatsApp("Hola, me gustaría hacer una consulta.")} className="contact-link">📱 WhatsApp</button>
            <a href="https://www.instagram.com/miscelaneashanny?igsh=cHVnaW04Y3l6MHlm" target="_blank" rel="noreferrer" className="contact-link">📷 Instagram</a>
            <a href="https://www.facebook.com/share/19vxGZmF7u/" target="_blank" rel="noreferrer" className="contact-link">👍 Facebook</a>
            <a href="https://www.tiktok.com/@shanny.miscelanea?_r=1&_t=ZS-961tRNcxQiS" target="_blank" rel="noreferrer" className="contact-link">🎵 TikTok</a>
          </div>
        </div>
      </section>

      <footer className="main-footer">
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '20px 0'}}>
          <div style={{textAlign: 'center'}}>
            <p style={{marginBottom: '10px', fontSize: '14px', color: 'var(--ink-muted)'}}>Escanea para llevar la tienda en tu celular:</p>
            <img src="/qr-code.png" alt="Código QR de Miscelánea Shanny" style={{width: '120px', height: '120px', borderRadius: '8px', padding: '5px', background: 'white'}} />
          </div>
          <p style={{marginTop: '10px'}}>© 2025 Miscelánea Shanny · Todos los derechos reservados</p>
        </div>
      </footer>

      <button className="floating-btn" onClick={() => setIsCartOpen(true)}>
        🛒 Ver Carrito {cartCount > 0 && <span className="badge">{cartCount}</span>}
      </button>

      {isCartOpen && (
        <div className="cart-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header"><h2>Mi Pedido</h2><button className="close-btn" onClick={() => setIsCartOpen(false)}>×</button></div>
            <div className="cart-content">
              {cartItems.length === 0 ? <p className="empty-msg">Tu carrito está vacío</p> : (
                <div className="cart-items">
                  {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="item-info"><h4>{item.nombre}</h4><p>{fmt(item.precio)}</p></div>
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
              <div className="total"><span>Total:</span><strong>{fmt(cartTotal)}</strong></div>
              <div className="modal-btns">
                <button className="btn-clear" onClick={() => setCart({})}>Limpiar</button>
                <button className="btn-checkout" onClick={handleCheckout}>Enviar a WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoginOpen && (
        <div className="cart-modal-overlay" onClick={() => setIsLoginOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
            <div className="cart-header"><h2>Acceso Administrador</h2><button className="close-btn" onClick={() => setIsLoginOpen(false)}>×</button></div>
            <div className="cart-content" style={{padding: '20px'}}>
              <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600}}>Correo Electrónico</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="search-input" style={{width: '100%', padding: '10px'}} placeholder="ejemplo@correo.com" />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600}}>Contraseña</label>
                  <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="search-input" style={{width: '100%', padding: '10px'}} placeholder="********" />
                </div>
                <button type="submit" className="btn-checkout" style={{marginTop: '10px', width: '100%'}}>Entrar como Admin</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isAddProductOpen && (
        <div className="cart-modal-overlay" onClick={() => setIsAddProductOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="cart-header"><h2>Añadir Nuevo Producto</h2><button className="close-btn" onClick={() => setIsAddProductOpen(false)}>×</button></div>
            <div className="cart-content" style={{padding: '20px'}}>
              <form onSubmit={handleAddProduct} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600}}>Nombre del Producto *</label>
                  <input type="text" value={newProduct.nombre} onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})} required className="search-input" style={{width: '100%', padding: '10px'}} placeholder="Ej. Cuaderno cuadriculado" />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600}}>Categoría *</label>
                  <input type="text" value={newProduct.categoria} onChange={(e) => setNewProduct({...newProduct, categoria: e.target.value})} required className="search-input" style={{width: '100%', padding: '10px'}} placeholder="Ej. Papelería" />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600}}>Precio (COP) *</label>
                  <input type="number" value={newProduct.precio} onChange={(e) => setNewProduct({...newProduct, precio: e.target.value})} required min="1" className="search-input" style={{width: '100%', padding: '10px'}} placeholder="Ej. 15000" />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600}}>Descripción (Opcional)</label>
                  <textarea value={newProduct.descripcion} onChange={(e) => setNewProduct({...newProduct, descripcion: e.target.value})} className="search-input" style={{width: '100%', padding: '10px', minHeight: '80px', resize: 'vertical'}} placeholder="Detalles del producto..."></textarea>
                </div>
                <div className="modal-btns" style={{marginTop: '10px', justifyContent: 'flex-end'}}>
                  <button type="button" className="btn-clear" onClick={() => setIsAddProductOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-checkout" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Producto'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}

export default App;
