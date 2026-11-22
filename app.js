// 1. Conexión a Supabase
const SUPABASE_URL = 'https://hxpcucivvggfcnarwuku.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kHoFrLbY_xMcH8XILfSkhw_LfDXMUtQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('form-producto');
const grid = document.getElementById('grid-productos');
const contador = document.getElementById('contador');

// 2. Función para LEER productos de la base de datos (SELECT)
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
    tarjeta.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between';
    tarjeta.innerHTML = `
      <div>
        <img src="${prod.imagen || imgDefault}" alt="${prod.nombre}" class="w-full h-44 object-cover">
        <div class="p-4">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">${prod.categoria}</span>
          <h3 class="font-bold text-lg mt-1">${prod.nombre}</h3>
          <p class="text-slate-500 text-sm mt-1">Disponibles: ${prod.stock} uds.</p>
        </div>
      </div>
      <div class="px-4 pb-4 pt-2 border-t flex justify-between items-center">
        <span class="text-lg font-black text-slate-900">₡${Number(prod.precio).toLocaleString()}</span>
        <button onclick="eliminarProducto('${prod.id || prod.nombre}')" class="text-xs text-red-600 hover:underline font-medium">Eliminar</button>
      </div>
    `;
    grid.appendChild(tarjeta);
  });
}

// 3. Función para GUARDAR un producto nuevo (INSERT)
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

// 4. Función para ELIMINAR un producto (DELETE)
async function eliminarProducto(identificador) {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;

  // Intenta borrar por id si existe; si no, borra por nombre
  const { error } = await supabaseClient
    .from('productos')
    .delete()
    .or(`id.eq.${identificador},nombre.eq.${identificador}`);

  if (error) {
    // Respaldo directo por nombre si la tabla no tiene columna id
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

// Ejecutar al abrir la página
cargarProductos();