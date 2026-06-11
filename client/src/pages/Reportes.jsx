import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reportes() {
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState([])
  const [gastos, setGastos] = useState([])
  const [filtro, setFiltro] = useState('semana')

  useEffect(() => { cargarDatos() }, [filtro])

  async function cargarDatos() {
    setLoading(true)
    const hoy = new Date()
    let desde

    if (filtro === 'hoy') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 5, 0, 0)
    } else if (filtro === 'semana') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6, 5, 0, 0)
    } else {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 5, 0, 0)
    }

    const [{ data: v }, { data: g }] = await Promise.all([
      supabase.from('ventas').select('*').gte('fecha', desde.toISOString()).eq('es_fiado', false).order('fecha'),
      supabase.from('gastos').select('*').gte('fecha', desde.toISOString()).order('fecha')
    ])

    setVentas(v || [])
    setGastos(g || [])
    setLoading(false)
  }

  const totalVentas   = ventas.reduce((s, v) => s + Number.parseFloat(v.monto_total), 0)
  const totalEfectivo = ventas.reduce((s, v) => s + Number.parseFloat(v.monto_efectivo || 0), 0)
  const totalTransfer = ventas.reduce((s, v) => s + Number.parseFloat(v.monto_transferencia || 0), 0)
  const totalGastos   = gastos.reduce((s, g) => s + Number.parseFloat(g.monto), 0)
  const gananciaNet   = totalVentas - totalGastos

  // Agrupar por día para la gráfica
  const porDia = {}
  ventas.forEach(v => {
    const key = new Date(v.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    if (!porDia[key]) porDia[key] = { dia: key, ventas: 0, gastos: 0 }
    porDia[key].ventas += Number.parseFloat(v.monto_total)
  })
  gastos.forEach(g => {
    const key = new Date(g.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    if (!porDia[key]) porDia[key] = { dia: key, ventas: 0, gastos: 0 }
    porDia[key].gastos += Number.parseFloat(g.monto)
  })
  const dataGrafica = Object.values(porDia)

  // Gastos por categoría
  const porCategoria = {}
  gastos.forEach(g => {
    if (!porCategoria[g.categoria]) porCategoria[g.categoria] = 0
    porCategoria[g.categoria] += Number.parseFloat(g.monto)
  })

  const categoriaLabel = {
    compra_productos: '🛒 Compra productos',
    servicios:        '💡 Servicios',
    transporte:       '🚗 Transporte',
    mantenimiento:    '🔧 Mantenimiento',
    otro:             '📦 Otro'
  }

  const filtroLabel = { hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Este mes' }

  // ── Exportar Excel ──────────────────────────────────────
  function exportarExcel() {
    const wb = XLSX.utils.book_new()

    // Hoja resumen
    const resumenData = [
      ['Mini Market El Paraíso — Reporte', filtroLabel[filtro]],
      [],
      ['Resumen'],
      ['Total ventas',   `$${totalVentas.toFixed(2)}`],
      ['Total gastos',   `$${totalGastos.toFixed(2)}`],
      ['Ganancia neta',  `$${gananciaNet.toFixed(2)}`],
      ['Efectivo',       `$${totalEfectivo.toFixed(2)}`],
      ['Transferencia',  `$${totalTransfer.toFixed(2)}`],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // Hoja ventas
    const ventasData = [
      ['Fecha', 'Hora', 'Descripción', 'Método', 'Efectivo', 'Transferencia', 'Total'],
      ...ventas.map(v => [
        new Date(v.fecha).toLocaleDateString('es-EC'),
        new Date(v.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        v.descripcion,
        v.metodo_pago,
        Number.parseFloat(v.monto_efectivo || 0),
        Number.parseFloat(v.monto_transferencia || 0),
        Number.parseFloat(v.monto_total),
      ])
    ]
    const wsVentas = XLSX.utils.aoa_to_sheet(ventasData)
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas')

    // Hoja gastos
    const gastosData = [
      ['Fecha', 'Hora', 'Descripción', 'Categoría', 'Monto'],
      ...gastos.map(g => [
        new Date(g.fecha).toLocaleDateString('es-EC'),
        new Date(g.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        g.descripcion,
        g.categoria,
        Number.parseFloat(g.monto),
      ])
    ]
    const wsGastos = XLSX.utils.aoa_to_sheet(gastosData)
    XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos')

    const fecha = new Date().toLocaleDateString('es-EC').replace(/\//g, '-')
    XLSX.writeFile(wb, `reporte-el-paraiso-${fecha}.xlsx`)
    toast_exportar('Excel descargado ✓')
  }

  // ── Exportar PDF ────────────────────────────────────────
  function exportarPDF() {
    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-EC')

    // Título
    doc.setFontSize(18)
    doc.setTextColor(40, 40, 40)
    doc.text('Mini Market El Paraíso', 14, 18)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Reporte: ${filtroLabel[filtro]} — ${fecha}`, 14, 26)

    // Resumen
    doc.setFontSize(13)
    doc.setTextColor(40)
    doc.text('Resumen', 14, 36)

    autoTable(doc, {
      startY: 40,
      head: [['Concepto', 'Monto']],
      body: [
        ['Total ventas',  `$${totalVentas.toFixed(2)}`],
        ['Total gastos',  `$${totalGastos.toFixed(2)}`],
        ['Ganancia neta', `$${gananciaNet.toFixed(2)}`],
        ['Efectivo',      `$${totalEfectivo.toFixed(2)}`],
        ['Transferencia', `$${totalTransfer.toFixed(2)}`],
      ],
      headStyles: { fillColor: [245, 158, 11] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
    })

    // Ventas
    const y1 = doc.lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.text('Detalle de ventas', 14, y1)

    autoTable(doc, {
      startY: y1 + 4,
      head: [['Fecha', 'Descripción', 'Método', 'Total']],
      body: ventas.map(v => [
        new Date(v.fecha).toLocaleDateString('es-EC') + ' ' +
          new Date(v.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        v.descripcion,
        v.metodo_pago,
        `$${Number.parseFloat(v.monto_total).toFixed(2)}`
      ]),
      headStyles: { fillColor: [245, 158, 11] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
    })

    // Gastos
    const y2 = doc.lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.text('Detalle de gastos', 14, y2)

    autoTable(doc, {
      startY: y2 + 4,
      head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
      body: gastos.map(g => [
        new Date(g.fecha).toLocaleDateString('es-EC') + ' ' +
          new Date(g.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        g.descripcion,
        g.categoria,
        `$${Number.parseFloat(g.monto).toFixed(2)}`
      ]),
      headStyles: { fillColor: [239, 68, 68] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
    })

    const nombreArchivo = `reporte-el-paraiso-${fecha.replace(/\//g, '-')}.pdf`
    doc.save(nombreArchivo)
    toast_exportar('PDF descargado ✓')
  }

  function toast_exportar(msg) {
    const el = document.createElement('div')
    el.textContent = msg
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#f59e0b;color:#000;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;z-index:9999'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2500)
  }

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
          <p className="text-gray-400 text-sm mt-1">{filtroLabel[filtro]}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtros */}
          <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
            {['hoy', 'semana', 'mes'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filtro === f ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'
                }`}>
                {filtroLabel[f]}
              </button>
            ))}
          </div>
          {/* Botones exportar */}
          <button onClick={exportarExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            📊 Excel
          </button>
          <button onClick={exportarPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            📄 PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">Cargando reporte...</div>
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-yellow-500">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total ventas</div>
              <div className="text-2xl font-bold text-yellow-400">${totalVentas.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">{ventas.length} transacciones</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-green-500">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ganancia neta</div>
              <div className={`text-2xl font-bold ${gananciaNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${gananciaNet.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {totalVentas > 0 ? Math.round((gananciaNet / totalVentas) * 100) : 0}% margen
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-red-500">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total gastos</div>
              <div className="text-2xl font-bold text-red-400">${totalGastos.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">{gastos.length} registros</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-blue-500">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Transferencias</div>
              <div className="text-2xl font-bold text-blue-400">${totalTransfer.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">💵 Efectivo: ${totalEfectivo.toFixed(2)}</div>
            </div>
          </div>

          {/* Gráfica */}
          {dataGrafica.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-white mb-4">Ventas vs Gastos</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dataGrafica}>
                  <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    formatter={v => `$${Number.parseFloat(v).toFixed(2)}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                  <Line type="monotone" dataKey="ventas" stroke="#f59e0b" strokeWidth={2} dot={false} name="Ventas" />
                  <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={false} name="Gastos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">

            {/* Detalle ventas */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Detalle de ventas</h2>
              {ventas.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin ventas en este período</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ventas.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1 border-b border-gray-800/50">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="text-sm text-white truncate">{v.descripcion}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(v.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                          {' '}
                          {new Date(v.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-yellow-400">
                          ${Number.parseFloat(v.monto_total).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {v.metodo_pago === 'efectivo' ? '💵' : v.metodo_pago === 'transferencia' ? '📲' : '⚡'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gastos por categoría */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Gastos por categoría</h2>
              {Object.keys(porCategoria).length === 0 ? (
                <p className="text-gray-500 text-sm">Sin gastos en este período</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(porCategoria).map(([cat, monto]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{categoriaLabel[cat] || cat}</span>
                        <span className="text-red-400 font-bold">${monto.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${Math.round((monto / totalGastos) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}