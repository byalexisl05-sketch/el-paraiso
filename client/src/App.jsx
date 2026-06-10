import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Ventas from './pages/Ventas'
import Gastos from './pages/Gastos'
import Fiados from './pages/Fiados'
import Reportes from './pages/Reportes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ventas"    element={<Ventas />} />
        <Route path="gastos"    element={<Gastos />} />
        <Route path="fiados"    element={<Fiados />} />
        <Route path="reportes"  element={<Reportes />} />
      </Route>
    </Routes>
  )
}