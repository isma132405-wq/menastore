// 1. Conexión a Supabase
const SUPABASE_URL = 'https://hxpcucivvggfcnarwuku.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kHoFrLbY_xMcH8XILfSkhw_LfDXMUtQ';
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

let esAdmin = false;

// 2. Control de interfaz según el estado de sesión
function actualizarInterfazSesion(usuario) {
  esAdmin = Boolean(usuario);

  if (esAdmin) {
    panelAdmin.classList.remove('hidden');
    badgeAdmin.classList.remove('hidden');
    btnCerrarSesion.classList.remove('hidden');
    btnAbrirLogin.classList.add('hidden');
    
    // Ajustar grilla para mostrar formulario a la izquierda y catálogo a la derecha
    layoutPrincipal.className = 'grid grid-cols-1 lg:grid-cols-3 gap-8';
    seccionCatalogo.className = 'lg:col-span-2';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6';
  } else {
    panelAdmin.classList.add('hidden');
    badgeAdmin.classList.add('hidden');
    btnCerrarSesion.classList.add('hidden');
    btnAbrirLogin.classList.remove('hidden');

    // Expandir catálogo a pantalla completa para clientes
    layoutPrincipal.className = 'grid grid-cols-1 gap-8';
    seccionCatalogo.className = 'col-span-1';
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
  }

  cargarProductos();
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

  contador.textContent = `${productos.length} artículos`;
  grid.innerHTML = '';

  productos.forEach(prod => {
    const imgDefault = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=500&q=60';
    const tarjeta = document.createElement('div');
    tarjeta.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition';
    
    // Solo mostrar botón eliminar si el usuario inició sesión como admin
    const botonAdmin = esAdmin
      ? `<button onclick="eliminarProducto('${prod.id || prod.nombre}')" class="text-xs text-red-600 hover:underline font-medium">Eliminar</button>`
      : `<span class="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-medium">Disponible</span>`;

    tarjeta.innerHTML = `
      <div>
        <img src="${prod.imagen || imgDefault}" alt="${prod.nombre}" class="w-full h-64 object-contain bg-white p-3 border-b border-slate-100">
        <div class="p-4">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">${prod.categoria}</span>
          <h3 class="font-bold text-lg mt-1 text-slate-900">${prod.nombre}</h3>
          <p class="text-slate-500 text-sm mt-1">Stock: ${prod.stock} uds.</p>
        </div>
      </div>
      <div class="px-4 pb-4 pt-3 border-t flex justify-between items-center">
        <span class="text-xl font-black text-slate-900">₡${Number(prod.precio).toLocaleString()}</span>
        ${botonAdmin}
      </div>
    `;
    grid.appendChild(tarjeta);
  });
}

// 5. Guardar producto nuevo (INSERT - protegido por RLS)
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

// 6. Eliminar producto (DELETE - protegido por RLS)
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

// 7. Verificar si ya había una sesión iniciada al abrir la página
async function iniciarApp() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  actualizarInterfazSesion(session ? session.user : null);
}

iniciarApp();