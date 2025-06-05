'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks, @next/next/no-img-element */

import React, { useState, createContext, useContext, ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ShoppingCart,
  MessageCircleMore,
  Briefcase,
  PlusCircle,
  ChevronLeft,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  ThumbsUp,
  Menu as MenuIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { StarRating } from '@/components/ui/star-rating'

interface RestaurantSettings {
  name: string
  logoUrl: string | null
  primaryColor?: string
  secondaryColor?: string
}

const FEATURE_FLAGS = {
  tableBooking: true,
  onlinePayment: false,
  aiChat: false,
  advancedReviews: true,
}

const MOCK_MENU_CATEGORIES_BASE = [
  {
    id: 'cat1',
    order: 1,
    name: { en: 'Starters' },
    items: [
      {
        id: 'item1',
        name: { en: 'Spring Rolls' },
        description: { en: 'Crispy fried rolls.' },
        price: 8.99,
        imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Food',
        available: true,
        weekdayVisibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        averageRating: 4.5,
        reviewCount: 10,
      },
    ],
  },
  {
    id: 'cat2',
    order: 2,
    name: { en: 'Mains' },
    items: [
      {
        id: 'item3',
        name: { en: 'Beef Steak' },
        description: { en: 'Served with fries.' },
        price: 22,
        imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Food',
        available: true,
        weekdayVisibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        averageRating: 4.8,
        reviewCount: 20,
      },
    ],
  },
]

const MOCK_TABLES_BASE = [
  { id: 't1', name: 'Table 1', position: 'Window', capacity: 4 },
  { id: 't2', name: 'Table 2', position: 'Center', capacity: 2 },
]

// Cart context
interface MenuItem {
  id: string;
  name: any; // Can be localized object or string
  description: any; // Can be localized object or string
  price: number;
  imageUrl?: string;
  available: boolean;
  weekdayVisibility: string[];
  averageRating?: number;
  reviewCount?: number;
}

interface CartItem {
  itemId: string;
  name: any;
  price: number;
  qty: number;
  imageUrl?: string;
  description?: any;
}
interface CartContextType {
  cart: CartItem[]
  addToCart: (item: any, qty?: number) => void
  updateQuantity: (id: string, qty: number) => void
  totalCartItems: number
  totalCartPrice: number
  clearCart: () => void
}
const CartContext = createContext<CartContextType | undefined>(undefined)
function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const addToCart = (item: any, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.itemId === item.id)
      if (existing) {
        return prev.map(ci =>
          ci.itemId === item.id ? { ...ci, qty: ci.qty + quantity } : ci
        )
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          qty: quantity,
          imageUrl: item.imageUrl,
          description: item.description,
        },
      ]
    })
  }
  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.itemId !== id))
    } else {
      setCart(prev => prev.map(c => (c.itemId === id ? { ...c, qty } : c)))
    }
  }
  const clearCart = () => setCart([])
  const totalCartItems = cart.reduce((sum, i) => sum + i.qty, 0)
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, totalCartItems, totalCartPrice, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}
function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('CartProvider missing')
  return ctx
}

function getCurrentLocale() {
  const params = useParams()
  return (params.locale as string) || 'en'
}
function getLocalizedText(obj: any, locale: string) {
  if (typeof obj === 'string') return obj
  return obj?.[locale] || obj?.en || ''
}

function CustomerHeader({ restaurantSettings, onCartClick, cartItemCount }: { restaurantSettings: RestaurantSettings; onCartClick: () => void; cartItemCount: number }) {
  const t = useTranslations('Common')
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const router = useRouter()
  const handleLocaleChange = (newLocale: string) => {
    router.push(`/${newLocale}/customer`)
  }
  return (
    <header className="sticky top-0 z-30 shadow-lg" style={{ backgroundColor: restaurantSettings.primaryColor }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          {restaurantSettings.logoUrl && (
            <img src={restaurantSettings.logoUrl} alt={`${restaurantSettings.name} logo`} className="h-10 w-10 rounded-full mr-3 object-cover bg-white p-0.5" />
          )}
          <h1 className="text-xl font-bold text-white">{restaurantSettings.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <LanguageSwitcher currentLocale={locale} onLocaleChange={handleLocaleChange} />
          <Button variant="ghost" onClick={onCartClick} className="text-white hover:bg-white/20 relative" aria-label={t('view_cart_label')}>
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartItemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}

function CustomerFooter({ restaurantSettings }: { restaurantSettings: RestaurantSettings }) {
  const t = useTranslations('Common')
  return (
    <footer className="bg-slate-100 dark:bg-slate-800 py-8 text-center">
      <p className="text-slate-600 dark:text-slate-400 text-sm">&copy; {new Date().getFullYear()} {restaurantSettings.name}. {t('all_rights_reserved')}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('powered_by')} Shop-Copilot</p>
    </footer>
  )
}

function CustomerLayout({ children, setView, restaurantSettings }: { children: ReactNode; setView: (v: string, props?: any) => void; restaurantSettings: RestaurantSettings }) {
  const t = useTranslations('Customer')
  const { totalCartItems } = useCart()
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <CustomerHeader restaurantSettings={restaurantSettings} onCartClick={() => setView('checkout')} cartItemCount={totalCartItems} />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">{children}</main>
      <CustomerFooter restaurantSettings={restaurantSettings} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {FEATURE_FLAGS.aiChat && (
          <Button variant="primary" size="sm" className="rounded-full p-3 shadow-xl" aria-label={t('ai_chat.toggle_label')}>
            <MessageCircleMore className="h-5 w-5" />
          </Button>
        )}
        <Button onClick={() => setView('admin')} variant="secondary" size="sm" className="hidden sm:flex">
          <Briefcase className="h-5 w-5 mr-2" />
          {t('admin_panel_button')}
        </Button>
      </div>
    </div>
  )
}

function CustomerMenuScreen({ setView, restaurantSettings, viewProps }: { setView: (v: string, props?: any) => void; restaurantSettings: RestaurantSettings; viewProps?: any }) {
  const t = useTranslations('Customer')
  const { cart, addToCart, updateQuantity, totalCartItems, totalCartPrice } = useCart()
  const [showAddedToCartMsg, setShowAddedToCartMsg] = useState('')
  const [menu] = useState(MOCK_MENU_CATEGORIES_BASE)
  const locale = getCurrentLocale()
  const tableId = viewProps?.tableId
  const sessionStatus = viewProps?.sessionStatus || 'new'

  const handleAddToCart = (item: any, quantity = 1) => {
    addToCart(item, quantity)
    setShowAddedToCartMsg(t('menu.item_added_to_cart_msg', { item: getLocalizedText(item.name, locale) }))
    setTimeout(() => setShowAddedToCartMsg(''), 2000)
  }
  const getQuantityInCart = (itemId: string) => cart.find(ci => ci.itemId === itemId)?.qty || 0
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  if (sessionStatus === 'expired') {
    return <Alert className="max-w-md mx-auto" variant="destructive">{t('session.expired_message')}</Alert>
  }

  return (
    <div>
      {tableId && <p className="text-center text-sm mb-4 text-slate-600 dark:text-slate-400">{t('menu.ordering_for_table', { tableId })}</p>}
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-1 text-slate-800 dark:text-slate-100">{t('menu.title')}</h2>
      <p className="text-center text-sm mb-6 text-slate-500 dark:text-slate-400">{t('menu.serving_today', { day: t(`weekdays.${today.toLowerCase()}`) })}</p>
      {showAddedToCartMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <Alert>{showAddedToCartMsg}</Alert>
        </div>
      )}
      {menu.sort((a, b) => a.order - b.order).map(category => (
        <section key={category.id} className="mb-8" id={`category-${category.id}`}>
          <h3 className="text-xl font-semibold mb-4 pb-2 border-b-2" style={{ borderColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor }}>
            {getLocalizedText(category.name, locale)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.items
              .filter(item => item.available && item.weekdayVisibility.includes(today))
              .map(item => {
                const itemInCartQty = getQuantityInCart(item.id)
                return (
                  <Card key={item.id} className="flex flex-col">
                    <img src={item.imageUrl || 'https://placehold.co/300x200/E2E8F0/334155?text=Food'} alt={getLocalizedText(item.name, locale)} className="w-full h-40 object-cover rounded-t-2xl mb-3" loading="lazy" />
                    <div className="flex-grow">
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{getLocalizedText(item.name, locale)}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 h-10 overflow-hidden">{getLocalizedText(item.description, locale)}</p>
                      <StarRating value={item.averageRating || 0} count={item.reviewCount || 0} size="sm" />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-lg font-bold" style={{ color: restaurantSettings.secondaryColor }}>{t('currency_format', { value: item.price })}</p>
                      {itemInCartQty > 0 ? (
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => updateQuantity(item.id, itemInCartQty - 1)} className="p-2 aspect-square rounded-full" aria-label={t('menu.decrease_quantity')}>-</Button>
                          <span className="font-medium w-5 text-center">{itemInCartQty}</span>
                          <Button size="sm" variant="secondary" onClick={() => updateQuantity(item.id, itemInCartQty + 1)} className="p-2 aspect-square rounded-full" aria-label={t('menu.increase_quantity')}>+</Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => handleAddToCart(item)} style={{ backgroundColor: restaurantSettings.primaryColor }} className="text-white hover:opacity-90">
                          <PlusCircle className="h-4 w-4 mr-1" />
                          {t('menu.add_to_cart')}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
          </div>
        </section>
      ))}
      {totalCartItems > 0 && (
        <div className="sticky bottom-4 z-20 p-1 mt-8">
          <Card className="max-w-md mx-auto shadow-xl backdrop-blur-md bg-opacity-80 dark:bg-opacity-80" style={{ backgroundColor: restaurantSettings.primaryColor }}>
            <div className="flex justify-between items-center text-white">
              <div>
                <p className="font-semibold">{t('cart.items_in_cart_plural', { count: totalCartItems })}</p>
                <p className="text-sm">{t('common.total')}: {t('currency_format', { value: totalCartPrice })}</p>
              </div>
              <Button onClick={() => setView('checkout', { tableId })} className="bg-white hover:bg-slate-100" style={{ color: restaurantSettings.primaryColor }}>
                {t('cart.checkout_button')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      )}
      {FEATURE_FLAGS.tableBooking && (
        <div className="text-center mt-12">
          <Button onClick={() => setView('booking')} size="lg" style={{ backgroundColor: restaurantSettings.secondaryColor }} className="text-white hover:opacity-90">
          <CalendarDays className="h-4 w-4 mr-1" />
            {t('booking.book_table_button')}
          </Button>
        </div>
      )}
    </div>
  )
}

function CheckoutScreen({ setView, restaurantSettings, viewProps }: { setView: (v: string, props?: any) => void; restaurantSettings: RestaurantSettings; viewProps?: any }) {
  const t = useTranslations('Customer')
  const { cart, totalCartPrice, clearCart } = useCart()
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  if (cart.length === 0 && !isConfirmModalOpen) {
    setView('menu', viewProps)
    return <p>{t('checkout.redirecting_empty_cart')}</p>
  }
  const handleConfirmOrder = () => {
    const mockOrderId = `SC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    setIsConfirmModalOpen(false)
    setView('thankyou', { orderId: mockOrderId, items: cart, total: totalCartPrice, tableId: viewProps?.tableId })
    clearCart()
  }
  return (
    <div>
      <Button onClick={() => setView('menu', viewProps)} variant="ghost" className="mb-4 -ml-2">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t('checkout.back_to_menu')}
      </Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">{t('checkout.title')}</h2>
      <Card className="max-w-lg mx-auto">
        <h3 className="text-xl font-semibold mb-4">{t('checkout.order_summary')}</h3>
        {cart.map(item => (
          <div key={item.itemId} className="flex items-center justify-between py-2 border-b last:border-b-0 dark:border-slate-700">
            <div className="flex items-center">
              <img src={item.imageUrl || 'https://placehold.co/60x40/E2E8F0/334155?text=Item'} alt={getLocalizedText(item.name, getCurrentLocale())} className="w-12 h-10 object-cover rounded mr-3" />
              <div>
                <p className="font-medium">{getLocalizedText(item.name, getCurrentLocale())}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.qty} x {t('currency_format', { value: item.price })}</p>
              </div>
            </div>
            <p className="font-semibold">{t('currency_format', { value: item.price * item.qty })}</p>
          </div>
        ))}
        <div className="flex justify-between text-lg font-bold mt-4 pt-2 border-t dark:border-slate-700">
          <span>{t('common.total')}:</span>
          <span>{t('currency_format', { value: totalCartPrice })}</span>
        </div>
        <p className="mt-6 text-sm text-center text-slate-600 dark:text-slate-400">
          {viewProps?.tableId ? t('checkout.payment_instruction_table', { tableId: viewProps.tableId }) : t('checkout.payment_instruction_counter')}
        </p>
        {!FEATURE_FLAGS.onlinePayment && (
          <Button onClick={() => setIsConfirmModalOpen(true)} size="lg" className="w-full mt-6 text-white hover:opacity-90" style={{ backgroundColor: restaurantSettings.primaryColor }} disabled={cart.length === 0}>
            {t('checkout.confirm_cash_order_button')} ({t('currency_format', { value: totalCartPrice })})
          </Button>
        )}
      </Card>
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('checkout.confirm_modal_title')}</DialogTitle>
          </DialogHeader>
          <p className="mb-4">{t('checkout.confirm_modal_text', { total: t('currency_format', { value: totalCartPrice }) })}</p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleConfirmOrder} style={{ backgroundColor: restaurantSettings.primaryColor }}>
              {t('common.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ThankYouScreen({ setView, restaurantSettings, viewProps }: { setView: (v: string, props?: any) => void; restaurantSettings: RestaurantSettings; viewProps: any }) {
  const t = useTranslations('Customer')
  const { orderId, items, total, tableId } = viewProps
  const locale = getCurrentLocale()
  return (
    <div className="text-center py-12">
      <CheckCircle className="mx-auto mb-6 text-green-500 dark:text-green-400" size={64} />
      <h2 className="text-3xl font-bold mb-3">{t('thankyou.title')}</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-2">{t('thankyou.subtitle')}</p>
      <p className="text-lg font-semibold mb-6" style={{ color: restaurantSettings.primaryColor }}>
        {t('thankyou.order_id_label')}: {orderId}
      </p>
      <Card className="max-w-md mx-auto mb-8 text-left">
        <h3 className="text-lg font-semibold mb-3">{t('thankyou.order_summary_title')}</h3>
        {items.map((item: CartItem) => (
          <div key={item.itemId} className="flex justify-between text-sm py-1">
            <span>
              {item.qty}x {getLocalizedText(item.name, locale)}
            </span>
            <span>{t('currency_format', { value: item.price * item.qty })}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t dark:border-slate-700">
          <span>{t('common.total')}:</span>
          <span>{t('currency_format', { value: total })}</span>
        </div>
        {tableId && <p className="text-sm mt-2">{t('thankyou.table_number_label')}: {tableId}</p>}
      </Card>
      {FEATURE_FLAGS.advancedReviews && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">{t('thankyou.rate_dishes_title')}</h3>
          <div className="space-y-3 max-w-md mx-auto">
            {items.slice(0, 3).map((item: CartItem) => (
              <Button key={item.itemId} variant="secondary" className="w-full justify-between" onClick={() => setView('review', { menuItemId: item.itemId, menuItemName: getLocalizedText(item.name, locale) })}>
                {t('thankyou.rate_this_dish_button', { dish: getLocalizedText(item.name, locale) })}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}
      <Button onClick={() => setView('menu')} size="lg" className="mt-10 text-white hover:opacity-90" style={{ backgroundColor: restaurantSettings.primaryColor }}>
        <MenuIcon className="h-4 w-4 mr-1" />
        {t('thankyou.back_to_menu_button')}
      </Button>
    </div>
  )
}

function ReviewScreen({ setView, restaurantSettings, viewProps }: { setView: (v: string, props?: any) => void; restaurantSettings: RestaurantSettings; viewProps: any }) {
  const t = useTranslations('Customer')
  const { menuItemId, menuItemName } = viewProps
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  if (!FEATURE_FLAGS.advancedReviews) return <p>Coming Soon</p>
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      alert(t('review.rating_required_alert'))
      return
    }
    console.log('Submitting review:', { menuItemId, rating, comment })
    setSubmitted(true)
  }
  if (submitted) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="mx-auto mb-6 text-green-500 dark:text-green-400" size={64} />
        <h2 className="text-3xl font-bold mb-3">{t('review.submission_thank_you_title')}</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{t('review.submission_thank_you_message')}</p>
        <Button onClick={() => setView('menu')} size="lg" style={{ backgroundColor: restaurantSettings.primaryColor }} className="text-white">
          {t('thankyou.back_to_menu_button')}
        </Button>
      </div>
    )
  }
  return (
    <div>
      <Button onClick={() => setView('menu')} variant="ghost" className="mb-4 -ml-2">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t('checkout.back_to_menu')}
      </Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{t('review.title')}</h2>
      <p className="text-center text-lg mb-6 text-slate-600 dark:text-slate-400">{menuItemName}</p>
      <Card className="max-w-md mx-auto">
        <form onSubmit={handleSubmitReview}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-center mb-2">{t('review.rating_label')}</label>
            <div className="flex justify-center">
              <StarRating value={rating} size="lg" count={rating}  onRate={setRating} />
            </div>
          </div>
          <Textarea name="comment" value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('review.comment_placeholder')} />
          <Button type="submit" size="lg" className="w-full mt-6 text-white" style={{ backgroundColor: restaurantSettings.primaryColor }}>
            {t('review.submit_button')}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function BookingScreen({ setView, restaurantSettings }: { setView: (v: string, props?: any) => void; restaurantSettings: RestaurantSettings }) {
  const t = useTranslations('Customer')
  const [formData, setFormData] = useState({
    tableId: '',
    customerName: '',
    contact: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    partySize: 2,
    preOrderItems: [] as { itemId: string; quantity: number }[],
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const menuItems = MOCK_MENU_CATEGORIES_BASE.flatMap(cat => cat.items).filter(item => item.available)
  const locale = getCurrentLocale()
  if (!FEATURE_FLAGS.tableBooking) {
    setView('menu')
    return <p>Coming Soon</p>
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const checked = (e.target as HTMLInputElement).checked; // Explicitly cast to HTMLInputElement for 'checked'

    if (name === 'preOrderItems') {
      const itemId = value;
      setFormData(prev => ({
        ...prev,
        preOrderItems: checked ? [...prev.preOrderItems, { itemId, quantity: 1 }] : prev.preOrderItems.filter(item => item.itemId !== itemId),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, tableId: value }));
  };
  const handlePreOrderItemQuantityChange = (itemId: string, quantity: string) => {
    const numQuantity = parseInt(quantity)
    if (numQuantity > 0) {
      setFormData(prev => ({
        ...prev,
        preOrderItems: prev.preOrderItems.map(item => (item.itemId === itemId ? { ...item, quantity: numQuantity } : item)),
      }))
    } else {
      setFormData(prev => ({ ...prev, preOrderItems: prev.preOrderItems.filter(item => item.itemId !== itemId) }))
    }
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerName || !formData.contact || !formData.date || !formData.time || formData.partySize < 1) {
      setError(t('booking.form.validation_error_fill_fields'))
      return
    }
    setError('')
    setSubmitted(true)
  }
  if (submitted) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="mx-auto mb-6 text-green-500 dark:text-green-400" size={64} />
        <h2 className="text-3xl font-bold mb-3">{t('booking.submission_thank_you_title')}</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{t('booking.submission_thank_you_message')}</p>
        <Button onClick={() => setView('menu')} size="lg" style={{ backgroundColor: restaurantSettings.primaryColor }} className="text-white">
          {t('thankyou.back_to_menu_button')}
        </Button>
      </div>
    )
  }
  return (
    <div>
      <Button onClick={() => setView('menu')} variant="ghost" className="mb-4 -ml-2">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t('checkout.back_to_menu')}
      </Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">{t('booking.title')}</h2>
      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      <Card className="max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select name="tableId" value={formData.tableId} onValueChange={handleSelectChange} required>
            <option value="" disabled>
              {t('booking.form.table_select_placeholder')}
            </option>
            {MOCK_TABLES_BASE.map(table => (
              <option key={table.id} value={table.id}>
                {table.name} ({t('booking.form.table_capacity', { count: table.capacity })})
              </option>
            ))}
          </Select>
          <Input name="customerName" value={formData.customerName} onChange={handleChange} required placeholder={t('booking.form.name_placeholder')} />
          <Input name="contact" value={formData.contact} onChange={handleChange} required placeholder={t('booking.form.contact_placeholder')} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="date" type="date" value={formData.date} onChange={handleChange} required min={new Date().toISOString().split('T')[0]} />
            <Input name="time" type="time" value={formData.time} onChange={handleChange} required />
          </div>
          <Input name="partySize" type="number" value={formData.partySize} onChange={handleChange} required min="1" />
          <h4 className="text-md font-semibold pt-4 border-t dark:border-slate-700">{t('booking.form.preorder_optional_title')}</h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {menuItems.map(item => {
              const isPreOrdered = formData.preOrderItems.find(pi => pi.itemId === item.id)
              return (
                <div key={item.id} className="p-2 border rounded-lg dark:border-slate-600 flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="preOrderItems" value={item.id} checked={!!isPreOrdered} onChange={handleChange} className="form-checkbox h-4 w-4 text-[--brand-color] rounded" />
                    <span>
                      {getLocalizedText(item.name, locale)} ({t('currency_format', { value: item.price })})
                    </span>
                  </label>
                  {isPreOrdered && (
                    <Input type="number" name={`pre_${item.id}`} value={isPreOrdered.quantity} min="1" onChange={e => handlePreOrderItemQuantityChange(item.id, e.target.value)} className="w-20 text-sm py-1 mb-0" />
                  )}
                </div>
              )
            })}
          </div>
          <Button type="submit" size="lg" className="w-full mt-6 text-white" style={{ backgroundColor: restaurantSettings.primaryColor }}>
            {t('booking.form.submit_button')}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export function CustomerClientContent({ restaurantSettings }: { restaurantSettings: RestaurantSettings }) {
  const [view, setViewState] = useState<'menu' | 'checkout' | 'thankyou' | 'review' | 'booking' | 'admin'>('menu')
  const [viewProps, setViewProps] = useState<any>({})
  const setView = (v: string, props: any = {}) => {
    setViewState(v as any)
    setViewProps(props)
    window.scrollTo(0, 0)
  }

  let Screen: JSX.Element | null = null
  if (view === 'menu') Screen = <CustomerMenuScreen setView={setView} restaurantSettings={restaurantSettings} viewProps={viewProps} />
  if (view === 'checkout') Screen = <CheckoutScreen setView={setView} restaurantSettings={restaurantSettings} viewProps={viewProps} />
  if (view === 'thankyou') Screen = <ThankYouScreen setView={setView} restaurantSettings={restaurantSettings} viewProps={viewProps} />
  if (view === 'review') Screen = <ReviewScreen setView={setView} restaurantSettings={restaurantSettings} viewProps={viewProps} />
  if (view === 'booking') Screen = <BookingScreen setView={setView} restaurantSettings={restaurantSettings} />

  return (
    <CartProvider>
      <CustomerLayout setView={setView} restaurantSettings={restaurantSettings}>{Screen}</CustomerLayout>
    </CartProvider>
  )
}
