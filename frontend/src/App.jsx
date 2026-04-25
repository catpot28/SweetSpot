import { useEffect, useState } from 'react'
import HomeScreen from './components/HomeScreen'
import FindItem from './components/FindItem'
import Candidates from './components/Candidates'
import Wishlist from './components/Wishlist'
import ProductDetail from './components/ProductDetail'
import PurchaseSuccess from './components/PurchaseSuccess'
import Scanning from './components/Scanning'
import DeleteConfirm from './components/DeleteConfirm'
import { api } from './lib/api'

function App() {
  const [screen, setScreen] = useState('home')
  // Captured by FindItem, consumed by Scanning, then cleared.
  const [selectedFile, setSelectedFile] = useState(null)
  // Set after /lens/scan returns; passed to Candidates so it can fetch real results.
  const [searchId, setSearchId] = useState(null)
  // Counts shown on home — one fetch per filter endpoint, refreshed on home mount.
  const [counts, setCounts] = useState({ all: 0, discount: 0, bought: 0 })

  useEffect(() => {
    if (screen !== 'home') return
    Promise.all([
      api.getWishlist().catch(() => []),
      api.getWishlistDiscount().catch(() => []),
      api.getWishlistBought().catch(() => []),
    ]).then(([all, discount, bought]) =>
      setCounts({ all: all.length, discount: discount.length, bought: bought.length })
    )
  }, [screen])

  const homeStats = {
    bought: counts.bought,
    onDiscount: counts.discount,
    allTime: counts.all,
  }

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onNavigate={setScreen}
          itemCount={counts.all}
          stats={homeStats}
        />
      )}
      {screen === 'find' && (
        <FindItem
          onNavigate={setScreen}
          onFileCaptured={setSelectedFile}
        />
      )}
      {screen === 'scanning' && (
        <Scanning
          onNavigate={setScreen}
          file={selectedFile}
          onSearchComplete={(id) => {
            setSearchId(id)
            setSelectedFile(null)
          }}
        />
      )}
      {screen === 'candidates' && (
        <Candidates
          onNavigate={setScreen}
          searchId={searchId}
        />
      )}
      {screen === 'wishlist' && <Wishlist onNavigate={setScreen} />}
      {screen === 'wishlist-discount' && <Wishlist onNavigate={setScreen} initialFilter="discount" />}
      {screen === 'wishlist-bought' && <Wishlist onNavigate={setScreen} initialFilter="bought" />}
      {screen === 'detail' && <ProductDetail onNavigate={setScreen} />}
      {screen === 'delete' && <DeleteConfirm onNavigate={setScreen} />}
      {screen === 'success' && <PurchaseSuccess onNavigate={setScreen} />}
    </>
  )
}

export default App
