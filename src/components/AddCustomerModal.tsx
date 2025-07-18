'use client'

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerAdded: (newCustomer: Customer) => void;
}

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }: AddCustomerModalProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        const { data, error } = await supabase
            .from('customers')
            .insert({ name, phone })
            .select()
            .single();

        setSubmitting(false);

        if (error) {
            setError('Müşteri eklenirken bir hata oluştu: ' + error.message);
            console.error(error);
        } else {
            onCustomerAdded(data as Customer);
            handleClose();
        }
    };

    const handleClose = () => {
        setName('');
        setPhone('');
        setError(null);
        onClose();
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
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
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <form onSubmit={handleSubmit}>
                                    <div>
                                        <h3 className="text-lg font-medium leading-6 text-gray-900">Yeni Müşteri Ekle</h3>
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                    Müşteri Adı
                                                </label>
                                                <div className="mt-1">
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        id="name"
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                                    Telefon Numarası
                                                </label>
                                                <div className="mt-1">
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        id="phone"
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {error && (
                                        <div className="mt-4 rounded-md bg-red-50 p-4">
                                            <p className="text-sm text-red-700">{error}</p>
                                        </div>
                                    )}
                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                        <button
                                            type="submit"
                                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm"
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:col-start-1 sm:mt-0 sm:text-sm"
                                            onClick={handleClose}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
} 