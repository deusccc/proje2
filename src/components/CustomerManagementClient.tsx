'use client'

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AddCustomerModal from './AddCustomerModal';

export default function CustomerManagementClient() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                setError('Müşteriler yüklenirken bir hata oluştu: ' + error.message);
                console.error(error);
            } else {
                setCustomers(data || []);
            }
            setLoading(false);
        };
        fetchCustomers();
    }, []);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) {
            return customers;
        }
        return customers.filter(customer =>
            (customer.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm, customers]);
    
    const handleCustomerAdded = (newCustomer: Customer) => {
        setCustomers(prevCustomers => [newCustomer, ...prevCustomers]);
    };

    if (loading) {
        return <div className="p-8 text-center">Müşteriler Yükleniyor...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
                        <p className="mt-2 text-sm text-gray-700">
                            Sisteme kayıtlı tüm müşterilerin listesi.
                        </p>
                    </div>
                    <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                            Yeni Müşteri Ekle
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            placeholder="İsim veya telefona göre ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>

                <div className="mt-8 flow-root">
                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">İsim</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Telefon</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kayıt Tarihi</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                <span className="sr-only">Düzenle</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredCustomers.length > 0 ? (
                                            filteredCustomers.map((customer) => (
                                                <tr key={customer.id}>
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{customer.name}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{customer.phone}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(customer.created_at).toLocaleDateString('tr-TR')}</td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                        <a href={`/dashboard/customers/${customer.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                            Detaylar
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="text-center py-5 text-sm text-gray-500">
                                                    Arama kriterlerine uygun müşteri bulunamadı veya hiç müşteri yok.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <AddCustomerModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onCustomerAdded={handleCustomerAdded}
            />
        </>
    );
} 