'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '@/lib/supabase';

interface AddAddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    onAddressAdded: (newAddress: any) => void;
}

export default function AddAddressModal({ isOpen, onClose, customerId, onAddressAdded }: AddAddressModalProps) {
    const [addressTitle, setAddressTitle] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setAddressTitle('');
        setAddressLine1('');
        setCity('');
        setPostalCode('');
        setError(null);
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (!addressTitle || !addressLine1 || !city) {
            setError('Lütfen tüm zorunlu alanları doldurun.');
            setIsSubmitting(false);
            return;
        }

        const { data, error: insertError } = await supabase
            .from('customer_addresses')
            .insert({
                customer_id: customerId,
                address_title: addressTitle,
                address_line_1: addressLine1,
                city,
                postal_code: postalCode || null
            })
            .select()
            .single();

        if (insertError) {
            setError('Adres eklenirken bir hata oluştu: ' + insertError.message);
            console.error(insertError);
        } else {
            onAddressAdded(data);
            resetForm();
            onClose();
        }

        setIsSubmitting(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
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
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                    Yeni Adres Ekle
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="addressTitle" className="block text-sm font-medium text-gray-700">Adres Başlığı (Örn: Ev, İş)</label>
                                        <input
                                            type="text"
                                            name="addressTitle"
                                            id="addressTitle"
                                            value={addressTitle}
                                            onChange={(e) => setAddressTitle(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">Adres Satırı</label>
                                        <textarea
                                            name="addressLine1"
                                            id="addressLine1"
                                            rows={3}
                                            value={addressLine1}
                                            onChange={(e) => setAddressLine1(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">Şehir</label>
                                        <input
                                            type="text"
                                            name="city"
                                            id="city"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Posta Kodu (İsteğe Bağlı)</label>
                                        <input
                                            type="text"
                                            name="postalCode"
                                            id="postalCode"
                                            value={postalCode}
                                            onChange={(e) => setPostalCode(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    
                                    {error && <p className="text-sm text-red-600">{error}</p>}

                                    <div className="mt-6 flex justify-end space-x-2">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                                            onClick={handleClose}
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300"
                                        >
                                            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
} 