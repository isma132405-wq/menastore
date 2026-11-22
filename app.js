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
let categoriaActiva = 'Todas';
let nombreOriginalEditando = null;
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
    heroBanner.classList.add('hidden');

    layoutPrincipal.className = 'grid grid-cols-1 lg:grid-cols-3 gap-8';
    seccionCatalogo.className = 'lg:col-span-2';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6';
  } else {
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
        : `<button onclick="agregarAlCarrito(${indexReal})" class="text-xs bg-neutral-950 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-full font-bold uppercase tracking-wider transition">Agregar</button>`;

    tarjeta.innerHTML = `
      <div>
        <div class="relative bg-neutral-100 p-4 flex items-center justify-center h-64 overflow-hidden">
          <span class="absolute top-3 left-3 bg-white/90 text-neutral-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
            ${prod.categoria}
          </span>
          <img src="${prod.imagen || imgDefault}" alt="${prod.nombre}" class="w-full h-full object-contain group-hover:scale-105 transition duration-300">
        </div>
        <div class="p-4">
          <p class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">MENASTORE OFFICIAL</p>
          <h3 class="font-bold text-sm text-neutral-900 mt-1 line-clamp-2 min-h-[2.5rem]">${prod.nombre}</h3>
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
        <p class="text-xs text-neutral-500">₡${item.precio.toLocaleString()} c/u</p>
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

// 6. Crear o Editar Producto (INSERT / UPDATE - protegido por RLS)
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