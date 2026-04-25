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
  const [balance, setBalance] = useState(null)
  // Captured by FindItem, consumed by Scanning, then cleared.
  const [selectedFile, setSelectedFile] = useState(null)
  // Set after /lens/scan returns; passed to Candidates so it can fetch real results.
  const [searchId, setSearchId] = useState(null)

  // Refresh balance whenever we land back on the home screen — including
  // right after a purchase, so the new (lower) figure shows up.
  useEffect(() => {
    if (screen !== 'home') return
    api.getBalance()
      .then((b) => setBalance(parseFloat(b.value)))
      .catch((e) => console.error('balance fetch failed:', e))
  }, [screen])

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onNavigate={setScreen}
          totalSaved={balance ?? 847}
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
