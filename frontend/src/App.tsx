import { Hero } from './sections/Hero'
import { TheHang } from './sections/TheHang'
import { PoolExhaustion } from './sections/PoolExhaustion'
import { TheDeadline } from './sections/TheDeadline'
import { FallbackTrap } from './sections/FallbackTrap'
import { CancelTrap } from './sections/CancelTrap'
import { LivePanel } from './sections/LivePanel'
import { Closing } from './sections/Closing'

export default function App() {
  return (
    <main className="min-h-dvh">
      <Hero />
      <TheHang />
      <PoolExhaustion />
      <TheDeadline />
      <FallbackTrap />
      <CancelTrap />
      <LivePanel />
      <Closing />
    </main>
  )
}
