import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Reviews from './pages/Reviews'
import NewReview from './pages/NewReview'
import Compare from './pages/Compare'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/reviews" replace />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/new" element={<NewReview />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="*" element={<Navigate to="/reviews" replace />} />
        </Routes>
      </main>
    </div>
  )
}
