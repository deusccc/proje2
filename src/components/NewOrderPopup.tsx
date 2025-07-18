'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Order } from '@/types'
import { supabase } from '@/lib/supabase/index'

interface NewOrderPopupProps {
  order: Order & { order_items: any[] }
  onClose: () => void
  onConfirm: (orderId: string) => void
}

const COUNTDOWN_SECONDS = 120 // 2 minutes

export default function NewOrderPopup({ order, onClose, onConfirm }: NewOrderPopupProps) {
  const [remainingTime, setRemainingTime] = useState(COUNTDOWN_SECONDS)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(true)
    // Play alarm sound
    if (typeof Audio !== 'undefined') {
      audioRef.current = new Audio('/alarm.mp3')
      audioRef.current.loop = true
      audioRef.current.play().catch(error => console.error("Audio play failed:", error))
    }
    
    // Start countdown timer
    const interval = setInterval(() => {
      setRemainingTime(prevTime => prevTime > 0 ? prevTime - 1 : 0)
    }, 1000)

    // Set auto-cancel timeout
    timerRef.current = window.setTimeout(handleAutoCancel, COUNTDOWN_SECONDS * 1000)
    
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      clearInterval(interval)
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [order.id])


  const stopProcessesAndClose = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if(timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    onClose()
  }

  const handleConfirm = async () => {
    stopProcessesAndClose()
    // Optimistic update
    onConfirm(order.id)

    const { error } = await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', order.id)

    if (error) {
      console.error('Failed to confirm order', error)
      // Here you might want to add logic to revert the optimistic update
    } else {
      window.dispatchEvent(new CustomEvent('orders-updated'))
    }
  }

  const handleAutoCancel = async () => {
    stopProcessesAndClose()

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', notes: 'Restoran tarafından 2 dakika içinde onaylanmadığı için otomatik iptal edildi.' })
      .eq('id', order.id)

    if (error) {
      console.error('Failed to auto-cancel order', error)
    } else {
       window.dispatchEvent(new CustomEvent('orders-updated'))
    }
  }
  
  const progressPercentage = (remainingTime / COUNTDOWN_SECONDS) * 100

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => { /* Don't close on overlay click */ }}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold leading-6 text-gray-900 text-center"
                >
                  Yeni Sipariş Geldi!
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-lg text-center font-semibold">{order.customer_name}</p>
                  <div className="mt-2 text-center text-gray-600">
                    {order.order_items.map(item => (
                        <div key={item.id}>{item.quantity}x {item.product_name}</div>
                    ))}
                  </div>
                  <p className="mt-2 text-xl text-center font-bold">{order.total_amount.toFixed(2)} TL</p>
                </div>

                <div className="mt-6">
                   <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                     <div 
                       className="bg-red-500 h-4 rounded-full transition-all duration-1000 linear" 
                       style={{ width: `${progressPercentage}%`}}
                     ></div>
                   </div>
                   <p className="text-center text-sm text-gray-500 mt-1">
                     Otomatik iptale kalan süre: {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                   </p>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-3 text-lg font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                    onClick={handleConfirm}
                  >
                    Onayla
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
} 