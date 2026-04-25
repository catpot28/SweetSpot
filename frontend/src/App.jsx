import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import FindItem from './components/FindItem'
import Candidates from './components/Candidates'
import Wishlist from './components/Wishlist'
import ProductDetail from './components/ProductDetail'
import PurchaseSuccess from './components/PurchaseSuccess'
import Scanning from './components/Scanning'

function App() {
  const [screen, setScreen] = useState('home')

  return (
    <>
      {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
      {screen === 'find' && <FindItem onNavigate={setScreen} />}
      {screen === 'candidates' && <Candidates onNavigate={setScreen} />}
      {screen === 'wishlist' && <Wishlist onNavigate={setScreen} />}
      {screen === 'wishlist-discount' && <Wishlist onNavigate={setScreen} initialFilter="discount" />}
      {screen === 'wishlist-bought' && <Wishlist onNavigate={setScreen} initialFilter="bought" />}
      {screen === 'detail' && <ProductDetail onNavigate={setScreen} />}
      {screen === 'success' && <PurchaseSuccess onNavigate={setScreen} />}
      {screen === 'scanning' && <Scanning onNavigate={setScreen} />}
    </>
  )
}

export default App