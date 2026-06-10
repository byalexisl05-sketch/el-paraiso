import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Lógica limpia extraída para cumplir con la regla de SonarQube
function getIconoBotonPago(metodo) {
  if (metodo === 'efectivo') return '💵 Efectivo'
  if (metodo === 'transferencia') return '📲 Transferencia'
  return '💳 Pago'
}

export default function Fiados() {
  const [clientes, setClientes] = useState([])
  const [deudas, setDeudas] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('clientes')
  const [modalCliente, setModalCliente] = useState(false)
  const [modalDeuda, setModalDeuda] = useState(false)
  const [modalAbono, setModalAbono] = useState(false)
  const [modalEliminarCliente, setModalEliminarCliente] = useState(null)
  const [modalEliminarDeuda, setModalEliminarDeuda] = useState(null)
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null)

  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', notas: '' })
  const [formDeuda, setFormDeuda] = useState({ cliente_id: '', descripcion: '', monto_original: '' })
  const [formAbono, setFormAbono] = useState({ monto: '', metodo_pago: 'efectivo' })

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setLoading(true)
    const [{ data: cls }, { data: dds }] = await Promise.all([
      supabase.from('clientes').select('*').eq('activo', true).order('nombre'),
      supabase.from('deudas').select('*, clientes(nombre)').eq('pagado', false).order('fecha', { ascending: false })
    ])
    setClientes(cls || [])
    setDeudas(dds || [])
    setLoading(false)
  }

  async function guardarCliente() {
    if (!formCliente.nombre) { toast.error('El nombre es obligatorio'); return }
    const { error } = await supabase.from('clientes').insert([{
      nombre: formCliente.nombre,
      telefono: formCliente.telefono || null,
      notes: formCliente.notas || null
    }])
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Cliente agregado ✓')
    setModalCliente(false)
    setFormCliente({ nombre: '', telefono: '', notas: '' })
    cargarDatos()
  }

  async function eliminarCliente() {
    // Marcar como inactivo en vez de borrar para no perder historial
    const { error } = await supabase
      .from('clientes')
      .update({ activo: false })
      .eq('id', modalEliminarCliente.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Cliente eliminado')
    setModalEliminarCliente(null)
    cargarDatos()
  }

  async function guardarDeuda() {
    if (!formDeuda.cliente_id || !formDeuda.monto_original || !formDeuda.descripcion) {
      toast.error('Todos los campos son obligatorios'); return
    }
    const monto = Number.parseFloat(formDeuda.monto_original)
    const { error } = await supabase.from('deudas').insert([{
      cliente_id: formDeuda.cliente_id,
      descripcion: formDeuda.descripcion,
      monto_original: monto,
      monto_pendiente: monto,
    }])
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Deuda registrada ✓')
    setModalDeuda(false)
    setFormDeuda({ cliente_id: '', descripcion: '', monto_original: '' })
    cargarDatos()
  }

  async function eliminarDeuda() {
    const { error } = await supabase.from('deudas').delete().eq('id', modalEliminarDeuda.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Deuda eliminada')
    setModalEliminarDeuda(null)
    cargarDatos()
  }

  async function guardarAbono() {
    if (!formAbono.monto) { toast.error('Ingresa el monto del abono'); return }
    const abono = Number.parseFloat(formAbono.monto)
    if (abono > Number.parseFloat(deudaSeleccionada.monto_pendiente)) {
      toast.error('El abono no puede ser mayor a la deuda pendiente'); return
    }

    const nuevoPendiente = Number.parseFloat(deudaSeleccionada.monto_pendiente) - abono
    const pagado = nuevoPendiente <= 0

    // 1. Actualizar la deuda
    const { error: errorDeuda } = await supabase
      .from('deudas')
      .update({ monto_pendiente: nuevoPendiente, pagado })
      .eq('id', deudaSeleccionada.id)
    if (errorDeuda) { toast.error('Error al guardar'); return }

    // 2. Registrar el pago
    await supabase.from('pagos_deudas').insert([{
      deuda_id: deudaSeleccionada.id,
      monto: abono,
      metodo_pago: formAbono.metodo_pago,
      registrado_en_ventas: true
    }])

    // 3. Registrar el abono como ingreso en ventas
    await supabase.from('ventas').insert([{
      descripcion: `Abono fiado — ${deudaSeleccionada.clientes?.nombre}`,
      monto_total: abono,
      metodo_pago: formAbono.metodo_pago,
      monto_efectivo: formAbono.metodo_pago === 'efectivo' ? abono : 0,
      monto_transferencia: formAbono.metodo_pago === 'transferencia' ? abono : 0,
      es_fiado: true,
      cliente_id: deudaSeleccionada.cliente_id
    }])

    // 4. Actualizar deuda_total del cliente
    await supabase.from('clientes').update({
      deuda_total: nuevoPendiente
    }).eq('id', deudaSeleccionada.cliente_id)

    toast.success(pagado ? '¡Deuda pagada completamente! 🎉' : `Abono registrado ✓ Quedan $${nuevoPendiente.toFixed(2)}`)
    setModalAbono(false)
    setFormAbono({ monto: '', metodo_pago: 'efectivo' })
    cargarDatos()
  }

  const totalPendiente = deudas.reduce((s, d) => s + Number.parseFloat(d.monto_pendiente), 0)

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fiados</h1>
          <p className="text-gray-400 text-sm mt-1">
            {deudas.length} deudas pendientes ·
            <span className="text-red-400 ml-1">${totalPendiente.toFixed(2)} total</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalDeuda(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
            + Nueva deuda
          </button>
          <button onClick={() => setModalCliente(true)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            + Cliente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-gray-900 p-1 rounded-lg w-fit">
        <button onClick={() => setVista('clientes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            vista === 'clientes' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
          }`}>
          👥 Clientes ({clientes.length})
        </button>
        <button onClick={() => setVista('deudas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            vista === 'deudas' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
          }`}>
          💳 Deudas pendientes ({deudas.length})
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">Cargando...</div>
      ) : vista === 'clientes' ? (

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-right px-4 py-3">Deuda total</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center text-xs font-bold">
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.telefono || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${Number.parseFloat(c.deuda_total) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${Number.parseFloat(c.deuda_total || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setFormDeuda({...formDeuda, cliente_id: c.id}); setModalDeuda(true) }}
                        className="text-xs text-yellow-400 hover:underline">
                        + Deuda
                      </button>
                      <button
                        onClick={() => setModalEliminarCliente(c)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-500 py-10">No hay clientes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>

      ) : (

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Original</th>
                <th className="text-right px-4 py-3">Pendiente</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {deudas.map(d => (
                <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{d.clientes?.nombre}</td>
                  <td className="px-4 py-3 text-gray-400">{d.descripcion || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(d.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">${Number.parseFloat(d.monto_original).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-red-400 font-bold">${Number.parseFloat(d.monto_pendiente).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setDeudaSeleccionada(d); setModalAbono(true) }}
                        className="text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 px-3 py-1 rounded-full transition-colors">
                        Abonar
                      </button>
                      <button
                        onClick={() => setModalEliminarDeuda(d)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deudas.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-500 py-10">No hay deudas pendientes 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo cliente */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-4">Nuevo cliente</h2>
            <div className="space-y-3">
              <input placeholder="Nombre *" value={formCliente.nombre}
                onChange={e => setFormCliente({...formCliente, nombre: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <input placeholder="Teléfono (opcional)" value={formCliente.telefono}
                onChange={e => setFormCliente({...formCliente, telefono: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <input placeholder="Notas (opcional)" value={formCliente.notas}
                onChange={e => setFormCliente({...formCliente, notas: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalCliente(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardarCliente}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva deuda */}
      {modalDeuda && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-4">Registrar deuda</h2>
            <div className="space-y-3">
              <select value={formDeuda.cliente_id}
                onChange={e => setFormDeuda({...formDeuda, cliente_id: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500">
                <option value="">Seleccionar cliente *</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input placeholder="¿Qué llevó fiado?" value={formDeuda.descripcion}
                onChange={e => setFormDeuda({...formDeuda, descripcion: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <input placeholder="Monto total $" type="number" step="0.01" value={formDeuda.monto_original}
                onChange={e => setFormDeuda({...formDeuda, monto_original: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalDeuda(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardarDeuda}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal abono */}
      {modalAbono && deudaSeleccionada && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-1">Registrar abono</h2>
            <p className="text-gray-400 text-sm mb-4">
              {deudaSeleccionada.clientes?.nombre} · Pendiente:
              <span className="text-red-400 font-bold ml-1">${Number.parseFloat(deudaSeleccionada.monto_pendiente).toFixed(2)}</span>
            </p>
            <div className="space-y-3">
              <input placeholder="Monto del abono $" type="number" step="0.01" value={formAbono.monto}
                onChange={e => setFormAbono({...formAbono, monto: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <div className="grid grid-cols-2 gap-2">
                {['efectivo', 'transferencia'].map(m => (
                  <button key={m} onClick={() => setFormAbono({...formAbono, metodo_pago: m})}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      formAbono.metodo_pago === m ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400'
                    }`}>
                    {getIconoBotonPago(m)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalAbono(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardarAbono}
                className="flex-1 bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-2 rounded-lg text-sm">Abonar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar cliente */}
      {modalEliminarCliente && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-white mb-1">¿Eliminar cliente?</h2>
            <p className="text-gray-400 text-sm mb-1">{modalEliminarCliente.nombre}</p>
            <p className="text-gray-500 text-xs mb-5">Se conservará el historial de deudas</p>
            <div className="flex gap-3">
              <button onClick={() => setModalEliminarCliente(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={eliminarCliente}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded-lg text-sm">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar deuda */}
      {modalEliminarDeuda && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-white mb-1">¿Eliminar deuda?</h2>
            <p className="text-gray-400 text-sm mb-1">{modalEliminarDeuda.clientes?.nombre}</p>
            <p className="text-red-400 font-bold mb-5">${Number.parseFloat(modalEliminarDeuda.monto_pendiente).toFixed(2)}</p>
            <div className="flex gap-3">
              <button onClick={() => setModalEliminarDeuda(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={eliminarDeuda}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded-lg text-sm">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}