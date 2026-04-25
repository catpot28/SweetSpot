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
  // Real wishlist rows from GET /wishlist; refreshed every time we land on home.
  const [wishlist, setWishlist] = useState([])

  useEffect(() => {
    if (screen !== 'home') return
    api.getWishlist()
      .then(setWishlist)
      .catch((e) => console.error('wishlist fetch failed:', e))
  }, [screen])

  // Until /wishlist supports filtered queries, derive these counts client-side.
  // `bought` has no backend concept yet — leave at 0 until that endpoint lands.
  const homeStats = {
    bought: 0,
    onDiscount: wishlist.filter((i) => i.sweet_spot || i.on_discount).length,
    allTime: wishlist.length,
  }

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onNavigate={setScreen}
          itemCount={wishlist.length}
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
