import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNavigation } from './BottomNavigation'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[#fcfbf8] text-black">
      <Header />
      <main className="pb-24 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}
