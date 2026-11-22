// 1. Conexión a Supabase y configuración de tienda
const SUPABASE_URL = 'https://hxpcucivvggfcnarwuku.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kHoFrLbY_xMcH8XILfSkhw_LfDXMUtQ';
const TELEFONO_WHATSAPP = '50684316789'; // Cambia por tu número real con código 506
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Referencias del DOM
const form = document.getElementById('form-producto');
const formLogin = document.getElementById('form-login');
const grid = document.getElementById('grid-productos');
const contador = document.getElementById('contador');
const panelAdmin = document.getElementById('panel-admin');
const layoutPrincipal = document.getElementById('layout-principal');
const seccionCatalogo = document.getElementById('seccion-catalogo');
const tituloSeccionCatalogo = document.getElementById('titulo-seccion-catalogo');
const heroBanner = document.getElementById('hero-banner');
const btnAbrirLogin = document.getElementById('btn-abrir-login');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const badgeAdmin = document.getElementById('badge-admin');
const modalLogin = document.getElementById('modal-login');
const modalTallas = document.getElementById('modal-tallas');
const modalDetalle = document.getElementById('modal-detalle');

// Referencias de Pestañas Admin e Historial de Pedidos
const tabsAdmin = document.getElementById('tabs-admin');
const vistaPedidos = document.getElementById('vista-pedidos');
const listaPedidosAdmin = document.getElementById('lista-pedidos-admin');
const badgePedidosPendientes = document.getElementById('badge-pedidos-pendientes');
const tabBtnInventario = document.getElementById('tab-btn-inventario');
const tabBtnPedidos = document.getElementById('tab-btn-pedidos');

// Referencias de Edición y Filtros
const tituloFormAdmin = document.getElementById('titulo-form-admin');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const btnGuardar = document.getElementById('btn-guardar');
const inputEditId = document.getElementById('edit-id');
const inputBuscador = document.getElementById('buscador');

// Referencias del Carrito
const drawerCarrito = document.getElementById('drawer-carrito');
const listaCarrito = document.getElementById('lista-carrito');
const totalCarritoEl = document.getElementById('total-carrito');
const badgeCarrito = document.getElementById('badge-carrito');
const btnAbrirCarrito = document.getElementById('btn-abrir-carrito');

let esAdmin = false;
let catalogoCache = [];
let pedidosCache = [];
let categoriaActiva = 'Todas';
let nombreOriginalEditando = null;
let productoDetalleActual = null;
let tallaSeleccionada = 'M';
let carrito = JSON.parse(localStorage.getItem('menastore_carrito')) || [];

// 2. Control de interfaz según el estado de sesión
function actualizarInterfazSesion(usuario) {
  esAdmin = Boolean(usuario);

  if (esAdmin) {
    tabsAdmin.classList.remove('hidden');
    panelAdmin.classList.remove('hidden');
    badgeAdmin.classList.remove('hidden');
    btnCerrarSesion.classList.remove('hidden');
    btnAbrirLogin.classList.add('hidden');
    btnAbrirCarrito.classList.add('hidden');
    heroBanner.classList.add('hidden');

    cambiarVistaAdmin('inventario');
    cargarPedidos();
  } else {
    tabsAdmin.classList.add('hidden');
    vistaPedidos.classList.add('hidden');
    layoutPrincipal.classList.remove('hidden');
    panelAdmin.classList.add('hidden');
    badgeAdmin.classList.add('hidden');
    btnCerrarSesion.classList.add('hidden');
    btnAbrirLogin.classList.remove('hidden');
    btnAbrirCarrito.classList.remove('hidden');
    heroBanner.classList.remove('hidden');
    cancelarEdicion();

    layoutPrincipal.className = 'grid grid-cols-1 gap-8';
    seccionCatalogo.className = 'col-span-1';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6';
  }

  cargarProductos();
  renderizarCarrito();
}

function cambiarVistaAdmin(vista) {
  if (vista === 'pedidos') {
    layoutPrincipal.classList.add('hidden');
    vistaPedidos.classList.remove('hidden');
    tabBtnPedidos.className = 'bg-neutral-950 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition flex items-center gap-2';
    tabBtnInventario.className = 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition';
    cargarPedidos();
  } else {
    vistaPedidos.classList.add('hidden');
    layoutPrincipal.classList.remove('hidden');
    layoutPrincipal.className = 'grid grid-cols-1 lg:grid-cols-3 gap-8';
    seccionCatalogo.className = 'lg:col-span-2';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6';
    tabBtnInventario.className = 'bg-neutral-950 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition';
    tabBtnPedidos.className = 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition flex items-center gap-2';
  }
}

// Modales de Login y Guía de Tallas
function abrirModalLogin() {
  modalLogin.classList.remove('hidden');
}

function cerrarModalLogin() {
  modalLogin.classList.add('hidden');
  formLogin.reset();
}

function abrirGuiaTallas() {
  modalTallas.classList.remove('hidden');
}

function cerrarGuiaTallas() {
  modalTallas.classList.add('hidden');
}

// 3. Iniciar y cerrar sesión con Supabase Auth
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-login');
  btn.textContent = 'Verificando...';
  btn.disabled = true;

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  btn.textContent = 'Iniciar Sesión';
  btn.disabled = false;

  if (error) {
    alert('Credenciales incorrectas: ' + error.message);
  } else {
    cerrarModalLogin();
    actualizarInterfazSesion(data.user);
  }
});

async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  actualizarInterfazSesion(null);
}

// 4. Leer productos y aplicar búsqueda/filtros
async function cargarProductos() {
  const { data: productos, error } = await supabaseClient
    .from('productos')
    .select('*');

  if (error) {
    console.error('Error al cargar:', error);
    contador.textContent = 'Error al cargar';
    return;
  }

  catalogoCache = productos;
  aplicarFiltros();
}

function seleccionarCategoria(categoria) {
  categoriaActiva = categoria;
  tituloSeccionCatalogo.textContent = categoria === 'Todas' ? 'Todo el Catálogo' : categoria;

  document.querySelectorAll('.btn-cat').forEach(btn => {
    if (btn.dataset.cat === categoria) {
      btn.className = 'btn-cat bg-neutral-950 text-white text-xs uppercase tracking-wider font-bold px-4 py-1.5 rounded-full transition whitespace-nowrap';
    } else {
      btn.className = 'btn-cat bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-900 text-xs uppercase tracking-wider font-bold px-4 py-1.5 rounded-full transition whitespace-nowrap';
    }
  });

  aplicarFiltros();
}

function aplicarFiltros() {
  const texto = inputBuscador.value.trim().toLowerCase();

  const filtrados = catalogoCache.filter(prod => {
    const coincideCategoria = categoriaActiva === 'Todas' || prod.categoria === categoriaActiva;
    const coincideTexto = prod.nombre.toLowerCase().includes(texto) || prod.categoria.toLowerCase().includes(texto);
    return coincideCategoria && coincideTexto;
  });

  renderizarCatalogo(filtrados);
}

function renderizarCatalogo(listaProductos) {
  contador.textContent = `${listaProductos.length} productos`;
  grid.innerHTML = '';

  if (listaProductos.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-14 text-neutral-400 text-sm bg-neutral-50 rounded-2xl border border-neutral-200">No se encontraron artículos con ese criterio.</div>`;
    return;
  }

  listaProductos.forEach(prod => {
    const imgDefault = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=500&q=60';
    const tarjeta = document.createElement('article');
    tarjeta.className = 'group bg-white rounded-xl border border-neutral-200/80 overflow-hidden flex flex-col justify-between hover:border-neutral-400 transition';
    
    const indexReal = catalogoCache.indexOf(prod);
    const sinStock = Number(prod.stock) <= 0;

    const accionTarjeta = esAdmin
      ? `<div class="flex items-center gap-3">
           <button onclick="prepararEdicion(${indexReal})" class="text-xs text-blue-600 hover:underline font-bold uppercase">Editar</button>
           <button onclick="eliminarProducto('${prod.id || prod.nombre}')" class="text-xs text-red-600 hover:underline font-bold uppercase">Eliminar</button>
         </div>`
      : sinStock
        ? `<span class="text-xs text-neutral-400 font-bold uppercase">Agotado</span>`
        : `<button onclick="abrirModalDetalle(${indexReal})" class="text-xs bg-neutral-950 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-full font-bold uppercase tracking-wider transition">Elegir</button>`;

    tarjeta.innerHTML = `
      <div>
        <div onclick="abrirModalDetalle(${indexReal})" class="cursor-pointer relative bg-neutral-100 p-4 flex items-center justify-center h-64 overflow-hidden">
          <span class="absolute top-3 left-3 bg-white/90 text-neutral-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
            ${prod.categoria}
          </span>
          <img src="${prod.imagen || imgDefault}" alt="${prod.nombre}" class="w-full h-full object-contain group-hover:scale-105 transition duration-300">
        </div>
        <div class="p-4">
          <p class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">MENASTORE OFFICIAL</p>
          <h3 onclick="abrirModalDetalle(${indexReal})" class="cursor-pointer hover:text-emerald-700 font-bold text-sm text-neutral-900 mt-1 line-clamp-2 min-h-[2.5rem] transition">${prod.nombre}</h3>
          <p class="text-neutral-500 text-xs mt-1.5">Stock disponible: ${prod.stock} uds.</p>
        </div>
      </div>
      <div class="px-4 pb-4 pt-3 border-t border-neutral-100 flex justify-between items-center">
        <span class="text-lg font-black text-neutral-950">₡${Number(prod.precio).toLocaleString()}</span>
        ${accionTarjeta}
      </div>
    `;
    grid.appendChild(tarjeta);
  });
}

// 5. Vista Rápida y Selector de Talla
function abrirModalDetalle(indexProducto) {
  const prod = catalogoCache[indexProducto];
  if (!prod) return;

  productoDetalleActual = prod;
  const imgDefault = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=500&q=60';

  document.getElementById('detalle-imagen').src = prod.imagen || imgDefault;
  document.getElementById('detalle-imagen').alt = prod.nombre;
  document.getElementById('detalle-categoria').textContent = prod.categoria;
  document.getElementById('detalle-nombre').textContent = prod.nombre;
  document.getElementById('detalle-precio').textContent = `₡${Number(prod.precio).toLocaleString()}`;
  document.getElementById('detalle-stock').textContent = `Disponibles en inventario: ${prod.stock} uds.`;

  const opcionesContenedor = document.getElementById('opciones-talla');
  let tallasDisponibles = ['S', 'M', 'L', 'XL'];

  if (prod.categoria === 'Calzado') {
    tallasDisponibles = ['39', '40', '41', '42', '43'];
  } else if (prod.categoria === 'Balones' || prod.categoria === 'Accesorios') {
    tallasDisponibles = ['Única'];
  }

  tallaSeleccionada = tallasDisponibles.includes('M') ? 'M' : tallasDisponibles[0];

  opcionesContenedor.innerHTML = tallasDisponibles.map(talla => `
    <button type="button" onclick="seleccionarTalla('${talla}')" data-talla="${talla}" class="btn-talla px-3.5 py-2 rounded-lg text-xs font-black border transition ${talla === tallaSeleccionada ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-950'}">
      ${talla}
    </button>
  `).join('');

  const btnConfirmar = document.getElementById('btn-confirmar-detalle');
  if (Number(prod.stock) <= 0) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Agotado';
    btnConfirmar.className = 'w-full bg-neutral-200 text-neutral-500 font-bold text-xs uppercase tracking-wider py-3.5 rounded-full cursor-not-allowed';
  } else {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Añadir al Carrito';
    btnConfirmar.className = 'w-full bg-neutral-950 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-full transition';
  }

  modalDetalle.classList.remove('hidden');
}

function cerrarModalDetalle() {
  modalDetalle.classList.add('hidden');
  productoDetalleActual = null;
}

function seleccionarTalla(talla) {
  tallaSeleccionada = talla;
  document.querySelectorAll('.btn-talla').forEach(btn => {
    if (btn.dataset.talla === talla) {
      btn.className = 'btn-talla px-3.5 py-2 rounded-lg text-xs font-black border transition bg-neutral-950 text-white border-neutral-950';
    } else {
      btn.className = 'btn-talla px-3.5 py-2 rounded-lg text-xs font-black border transition bg-white text-neutral-700 border-neutral-300 hover:border-neutral-950';
    }
  });
}

function confirmarAgregarDesdeDetalle() {
  if (!productoDetalleActual) return;
  agregarAlCarritoConTalla(productoDetalleActual, tallaSeleccionada);
  cerrarModalDetalle();
}

// 6. Lógica del Carrito de Compras y Registro de Pedido en Supabase
function guardarCarritoLocal() {
  localStorage.setItem('menastore_carrito', JSON.stringify(carrito));
  renderizarCarrito();
}

function abrirCarrito() {
  drawerCarrito.classList.remove('hidden');
}

function cerrarCarrito() {
  drawerCarrito.classList.add('hidden');
}

function agregarAlCarritoConTalla(prod, talla) {
  const baseId = prod.id || prod.nombre;
  const clave = `${baseId}__${talla}`;
  const existente = carrito.find(item => item.clave === clave);

  const totalMismoProducto = carrito
    .filter(item => item.baseId === baseId)
    .reduce((acc, item) => acc + item.cantidad, 0);

  if (totalMismoProducto >= prod.stock) {
    alert(`Solo hay ${prod.stock} unidades disponibles de este artículo.`);
    return;
  }

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      clave,
      baseId,
      productoId: prod.id || null,
      nombre: prod.nombre,
      talla,
      precio: Number(prod.precio),
      imagen: prod.imagen,
      stockMax: Number(prod.stock),
      cantidad: 1
    });
  }

  guardarCarritoLocal();
  abrirCarrito();
}

function cambiarCantidad(clave, delta) {
  const item = carrito.find(i => i.clave === clave);
  if (!item) return;

  const nuevaCantidad = item.cantidad + delta;
  if (nuevaCantidad <= 0) {
    carrito = carrito.filter(i => i.clave !== clave);
  } else {
    const totalMismoProducto = carrito
      .filter(i => i.baseId === item.baseId && i.clave !== clave)
      .reduce((acc, i) => acc + i.cantidad, 0);

    if (totalMismoProducto + nuevaCantidad > item.stockMax) {
      alert(`Stock máximo alcanzado (${item.stockMax} uds.).`);
      return;
    }
    item.cantidad = nuevaCantidad;
  }

  guardarCarritoLocal();
}

function vaciarCarrito() {
  if (carrito.length === 0) return;
  carrito = [];
  guardarCarritoLocal();
}

function renderizarCarrito() {
  const totalUnidades = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  badgeCarrito.textContent = totalUnidades;

  if (carrito.length === 0) {
    listaCarrito.innerHTML = `<p class="text-center text-neutral-400 text-sm py-12">Tu carrito está vacío. Agrega artículos del catálogo para empezar.</p>`;
    totalCarritoEl.textContent = '₡0';
    return;
  }

  let totalColones = 0;
  listaCarrito.innerHTML = '';

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    totalColones += subtotal;

    const fila = document.createElement('div');
    fila.className = 'flex items-center justify-between gap-3 border-b pb-3';
    fila.innerHTML = `
      <div class="flex-grow">
        <h4 class="font-bold text-sm text-neutral-900">${item.nombre}</h4>
        <p class="text-xs text-neutral-500">Talla: <span class="font-bold text-neutral-800">${item.talla || 'Única'}</span> &bull; ₡${item.precio.toLocaleString()} c/u</p>
        <p class="text-xs font-bold text-emerald-700 mt-0.5">Subtotal: ₡${subtotal.toLocaleString()}</p>
      </div>
      <div class="flex items-center gap-2 bg-neutral-100 rounded-full px-2.5 py-1">
        <button onclick="cambiarCantidad('${item.clave}', -1)" class="w-6 h-6 font-bold text-neutral-700 hover:text-red-600">-</button>
        <span class="text-sm font-bold w-5 text-center">${item.cantidad}</span>
        <button onclick="cambiarCantidad('${item.clave}', 1)" class="w-6 h-6 font-bold text-neutral-700 hover:text-emerald-600">+</button>
      </div>
    `;
    listaCarrito.appendChild(fila);
  });

  totalCarritoEl.textContent = `₡${totalColones.toLocaleString()}`;
}

async function enviarPedidoWhatsApp() {
  if (carrito.length === 0) {
    alert('Agrega al menos un producto al carrito antes de confirmar.');
    return;
  }

  const btnWa = document.getElementById('btn-confirmar-wa');
  btnWa.textContent = 'Registrando pedido...';
  btnWa.disabled = true;

  const clienteNombre = document.getElementById('cliente-nombre').value.trim() || 'Cliente Web';
  const clienteTelefono = document.getElementById('cliente-telefono').value.trim() || 'No indicado';

  let total = 0;
  let lineas = carrito.map(item => {
    const sub = item.precio * item.cantidad;
    total += sub;
    const etiquetaTalla = item.talla && item.talla !== 'Única' ? ` (Talla: ${item.talla})` : '';
    return `• ${item.cantidad}x ${item.nombre}${etiquetaTalla} — ₡${sub.toLocaleString()}`;
  });

  // Guardar pedido en Supabase antes de abrir WhatsApp
  const { data: pedidoCreado, error } = await supabaseClient
    .from('pedidos')
    .insert([{
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      detalle: carrito,
      total: total,
      estado: 'Pendiente'
    }])
    .select()
    .single();

  btnWa.textContent = 'Confirmar Pedido por WhatsApp';
  btnWa.disabled = false;

  if (error) {
    console.error('No se pudo guardar en tabla pedidos:', error);
  }

  const numeroOrden = pedidoCreado ? ` #${pedidoCreado.id}` : '';
  const mensaje = `Hola MENASTORE, me gustaría realizar el pedido${numeroOrden}:\n\n${lineas.join('\n')}\n\n*Total: ₡${total.toLocaleString()}*`;
  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

  carrito = [];
  guardarCarritoLocal();
  cerrarCarrito();
  window.open(url, '_blank');
}

// 7. Gestión de Historial de Pedidos y Descuento Automático de Stock (Admin)
async function cargarPedidos() {
  const { data: pedidos, error } = await supabaseClient
    .from('pedidos')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al cargar pedidos:', error);
    listaPedidosAdmin.innerHTML = `<p class="text-sm text-red-600">Error al cargar historial de pedidos.</p>`;
    return;
  }

  pedidosCache = pedidos;
  const pendientes = pedidos.filter(p => p.estado === 'Pendiente').length;
  badgePedidosPendientes.textContent = pendientes;

  if (pedidos.length === 0) {
    listaPedidosAdmin.innerHTML = `<div class="text-center py-12 bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-400 text-sm">Aún no se han recibido pedidos desde la tienda.</div>`;
    return;
  }

  listaPedidosAdmin.innerHTML = pedidos.map(pedido => {
    const fechaFormateada = new Date(pedido.fecha).toLocaleString('es-CR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const esPendiente = pedido.estado === 'Pendiente';
    const badgeEstado = esPendiente
      ? `<span class="bg-amber-100 text-amber-800 text-[11px] font-black uppercase px-2.5 py-1 rounded-full">Pendiente</span>`
      : pedido.estado === 'Completado'
        ? `<span class="bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase px-2.5 py-1 rounded-full">Completado (Stock descontado)</span>`
        : `<span class="bg-red-100 text-red-700 text-[11px] font-black uppercase px-2.5 py-1 rounded-full">Cancelado</span>`;

    const itemsHtml = (pedido.detalle || []).map(item => `
      <li class="text-xs text-neutral-700 flex justify-between py-1 border-b border-neutral-100 last:border-0">
        <span><strong>${item.cantidad}x</strong> ${item.nombre} <span class="text-neutral-400">(Talla: ${item.talla || 'Única'})</span></span>
        <span class="font-bold">₡${(item.precio * item.cantidad).toLocaleString()}</span>
      </li>
    `).join('');

    const accionesPedido = esPendiente
      ? `<div class="flex flex-wrap gap-2 pt-3">
           <button onclick="aprobarYDescontarStock(${pedido.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition">
             Completar y Descontar Stock
           </button>
           <button onclick="cambiarEstadoPedido(${pedido.id}, 'Cancelado')" class="bg-white border border-neutral-300 hover:border-red-600 text-neutral-600 hover:text-red-600 text-xs font-bold uppercase px-3 py-2 rounded-lg transition">
             Cancelar
           </button>
         </div>`
      : `<div class="pt-2 flex justify-end">
           <button onclick="eliminarPedido(${pedido.id})" class="text-xs text-neutral-400 hover:text-red-600 underline">Eliminar registro</button>
         </div>`;

    return `
      <div class="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-3">
        <div class="flex flex-wrap justify-between items-start gap-2 border-b border-neutral-100 pb-3">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-base font-black text-neutral-950">Orden #${pedido.id}</span>
              ${badgeEstado}
            </div>
            <p class="text-xs text-neutral-500 mt-1">
              <strong>Cliente:</strong> ${pedido.cliente_nombre} &bull; <strong>Tel:</strong> ${pedido.cliente_telefono} &bull; ${fechaFormateada}
            </p>
          </div>
          <div class="text-right">
            <p class="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">Total Pedido</p>
            <p class="text-xl font-black text-neutral-950">₡${Number(pedido.total).toLocaleString()}</p>
          </div>
        </div>
        <ul class="bg-neutral-50 rounded-xl p-3">${itemsHtml}</ul>
        ${accionesPedido}
      </div>
    `;
  }).join('');
}

async function aprobarYDescontarStock(pedidoId) {
  const pedido = pedidosCache.find(p => p.id === pedidoId);
  if (!pedido) return;

  if (!confirm(`¿Confirmar venta de la Orden #${pedidoId} y descontar los artículos del inventario?`)) return;

  for (const item of pedido.detalle) {
    const prodEnCatalogo = catalogoCache.find(p => (item.productoId && p.id === item.productoId) || p.nombre === item.nombre);
    if (prodEnCatalogo) {
      const nuevoStock = Math.max(0, Number(prodEnCatalogo.stock) - Number(item.cantidad));
      const query = prodEnCatalogo.id
        ? supabaseClient.from('productos').update({ stock: nuevoStock }).eq('id', prodEnCatalogo.id)
        : supabaseClient.from('productos').update({ stock: nuevoStock }).eq('nombre', prodEnCatalogo.nombre);
      await query;
    }
  }

  const { error } = await supabaseClient
    .from('pedidos')
    .update({ estado: 'Completado' })
    .eq('id', pedidoId);

  if (error) {
    alert('Error al actualizar pedido: ' + error.message);
    return;
  }

  await cargarProductos();
  await cargarPedidos();
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
  const { error } = await supabaseClient
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId);

  if (error) {
    alert('Error al actualizar estado: ' + error.message);
    return;
  }
  cargarPedidos();
}

async function eliminarPedido(pedidoId) {
  if (!confirm('¿Eliminar este registro del historial?')) return;
  const { error } = await supabaseClient
    .from('pedidos')
    .delete()
    .eq('id', pedidoId);

  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }
  cargarPedidos();
}

// 8. Crear o Editar Producto (INSERT / UPDATE - protegido por RLS)
function prepararEdicion(indexProducto) {
  const prod = catalogoCache[indexProducto];
  if (!prod) return;

  inputEditId.value = prod.id || '';
  nombreOriginalEditando = prod.nombre;

  document.getElementById('nombre').value = prod.nombre;
  document.getElementById('precio').value = prod.precio;
  document.getElementById('stock').value = prod.stock;
  document.getElementById('categoria').value = prod.categoria;
  document.getElementById('imagen').value = prod.imagen || '';

  tituloFormAdmin.textContent = 'Editar Artículo';
  btnGuardar.textContent = 'Actualizar Artículo';
  btnGuardar.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg transition';
  btnCancelarEdicion.classList.remove('hidden');

  panelAdmin.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion() {
  form.reset();
  inputEditId.value = '';
  nombreOriginalEditando = null;
  tituloFormAdmin.textContent = 'Nuevo Artículo';
  btnGuardar.textContent = 'Guardar en Catálogo';
  btnGuardar.className = 'w-full bg-neutral-950 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg transition';
  btnCancelarEdicion.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnGuardar.textContent = 'Procesando...';
  btnGuardar.disabled = true;

  const datosProducto = {
    nombre: document.getElementById('nombre').value,
    precio: parseFloat(document.getElementById('precio').value),
    stock: parseInt(document.getElementById('stock').value),
    categoria: document.getElementById('categoria').value,
    imagen: document.getElementById('imagen').value
  };

  const editId = inputEditId.value;
  let errorOperacion = null;

  if (editId || nombreOriginalEditando) {
    const filtro = editId
      ? supabaseClient.from('productos').update(datosProducto).eq('id', editId)
      : supabaseClient.from('productos').update(datosProducto).eq('nombre', nombreOriginalEditando);

    const { error } = await filtro;
    errorOperacion = error;
  } else {
    const { error } = await supabaseClient.from('productos').insert([datosProducto]);
    errorOperacion = error;
  }

  btnGuardar.disabled = false;

  if (errorOperacion) {
    alert('Error al guardar: ' + errorOperacion.message);
    btnGuardar.textContent = (editId || nombreOriginalEditando) ? 'Actualizar Artículo' : 'Guardar en Catálogo';
  } else {
    cancelarEdicion();
    cargarProductos();
  }
});

// 9. Eliminar producto (DELETE - protegido por RLS)
async function eliminarProducto(identificador) {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;

  const { error } = await supabaseClient
    .from('productos')
    .delete()
    .or(`id.eq.${identificador},nombre.eq.${identificador}`);

  if (error) {
    const { error: errorNombre } = await supabaseClient
      .from('productos')
      .delete()
      .eq('nombre', identificador);

    if (errorNombre) {
      alert('Error al eliminar: ' + errorNombre.message);
      return;
    }
  }
  cargarProductos();
}

// 10. Verificar sesión al iniciar
async function iniciarApp() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  actualizarInterfazSesion(session ? session.user : null);
}

iniciarApp();

// 11. Carrusel automático del Hero Banner
let slideHeroActual = 0;
const totalSlidesHero = 3;
let intervaloHero = null;

function actualizarHero() {
  const track = document.getElementById('hero-track');
  if (!track) return;

  track.style.transform = `translateX(-${slideHeroActual * 100}%)`;

  document.querySelectorAll('.hero-dot').forEach((dot, idx) => {
    if (idx === slideHeroActual) {
      dot.className = 'hero-dot w-6 h-1.5 rounded-full bg-emerald-400 transition-all';
    } else {
      dot.className = 'hero-dot w-2.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70 transition-all';
    }
  });
}

function moverHero(direccion) {
  slideHeroActual = (slideHeroActual + direccion + totalSlidesHero) % totalSlidesHero;
  actualizarHero();
  reiniciarAutoplayHero();
}

function irASlideHero(indice) {
  slideHeroActual = indice;
  actualizarHero();
  reiniciarAutoplayHero();
}

function reiniciarAutoplayHero() {
  clearInterval(intervaloHero);
  intervaloHero = setInterval(() => {
    slideHeroActual = (slideHeroActual + 1) % totalSlidesHero;
    actualizarHero();
  }, 5000);
}

reiniciarAutoplayHero();