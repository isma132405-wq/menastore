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
const btnAbrirLogin = document.getElementById('btn-abrir-login');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const badgeAdmin = document.getElementById('badge-admin');
const modalLogin = document.getElementById('modal-login');

// Referencias del Carrito
const drawerCarrito = document.getElementById('drawer-carrito');
const listaCarrito = document.getElementById('lista-carrito');
const totalCarritoEl = document.getElementById('total-carrito');
const badgeCarrito = document.getElementById('badge-carrito');
const btnAbrirCarrito = document.getElementById('btn-abrir-carrito');

let esAdmin = false;
let catalogoCache = [];
let carrito = JSON.parse(localStorage.getItem('menastore_carrito')) || [];

// 2. Control de interfaz según el estado de sesión
function actualizarInterfazSesion(usuario) {
  esAdmin = Boolean(usuario);

  if (esAdmin) {
    panelAdmin.classList.remove('hidden');
    badgeAdmin.classList.remove('hidden');
    btnCerrarSesion.classList.remove('hidden');
    btnAbrirLogin.classList.add('hidden');
    btnAbrirCarrito.classList.add('hidden');

    layoutPrincipal.className = 'grid grid-cols-1 lg:grid-cols-3 gap-8';
    seccionCatalogo.className = 'lg:col-span-2';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6';
  } else {
    panelAdmin.classList.add('hidden');
    badgeAdmin.classList.add('hidden');
    btnCerrarSesion.classList.add('hidden');
    btnAbrirLogin.classList.remove('hidden');
    btnAbrirCarrito.classList.remove('hidden');

    layoutPrincipal.className = 'grid grid-cols-1 gap-8';
    seccionCatalogo.className = 'col-span-1';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
  }

  cargarProductos();
  renderizarCarrito();
}

// Funciones del Modal de Login
function abrirModalLogin() {
  modalLogin.classList.remove('hidden');
}

function cerrarModalLogin() {
  modalLogin.classList.add('hidden');
  formLogin.reset();
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

// 4. Leer productos de la base de datos (SELECT)
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
  contador.textContent = `${productos.length} artículos`;
  grid.innerHTML = '';

  productos.forEach((prod, index) => {
    const imgDefault = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=500&q=60';
    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition';
    
    const sinStock = Number(prod.stock) <= 0;

    const accionTarjeta = esAdmin
      ? `<button onclick="eliminarProducto('${prod.id || prod.nombre}')" class="text-xs text-red-600 hover:underline font-medium">Eliminar</button>`
      : sinStock
        ? `<span class="text-xs text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-lg font-medium">Agotado</span>`
        : `<button onclick="agregarAlCarrito(${index})" class="text-xs bg-slate-900 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold transition">Agregar +</button>`;

    tarjeta.innerHTML = `
      <div>
        <img src="${prod.imagen || imgDefault}" alt="${prod.nombre}" class="w-full h-64 object-contain bg-white p-3 border-b border-slate-100">
        <div class="p-4">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">${prod.categoria}</span>
          <h3 class="font-bold text-lg mt-1 text-slate-900">${prod.nombre}</h3>
          <p class="text-slate-500 text-sm mt-1">Disponibles: ${prod.stock} uds.</p>
        </div>
      </div>
      <div class="px-4 pb-4 pt-3 border-t flex justify-between items-center">
        <span class="text-xl font-black text-slate-900">₡${Number(prod.precio).toLocaleString()}</span>
        ${accionTarjeta}
      </div>
    `;
    grid.appendChild(tarjeta);
  });
}

// 5. Lógica del Carrito de Compras
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

function agregarAlCarrito(indexProducto) {
  const prod = catalogoCache[indexProducto];
  if (!prod) return;

  const clave = prod.id || prod.nombre;
  const existente = carrito.find(item => item.clave === clave);

  if (existente) {
    if (existente.cantidad >= prod.stock) {
      alert(`Solo hay ${prod.stock} unidades disponibles de este artículo.`);
      return;
    }
    existente.cantidad += 1;
  } else {
    carrito.push({
      clave,
      nombre: prod.nombre,
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
  } else if (nuevaCantidad > item.stockMax) {
    alert(`Stock máximo alcanzado (${item.stockMax} uds.).`);
    return;
  } else {
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
    listaCarrito.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">Tu carrito está vacío. Agrega artículos del catálogo para empezar.</p>`;
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
        <h4 class="font-bold text-sm text-slate-900">${item.nombre}</h4>
        <p class="text-xs text-slate-500">₡${item.precio.toLocaleString()} c/u</p>
        <p class="text-xs font-bold text-emerald-700 mt-0.5">Subtotal: ₡${subtotal.toLocaleString()}</p>
      </div>
      <div class="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1">
        <button onclick="cambiarCantidad('${item.clave}', -1)" class="w-6 h-6 font-bold text-slate-700 hover:text-red-600">-</button>
        <span class="text-sm font-bold w-5 text-center">${item.cantidad}</span>
        <button onclick="cambiarCantidad('${item.clave}', 1)" class="w-6 h-6 font-bold text-slate-700 hover:text-emerald-600">+</button>
      </div>
    `;
    listaCarrito.appendChild(fila);
  });

  totalCarritoEl.textContent = `₡${totalColones.toLocaleString()}`;
}

function enviarPedidoWhatsApp() {
  if (carrito.length === 0) {
    alert('Agrega al menos un producto al carrito antes de confirmar.');
    return;
  }

  let total = 0;
  let lineas = carrito.map(item => {
    const sub = item.precio * item.cantidad;
    total += sub;
    return `• ${item.cantidad}x ${item.nombre} — ₡${sub.toLocaleString()}`;
  });

  const mensaje = `Hola MENASTORE, me gustaría realizar el siguiente pedido:\n\n${lineas.join('\n')}\n\n*Total: ₡${total.toLocaleString()}*`;
  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// 6. Guardar producto nuevo (INSERT - protegido por RLS)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar');
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  const nuevoProducto = {
    nombre: document.getElementById('nombre').value,
    precio: parseFloat(document.getElementById('precio').value),
    stock: parseInt(document.getElementById('stock').value),
    categoria: document.getElementById('categoria').value,
    imagen: document.getElementById('imagen').value
  };

  const { error } = await supabaseClient
    .from('productos')
    .insert([nuevoProducto]);

  btn.textContent = 'Guardar en Base de Datos';
  btn.disabled = false;

  if (error) {
    alert('Error al guardar: ' + error.message);
  } else {
    form.reset();
    cargarProductos();
  }
});

// 7. Eliminar producto (DELETE - protegido por RLS)
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

// 8. Verificar sesión al iniciar
async function iniciarApp() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  actualizarInterfazSesion(session ? session.user : null);
}

iniciarApp();