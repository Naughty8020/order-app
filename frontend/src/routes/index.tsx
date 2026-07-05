import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import {
  Music,
  Beer,
  Flame,
  GlassWater,
  Coffee,
  Utensils,
  Plus,
  Minus,
  ShoppingBag,
  Trash2,
  Check,
  RotateCw,
  Settings,
  User,
  PlusCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Disc,
  Clock,
  Sparkles,
  Volume2,
  X,
  Ticket,
  Tv,
  BellRing,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

// Interfaces
interface Menu {
  id: number
  name: string
  price: number
  is_available: boolean
}

interface OrderItem {
  id: number
  order_id: number
  menu_id: number
  menu: Menu
  quantity: number
  price: number
}

interface Order {
  id: number
  status: string
  created_at: string
  order_items: OrderItem[]
}

interface CartItem {
  menu: Menu
  quantity: number
}

// Dummy Now Playing Tracks for Music Bar vibe
const TRACKS = [
  { title: "Midnight Horizon", artist: "DJ Neon Shimmer", genre: "Deep House", bpm: 124 },
  { title: "Lost in Echoes", artist: "Lofi Dreamer", genre: "Chillhop", bpm: 82 },
  { title: "Liquid Sunshine", artist: "Groove Syndicate", genre: "Nu-Jazz", bpm: 115 },
  { title: "Neon Reflections", artist: "Synthwave Rider", genre: "Retrowave", bpm: 110 },
]

function App() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<{ [id: number]: CartItem }>({})
  const [mode, setMode] = useState<'customer' | 'staff' | 'monitor'>('customer')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Staff Mode States
  const [newMenuName, setNewMenuName] = useState('')
  const [newMenuPrice, setNewMenuPrice] = useState('')
  const [submittingMenu, setSubmittingMenu] = useState(false)

  // Music Simulator
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  // Order Success Modal State
  const [successModal, setSuccessModal] = useState<{ show: boolean; orderId: number | null }>({
    show: false,
    orderId: null
  })

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Track newly called ready orders to trigger a visual or sound alert
  const prevReadyIdsRef = useRef<number[]>([])

  // Dynamic API Base Resolver
  const getApiBase = () => {
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}:8080/api`
    }
    return 'http://localhost:8080/api'
  }
  const API_BASE = getApiBase()

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch Data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const menuRes = await fetch(`${API_BASE}/menus`)
      if (!menuRes.ok) throw new Error('メニューの取得に失敗しました')
      const menuData = await menuRes.json()
      setMenus(menuData.data || [])

      const orderRes = await fetch(`${API_BASE}/orders`)
      if (!orderRes.ok) throw new Error('注文履歴の取得に失敗しました')
      const orderData = await orderRes.json()
      
      const newOrders = orderData.orders || []
      setOrders(newOrders)

      // Monitor logic: Detect if new orders became "ready" to flash
      const currentReadyIds = newOrders.filter((o: Order) => o.status === 'ready').map((o: Order) => o.id)
      const newlyAdded = currentReadyIds.filter(id => !prevReadyIdsRef.current.includes(id))
      if (newlyAdded.length > 0 && mode === 'monitor') {
        // Sound simulator or notification flash
        showToast(`オーダー番号 #${newlyAdded.join(', #')} ができあがりました！`, 'info')
      }
      prevReadyIdsRef.current = currentReadyIds

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'サーバーとの通信中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Poll orders every 4 seconds for immediate monitor updates
    const interval = setInterval(async () => {
      try {
        const orderRes = await fetch(`${API_BASE}/orders`)
        if (orderRes.ok) {
          const orderData = await orderRes.json()
          const newOrders = orderData.orders || []
          setOrders(newOrders)
          
          const currentReadyIds = newOrders.filter((o: Order) => o.status === 'ready').map((o: Order) => o.id)
          const newlyAdded = currentReadyIds.filter(id => !prevReadyIdsRef.current.includes(id))
          if (newlyAdded.length > 0) {
            // Synthesize sound cue if supported
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(`オーダー番号、${newlyAdded.join('番、')}、できあがりました。`)
              utterance.lang = 'ja-JP'
              window.speechSynthesis.speak(utterance)
            }
          }
          prevReadyIdsRef.current = currentReadyIds
        }
      } catch (e) {
        // Silently fail polling
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [mode])

  // Rotate tracks automatically
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setTrackIndex((prev) => (prev + 1) % TRACKS.length)
    }, 20000)
    return () => clearInterval(timer)
  }, [isPlaying])

  // Category classifier
  const getCategory = (menuName: string): string => {
    const name = menuName.toLowerCase()
    if (name.includes('ビール') || name.includes('beer') || name.includes('ipa') || name.includes('ドラフト')) return 'beer'
    if (name.includes('ジントニック') || name.includes('モヒート') || name.includes('マティーニ') || name.includes('カクテル') || name.includes('サングリア') || name.includes('tonic') || name.includes('mojito') || name.includes('martini')) return 'cocktail'
    if (name.includes('ノンアル') || name.includes('コーラ') || name.includes('ジュース') || name.includes('non-alc') || name.includes('cola') || name.includes('soda') || name.includes('ブリーズ')) return 'non-alc'
    if (name.includes('ウイスキー') || name.includes('whisky') || name.includes('yamazaki') || name.includes('シングルモルト') || name.includes('ハイボール')) return 'whisky'
    if (name.includes('ナッツ') || name.includes('ポテト') || name.includes('チーズ') || name.includes('おつまみ') || name.includes('フード') || name.includes('platter') || name.includes('fries') || name.includes('nuts')) return 'food'
    return 'other'
  }

  // Add to Cart
  const addToCart = (menu: Menu) => {
    if (!menu.is_available) {
      showToast('このメニューは現在売り切れです', 'error')
      return
    }
    setCart((prev) => {
      const current = prev[menu.id]
      return {
        ...prev,
        [menu.id]: {
          menu,
          quantity: current ? current.quantity + 1 : 1,
        },
      }
    })
    showToast(`${menu.name} をカートに追加しました`)
  }

  // Update Cart Quantity
  const updateCartQty = (menuId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[menuId]
      if (!current) return prev
      const newQty = current.quantity + delta
      if (newQty <= 0) {
        const copy = { ...prev }
        delete copy[menuId]
        return copy
      }
      return {
        ...prev,
        [menuId]: {
          ...current,
          quantity: newQty,
        },
      }
    })
  }

  // Remove from Cart
  const removeFromCart = (menuId: number) => {
    setCart((prev) => {
      const copy = { ...prev }
      delete copy[menuId]
      return copy
    })
  }

  // Submit Order
  const submitOrder = async () => {
    const items = Object.values(cart)
    if (items.length === 0) return

    setLoading(true)
    try {
      const payload = {
        items: items.map((item) => ({
          menu_id: item.menu.id,
          quantity: item.quantity,
        }))
      }

      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData.order && resData.order.id) {
          setSuccessModal({ show: true, orderId: resData.order.id })
        } else {
          showToast('注文は完了しましたが、オーダー番号を取得できませんでした。', 'info')
        }
        setCart({})
        // Reload orders
        const orderRes = await fetch(`${API_BASE}/orders`)
        const orderData = await orderRes.json()
        setOrders(orderData.orders || [])
      } else {
        const errorData = await response.json()
        showToast(errorData.error || '注文の送信に失敗しました', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('通信エラーが発生しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Staff: Update Order Status
  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('ステータス更新に失敗しました')
      
      let msg = ''
      if (status === 'ready') msg = `オーダー番号 #${orderId} を「お呼び出し中」にしました`
      if (status === 'completed') msg = `オーダー番号 #${orderId} を「提供完了」にしました`
      showToast(msg)

      // Refresh orders
      const orderRes = await fetch(`${API_BASE}/orders`)
      const orderData = await orderRes.json()
      setOrders(orderData.orders || [])
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Staff: Add Menu
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMenuName || !newMenuPrice) return
    setSubmittingMenu(true)
    try {
      const price = parseInt(newMenuPrice, 10)
      if (isNaN(price) || price <= 0) throw new Error('価格は正の数値で入力してください')

      const res = await fetch(`${API_BASE}/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMenuName,
          price,
          is_available: true,
        }),
      })

      if (!res.ok) throw new Error('メニューの作成に失敗しました')
      
      showToast(`${newMenuName} を追加しました`)
      setNewMenuName('')
      setNewMenuPrice('')
      
      // Refresh menus
      const menuRes = await fetch(`${API_BASE}/menus`)
      const menuData = await menuRes.json()
      setMenus(menuData.data || [])
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingMenu(false)
    }
  }

  // Staff: Toggle Availability
  const handleToggleAvailable = async (menu: Menu) => {
    try {
      const res = await fetch(`${API_BASE}/menus/${menu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_available: !menu.is_available,
        }),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
      showToast(`${menu.name} を ${!menu.is_available ? '販売中' : '売り切れ'} に変更しました`)
      
      // Refresh menus
      const menuRes = await fetch(`${API_BASE}/menus`)
      const menuData = await menuRes.json()
      setMenus(menuData.data || [])
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Staff: Delete Menu
  const handleDeleteMenu = async (menuId: number) => {
    if (!window.confirm('このメニューを削除してよろしいですか？')) return
    try {
      const res = await fetch(`${API_BASE}/menus/${menuId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('削除に失敗しました')
      showToast('メニューを削除しました', 'info')
      
      // Refresh menus
      const menuRes = await fetch(`${API_BASE}/menus`)
      const menuData = await menuRes.json()
      setMenus(menuData.data || [])
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Helpers
  const cartTotal = Object.values(cart).reduce((sum, item) => sum + item.menu.price * item.quantity, 0)
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)

  const getOrderTotal = (order: Order) => {
    return order.order_items ? order.order_items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0
  }
  const getOrderItemsCount = (order: Order) => {
    return order.order_items ? order.order_items.reduce((sum, item) => sum + item.quantity, 0) : 0
  }

  const categories = [
    { id: 'all', label: 'All Beats', icon: Music },
    { id: 'cocktail', label: 'カクテル', icon: Flame },
    { id: 'beer', label: 'ビール', icon: Beer },
    { id: 'whisky', label: 'ウイスキー', icon: GlassWater },
    { id: 'non-alc', label: 'ノンアルコール', icon: Coffee },
    { id: 'food', label: 'おつまみ', icon: Utensils },
  ]

  const activeTrack = TRACKS[trackIndex]

  // Filter orders for Monitor Screen
  const preparingOrders = orders.filter(o => o.status === 'pending')
  const readyOrders = orders.filter(o => o.status === 'ready')

  return (
    <div className="min-h-screen bg-[#070b0e] text-[#e2e8f0] pb-16 selection:bg-pink-500/30">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`px-6 py-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border text-sm font-semibold flex items-center gap-2 backdrop-blur-md transition-all
            ${toast.type === 'success' ? 'bg-emerald-955/90 border-emerald-500 text-emerald-300' : ''}
            ${toast.type === 'error' ? 'bg-rose-955/90 border-rose-500 text-rose-300' : ''}
            ${toast.type === 'info' ? 'bg-sky-955/90 border-sky-500 text-sky-300 animate-pulse' : ''}
          `}>
            {toast.type === 'success' && <Check size={16} className="text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle size={16} className="text-rose-400" />}
            {toast.type === 'info' && <BellRing size={16} className="text-sky-400 animate-bounce" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Order Success Modal (McDonald's single order number display) */}
      {successModal.show && successModal.orderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(236,72,153,0.15)]">
            <button
              onClick={() => setSuccessModal({ show: false, orderId: null })}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="h-16 w-16 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-400">
              <Ticket size={32} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white">ご注文ありがとうございます！</h2>
            <p className="text-sm text-slate-400 mt-2">
              ドリンクの準備を進めております。ご提供の際、以下のオーダー番号が必要となります。
            </p>

            <div className="my-6 bg-slate-950/80 border border-slate-850 p-6 rounded-2xl">
              <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">あなたのオーダー番号</p>
              <div className="flex justify-center">
                <span className="text-5xl font-black text-white tracking-wider bg-slate-900 border border-pink-500/40 px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.15)]">
                  #{successModal.orderId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                ※バーカウンター上のモニター画面で、あなたの番号が **「お呼び出し中 (Ready)」** になりましたら、カウンターへお越しください。
              </p>
            </div>

            <button
              onClick={() => setSuccessModal({ show: false, orderId: null })}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              確認して閉じる
            </button>
          </div>
        </div>
      )}

      {/* Main Bar Billboard Header */}
      <header className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-955 via-slate-950 to-[#070b0e] border-b border-slate-800/80 px-6 py-8 md:py-10">
        {/* Glow ambient spots */}
        <div className="absolute -left-10 -top-24 h-64 w-64 rounded-full bg-pink-500/10 blur-[80px]" />
        <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping" />
              <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-pink-400 bg-pink-950/40 border border-pink-500/20 px-2 py-0.5 rounded-full">
                Music Lounge
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white display-title">
              Beat <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">&amp;</span> Bubble
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              スマホで簡単オーダー。お好みのサウンドと美味しいドリンクを。
            </p>
          </div>

          {/* NOW PLAYING widget */}
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 flex items-center gap-4 w-full md:w-80 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
            <div className="relative flex-shrink-0">
              <Disc
                size={48}
                className={`text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] ${isPlaying ? 'animate-spin' : ''}`}
                style={{ animationDuration: '4s' }}
              />
              <span className="absolute inset-0 m-auto h-3 w-3 bg-[#070b0e] rounded-full border border-slate-700" />
            </div>
            <div className="overflow-hidden flex-grow select-none">
              <div className="flex items-center gap-1.5 text-xs text-pink-400 font-bold tracking-widest uppercase mb-0.5">
                <Music size={12} />
                <span>Now Playing</span>
                <span className="ml-auto inline-flex gap-0.5">
                  <span className="w-0.5 h-3 bg-pink-400 rounded-full animate-pulse" />
                  <span className="w-0.5 h-3.5 bg-pink-400 rounded-full animate-pulse" />
                  <span className="w-0.5 h-2.5 bg-pink-400 rounded-full animate-pulse" />
                </span>
              </div>
              <p className="text-sm font-extrabold text-white truncate">{activeTrack.title}</p>
              <p className="text-xs text-slate-400 truncate">{activeTrack.artist} ({activeTrack.bpm} BPM)</p>
            </div>
          </div>
        </div>

        {/* Global mode selector */}
        <div className="max-w-6xl mx-auto mt-6 flex justify-end">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 shadow-2xl">
            <button
              onClick={() => setMode('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${mode === 'customer' ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <User size={13} />
              顧客メニュー
            </button>
            <button
              onClick={() => setMode('staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${mode === 'staff' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings size={13} />
              スタッフ画面
            </button>
            <button
              onClick={() => setMode('monitor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${mode === 'monitor' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Tv size={13} />
              サイネージモニター
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        {error && (
          <div className="bg-rose-955/30 border border-rose-800/80 rounded-2xl p-4 text-rose-300 flex items-center gap-3 mb-8">
            <AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">システムエラー</p>
              <p className="text-xs text-rose-400/90">{error}</p>
            </div>
            <button
              onClick={fetchData}
              className="ml-auto bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCw size={12} />
              再試行
            </button>
          </div>
        )}

        {/* 1. CUSTOMER MODE */}
        {mode === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Menu List Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Category selector */}
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold snap-start transition border whitespace-nowrap cursor-pointer
                        ${isActive
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-400/50 shadow-lg shadow-pink-500/10'
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }
                      `}
                    >
                      <Icon size={14} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              {/* Menu Grid */}
              {loading && menus.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="bg-slate-900/30 border border-slate-800/50 h-32 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menus
                    .filter((menu) => activeCategory === 'all' || getCategory(menu.name) === activeCategory)
                    .map((menu) => {
                      const inCart = cart[menu.id]
                      return (
                        <div
                          key={menu.id}
                          className={`relative overflow-hidden bg-slate-900/40 border rounded-3xl p-5 flex flex-col justify-between transition-all group backdrop-blur-sm
                            ${menu.is_available
                              ? 'border-slate-800 hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.06)]'
                              : 'border-slate-900 opacity-60'
                            }
                          `}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-pink-500/2 group-hover:to-indigo-500/3 transition-all duration-500 pointer-events-none" />

                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h3 className="font-extrabold text-white text-base group-hover:text-pink-300 transition-colors">
                                {menu.name}
                              </h3>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 capitalize">
                                {getCategory(menu.name)}
                              </span>
                            </div>
                            <p className="text-xl font-black text-pink-400 group-hover:scale-105 origin-left transition-transform">
                              ¥{menu.price.toLocaleString()}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            {!menu.is_available ? (
                              <span className="text-xs font-extrabold text-rose-400 bg-rose-950/40 border border-rose-900/60 px-3 py-1 rounded-xl">
                                SOLD OUT
                              </span>
                            ) : inCart ? (
                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 w-full justify-between">
                                <button
                                  onClick={() => updateCartQty(menu.id, -1)}
                                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="px-3 text-sm font-bold text-white min-w-[20px] text-center">
                                  {inCart.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQty(menu.id, 1)}
                                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(menu)}
                                className="w-full bg-slate-800 hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 hover:text-white text-slate-300 text-xs font-bold py-2.5 rounded-xl transition border border-slate-700 hover:border-transparent flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Plus size={13} />
                                カートに追加
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Cart Tray Sidebar */}
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.2)] sticky top-6">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <ShoppingBag size={18} className="text-pink-400" />
                    注文トレイ ({cartCount})
                  </h2>
                  {cartCount > 0 && (
                    <button
                      onClick={() => setCart({})}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                      空にする
                    </button>
                  )}
                </div>

                {cartCount === 0 ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 mb-3 animate-pulse">
                      <Disc size={28} className="text-slate-700 animate-spin" style={{ animationDuration: '8s' }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">トレイは空です</p>
                    <p className="text-xs text-slate-600 max-w-[200px] mt-1">
                      レコードメニューからドリンクを選んでカートに入れてください。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cart Items */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {Object.values(cart).map((item) => (
                        <div
                          key={item.menu.id}
                          className="bg-slate-950/60 border border-slate-900 rounded-2xl p-3 flex justify-between items-center"
                        >
                          <div className="max-w-[150px]">
                            <p className="text-xs font-bold text-white truncate">{item.menu.name}</p>
                            <p className="text-xs text-slate-500">¥{item.menu.price.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 scale-90">
                              <button
                                onClick={() => updateCartQty(item.menu.id, -1)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-2 text-xs font-bold text-white min-w-[16px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQty(item.menu.id, 1)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.menu.id)}
                              className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cost details */}
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>アイテム数</span>
                        <span>{cartCount}点</span>
                      </div>
                      <div className="flex justify-between text-base font-black text-white">
                        <span>合計金額</span>
                        <span className="text-pink-400">¥{cartTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Order Button */}
                    <button
                      onClick={submitOrder}
                      disabled={loading}
                      className="w-full mt-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-pink-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RotateCw size={16} className="animate-spin" />
                          注文送信中...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          注文を確定する (¥{cartTotal.toLocaleString()})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER ORDER TRACKING TIMELINE */}
        {mode === 'customer' && (
          <section className="mt-12 bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Clock size={16} className="text-pink-400" />
                  Live 注文ステータス
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  バーカウンター上のモニターでお客様の番号が **「お呼び出し中 (Ready)」** になりましたら、お受け取りいただけます。
                </p>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:underline transition border border-slate-800/80 hover:border-slate-700 bg-slate-950 px-2.5 py-1.5 rounded-xl cursor-pointer"
              >
                <RotateCw size={11} />
                更新する
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                注文した履歴はありません。
              </div>
            ) : (
              /* Grid Layout for Order Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {orders
                  .filter(o => o.status !== 'completed') // Customer tracks pending and ready only
                  .slice()
                  .reverse()
                  .map((order) => {
                    const total = getOrderTotal(order)
                    const count = getOrderItemsCount(order)
                    return (
                      <div
                        key={order.id}
                        className={`relative overflow-hidden bg-slate-955/60 border rounded-3xl p-5 flex flex-col justify-between transition-all backdrop-blur-sm
                          ${order.status === 'ready'
                            ? 'border-pink-500/50 shadow-[0_0_25px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/20'
                            : 'border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.3)] shadow-pink-500/5'
                          }
                        `}
                      >
                        {/* Header block with prominent Order Number */}
                        <div className="flex justify-between items-center border-b border-slate-905 pb-3 mb-3">
                          <span className={`text-lg font-black tracking-wider px-3.5 py-1 rounded-xl shadow-sm
                            ${order.status === 'ready'
                              ? 'text-white bg-pink-500/20 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                              : 'text-pink-400 bg-pink-950/20 border border-pink-500/20'
                            }
                          `}>
                            # {order.id}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock size={11} />
                            <span>{new Date(order.created_at || Date.now()).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="flex-grow py-2 space-y-2">
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {order.order_items && order.order_items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-xs">
                                <span className="text-white font-extrabold truncate max-w-[130px]">{item.menu.name}</span>
                                <span className="text-slate-400 bg-slate-900/60 border border-slate-850 px-1.5 py-0.5 rounded text-[10px]">
                                  x {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer block */}
                        <div className="mt-4 pt-3 border-t border-slate-900/80 flex flex-col gap-3">
                          <div className="flex justify-between text-xs font-bold text-slate-400">
                            <span>{count}点の商品</span>
                            <span className="text-white">¥{total.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {order.status === 'ready'
                                ? 'カウンターでお受け取りください！'
                                : 'バーテンダーが準備中です...'}
                            </p>
                            <div>
                              {order.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-955/50 border border-amber-600/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.05)] animate-pulse">
                                  準備中
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-pink-500/20 border border-pink-500/50 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-bounce">
                                  <BellRing size={10} className="animate-spin" />
                                  お呼び出し中
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>
        )}

        {/* 2. STAFF MODE */}
        {mode === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Orders Monitor */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Volume2 size={18} className="text-emerald-400" />
                      受注・進行モニター
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">「準備完了(呼び出し)」 ➡️ 「お渡し完了」の2ステップで処理します</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold bg-amber-955 text-amber-400 border border-amber-800 px-3 py-1 rounded-full">
                      準備中: {orders.filter((o) => o.status === 'pending').length}件
                    </span>
                    <span className="text-xs font-bold bg-pink-950 text-pink-400 border border-pink-800 px-3 py-1 rounded-full">
                      呼び出し中: {orders.filter((o) => o.status === 'ready').length}件
                    </span>
                  </div>
                </div>

                {/* Grid Layout for Staff monitoring */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.filter((o) => o.status === 'pending' || o.status === 'ready').length === 0 ? (
                    <div className="md:col-span-2 py-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-slate-900">
                      <Check size={32} className="text-emerald-500/40 mb-2" />
                      <p className="font-bold text-slate-400">現在、処理待ちの注文はありません</p>
                      <p className="text-xs text-slate-600 mt-0.5">デジタルモニターには何も表示されていません。</p>
                    </div>
                  ) : (
                    orders
                      .filter((o) => o.status === 'pending' || o.status === 'ready')
                      .map((order) => {
                        const total = getOrderTotal(order)
                        const isReady = order.status === 'ready'
                        return (
                          <div
                            key={order.id}
                            className={`bg-slate-955/80 border rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition relative overflow-hidden
                              ${isReady ? 'border-pink-500/30' : 'border-slate-800'}
                            `}
                          >
                            {isReady ? (
                              <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 blur-[25px] pointer-events-none" />
                            ) : (
                              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-[25px] pointer-events-none" />
                            )}
                            
                            <div>
                              <div className="flex justify-between items-start mb-3 border-b border-slate-900 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-3xl font-black tracking-wider ${isReady ? 'text-pink-400' : 'text-amber-400'}`}>
                                    #{order.id}
                                  </span>
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border
                                    ${isReady 
                                      ? 'bg-pink-950/40 border-pink-500/30 text-pink-400' 
                                      : 'bg-amber-955/40 border-amber-550/20 text-amber-400'
                                    }
                                  `}>
                                    {isReady ? '呼び出し中' : '準備中'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 mt-2.5">
                                  {new Date(order.created_at || Date.now()).toLocaleTimeString()}
                                </span>
                              </div>
                              
                              {/* List of items inside order for Staff */}
                              <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto pr-1">
                                {order.order_items && order.order_items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/60 flex justify-between items-center text-xs"
                                  >
                                    <span className="text-white font-extrabold truncate max-w-[140px]">{item.menu.name}</span>
                                    <span className="text-slate-300 font-extrabold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-[11px]">
                                      x {item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 flex justify-between text-xs text-slate-400 mb-4">
                                <span>合計金額</span>
                                <span className="text-white font-black">¥{total.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Two-step serve button layout */}
                            <div className="mt-auto pt-2">
                              {!isReady ? (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'ready')}
                                  className="w-full bg-gradient-to-r from-amber-550 to-pink-500 hover:from-amber-500 hover:to-pink-400 text-white font-extrabold text-xs py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <BellRing size={14} className="animate-bounce" />
                                  準備完了 ➡️ 呼び出し(Ready)
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'completed')}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle2 size={14} />
                                  お渡し完了 (Served)
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>

              {/* Completed Orders History (Staff perspective) */}
              <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl p-6">
                <h2 className="text-sm font-black text-slate-400 mb-4">最近の提供完了履歴</h2>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {orders.filter((o) => o.status === 'completed').length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-4">履歴はありません</p>
                  ) : (
                    orders
                      .filter((o) => o.status === 'completed')
                      .slice()
                      .reverse()
                      .map((order) => {
                        const total = getOrderTotal(order)
                        const count = getOrderItemsCount(order)
                        return (
                          <div
                            key={order.id}
                            className="bg-slate-950/30 border border-slate-900 rounded-xl p-3 flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="text-emerald-555 font-bold mr-2">#{order.id}</span>
                              <span className="text-slate-400 font-medium">
                                {order.order_items && order.order_items.map(item => `${item.menu.name} x${item.quantity}`).join(', ')}
                              </span>
                              <span className="text-slate-500 ml-2">({count}点 / ¥{total.toLocaleString()})</span>
                            </div>
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <Check size={11} className="text-emerald-500" />
                              {new Date(order.created_at || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Menu Editor Sidebar */}
            <div className="space-y-6">
              {/* Add New Menu item */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-base font-black text-white flex items-center gap-2 mb-4">
                  <PlusCircle size={16} className="text-emerald-400" />
                  メニューの追加
                </h2>
                <form onSubmit={handleAddMenu} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">メニュー名</label>
                    <input
                      type="text"
                      placeholder="例: 特製ジントニック"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">価格 (¥)</label>
                    <input
                      type="number"
                      placeholder="800"
                      value={newMenuPrice}
                      onChange={(e) => setNewMenuPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingMenu}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
                  >
                    {submittingMenu ? '追加中...' : 'メニューリストに登録'}
                  </button>
                </form>
              </div>

              {/* Menu List & Toggles */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-base font-black text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                  メニュー在庫コントロール
                </h2>
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {menus.map((menu) => (
                    <div
                      key={menu.id}
                      className="bg-slate-950/50 border border-slate-900 rounded-2xl p-3 flex justify-between items-center"
                    >
                      <div className="max-w-[140px] overflow-hidden">
                        <p className="text-xs font-extrabold text-white truncate">{menu.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">¥{menu.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAvailable(menu)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${menu.is_available ? 'text-emerald-400 hover:bg-emerald-950/20' : 'text-rose-500 hover:bg-rose-950/20'}`}
                          title={menu.is_available ? '販売を一時停止する' : '販売を再開する'}
                        >
                          {menu.is_available ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(menu.id)}
                          className="p-1 hover:bg-slate-955 text-slate-600 hover:text-rose-400 rounded-lg transition cursor-pointer"
                          title="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MONITOR SCREEN (DIGITAL SIGNAGE) */}
        {mode === 'monitor' && (
          <div className="bg-[#030608] border border-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden min-h-[70vh]">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-900 pb-6 mb-8 gap-4">
              <div>
                <span className="text-[10px] tracking-[0.3em] font-black uppercase text-pink-400 bg-pink-955/50 border border-pink-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                  Now Boarding Drinks
                </span>
                <h2 className="text-3xl font-black text-white mt-2 tracking-tight display-title">
                  Order Status Board
                </h2>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Music size={18} className="text-pink-400 animate-pulse" />
                <div className="text-left">
                  <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Soundtrack</p>
                  <p className="text-xs font-extrabold text-white truncate max-w-[150px]">{activeTrack.title}</p>
                </div>
              </div>
            </div>

            {/* Split layout: Preparing vs Ready */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative min-h-[450px]">
              
              {/* Vertical divider line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-900" />

              {/* Column A: Preparing (準備中) */}
              <div className="space-y-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 border-b border-slate-900/60 pb-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="text-lg font-black tracking-wider text-amber-400 uppercase">
                    Preparing / 準備中
                  </h3>
                </div>

                {preparingOrders.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-600 text-sm italic font-medium">
                    準備中のオーダーはありません
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center md:justify-items-start">
                    {preparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="w-20 h-20 bg-slate-950 border border-amber-600/10 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-pulse"
                      >
                        #{order.id}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column B: Ready to pick up (お呼び出し中) */}
              <div className="space-y-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 border-b border-slate-900/60 pb-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-pink-500 animate-ping" />
                  <h3 className="text-lg font-black tracking-wider text-pink-400 uppercase flex items-center gap-1.5">
                    Ready to Pick Up / お呼び出し
                  </h3>
                </div>

                {readyOrders.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-600 text-sm italic font-medium">
                    お呼び出し中のオーダーはありません
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center md:justify-items-start">
                    {readyOrders.map((order) => (
                      <div
                        key={order.id}
                        className="w-28 h-28 bg-gradient-to-br from-pink-950/20 to-purple-950/20 border border-pink-500 text-4xl font-black text-white rounded-3xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.25)] relative overflow-hidden animate-[pulse_1.5s_infinite]"
                      >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        
                        <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Order</span>
                        <span className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">#{order.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer announcement marquee vibe */}
            <div className="mt-12 bg-slate-950 border border-slate-909 p-4 rounded-2xl flex items-center gap-3">
              <Sparkles size={16} className="text-pink-400 flex-shrink-0" />
              <p className="text-xs text-slate-400 text-left leading-normal font-semibold">
                画面の **「Ready to Pick Up / お呼び出し」** に番号が表示されたお客様は、バーカウンターまでお越しください。その際、スマホ画面のオーダー番号をスタッフにご提示ください。
              </p>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
