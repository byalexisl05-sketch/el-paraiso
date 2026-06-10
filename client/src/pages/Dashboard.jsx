import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function getInicioDia() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 5, 0, 0).toISOString()
}

function getInicioSemana() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6, 5, 0, 0).toISOString()
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [ventasHoy, setVentasHoy] = useState([])
  const [gastosHoy, setGastosHoy] = useState([])
  const [fiadosPendientes, setFiadosPendientes] = useState([])
  const [ventasSemana, setVentasSemana] = useState([])

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setLoading(true)

    const [
      { data: ventas },
      { data: gastos },
      { data: fiados },
      { data: semana }
    ] = await Promise.all([
      supabase.from('ventas').select('*').gte('fecha', getInicioDia()).eq('es_fiado', false),
      supabase.from('gastos').select('*').gte('fecha', getInicioDia()),
      supabase.from('deudas').select('*, clientes(nombre)').eq('pagado', false).order('fecha', { ascending: false }).limit(5),
      supabase.from('ventas').select('*').gte('fecha', getInicioSemana()).eq('es_fiado', false)
    ])

    setVentasHoy(ventas || [])
    setGastosHoy(gastos || [])
    setFiadosPendientes(fiados || [])

    // Agrupar por día para gráfica
    const hoy = new Date()
    const dias = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-EC', { weekday: 'short' })
      dias[key] = { dia: label.charAt(0).toUpperCase() + label.slice(1), total: 0 }
    }
    ;(semana || []).forEach(v => {
      const key = new Date(v.fecha).toISOString().split('T')[0]
      if (dias[key]) dias[key].total += Number.parseFloat(v.monto_total)
    })
    setVentasSemana(Object.values(dias))
    setLoading(false)
  }

  const totalVentas   = ventasHoy.reduce((s, v) => s + Number.parseFloat(v.monto_total), 0)
  const totalEfectivo = ventasHoy.reduce((s, v) => s + Number.parseFloat(v.monto_efectivo || 0), 0)
  const totalTransfer = ventasHoy.reduce((s, v) => s + Number.parseFloat(v.monto_transferencia || 0), 0)
  const totalGastos   = gastosHoy.reduce((s, g) => s + Number.parseFloat(g.monto), 0)
  const gananciaNet   = totalVentas - totalGastos
  const totalFiados   = fiadosPendientes.reduce((s, d) => s + Number.parseFloat(d.monto_pendiente), 0)

  const fechaHoy = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-gray-400">Cargando dashboard...</div>
    </div>
  )

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Buenos días, familia 👋</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{fechaHoy}</p>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 border-t-2 border-t-yellow-500">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Ventas hoy</div>
          <div className="text-3xl font-bold text-yellow-400">${totalVentas.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">{ventasHoy.length} transacciones</div>
          <div className="flex gap-3 mt-3">
            <span className="text-xs text-green-400">💵 ${totalEfectivo.toFixed(2)}</span>
            <span className="text-xs text-blue-400">📲 ${totalTransfer.toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 border-t-2 border-t-green-500">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Ganancia neta hoy</div>
          <div className={`text-3xl font-bold ${gananciaNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${gananciaNet.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2">Ventas − Gastos del día</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 border-t-2 border-t-red-500">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Gastos hoy</div>
          <div className="text-3xl font-bold text-red-400">${totalGastos.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">{gastosHoy.length} registros</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 border-t-2 border-t-violet-500">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Fiados pendientes</div>
          <div className="text-3xl font-bold text-violet-400">${totalFiados.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">{fiadosPendientes.length} deudas activas</div>
        </div>
      </div>

      {/* Gráfica */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Ventas — últimos 7 días</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={ventasSemana} barSize={32}>
            <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#fff' }}
              formatter={v => [`$${Number.parseFloat(v).toFixed(2)}`, 'Ventas']}
            />
            <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimas ventas + fiados */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Últimas ventas de hoy</h2>
          {ventasHoy.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay ventas registradas hoy</p>
          ) : (
            <div className="space-y-3">
              {[...ventasHoy].slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="text-sm text-white truncate">{v.descripcion}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(v.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {v.metodo_pago === 'efectivo' ? '💵' : v.metodo_pago === 'transferencia' ? '📲' : '⚡'}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-yellow-400 whitespace-nowrap">
                    ${Number.parseFloat(v.monto_total).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Fiados pendientes</h2>
          {fiadosPendientes.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay fiados pendientes 🎉</p>
          ) : (
            <div className="space-y-3">
              {fiadosPendientes.map(d => (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center text-xs font-bold">
                      {d.clientes?.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm text-white">{d.clientes?.nombre}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(d.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-400">
                    ${Number.parseFloat(d.monto_pendiente).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}