'use client'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { User, Customer } from '@/types';
import { UserCircleIcon, PlusIcon, HomeIcon } from '@heroicons/react/24/solid';
import AddAddressModal from '@/components/AddAddressModal';

// Define the Address type based on your new table
interface Address {
    id: string;
    address_title: string;
    address_line_1: string;
    city: string;
    postal_code: string | null;
    latitude?: number;
    longitude?: number;
}

// We will expand this component later to include address management
function CustomerDetailClient({ customer, initialAddresses }: { customer: Customer, initialAddresses: Address[] }) {
    const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
    // State to manage the add address modal
    const [isAddAddressModalOpen, setAddAddressModalOpen] = useState(false);

    const handleAddressAdded = (newAddress: Address) => {
        setAddresses(prev => [newAddress, ...prev]);
    };

    return (
        <div>
            <div className="mb-8">
                <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                        <UserCircleIcon className="h-24 w-24 text-gray-300" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                        <p className="text-lg text-gray-500">{customer.phone}</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Kayıtlı Adresler</h2>
                    <button
                        onClick={() => setAddAddressModalOpen(true)}
                        className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                        Yeni Adres Ekle
                    </button>
                </div>

                {addresses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {addresses.map((address) => (
                            <div key={address.id} className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow">
                                <div className="flex w-full items-center justify-between space-x-6 p-6">
                                    <div className="flex-1 truncate">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="truncate text-sm font-medium text-gray-900">{address.address_title}</h3>
                                            {address.latitude && address.longitude ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    ✓ Doğrulanmış
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    ⚠ Doğrulanmamış
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-sm text-gray-500">{address.address_line_1}</p>
                                        <p className="mt-1 truncate text-sm text-gray-500">{address.city}{address.postal_code && `, ${address.postal_code}`}</p>
                                        {address.latitude && address.longitude && (
                                            <p className="mt-1 text-xs text-green-600">
                                                Konum: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                                            </p>
                                        )}
                                    </div>
                                    <HomeIcon className="h-10 w-10 text-gray-300 flex-shrink-0" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                         <p className="mt-1 text-sm text-gray-500">Bu müşteri için kayıtlı adres bulunmamaktadır.</p>
                    </div>
                )}
            </div>

            <AddAddressModal
                isOpen={isAddAddressModalOpen}
                onClose={() => setAddAddressModalOpen(false)}
                customerId={customer.id}
                onAddressAdded={handleAddressAdded}
            />
        </div>
    );
}


export default function CustomerDetailPage() {
    const [user, setUser] = useState<User | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const customerId = params.id;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (!customerId) {
                setError('Müşteri ID bulunamadı.');
                setLoading(false);
                return;
            }

            // Fetch customer and addresses in parallel
            const [customerRes, addressesRes] = await Promise.all([
                 supabase.from('customers').select('*').eq('id', customerId).single(),
                 supabase.from('customer_addresses').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
            ]);

            if (customerRes.error) {
                setError('Müşteri bilgileri yüklenemedi: ' + customerRes.error.message);
                console.error(customerRes.error);
            } else {
                setCustomer(customerRes.data);
            }

            if (addressesRes.error) {
                // Don't treat this as a fatal error, maybe the user has no addresses
                console.error('Adresler yüklenemedi:', addressesRes.error.message);
            } else {
                setAddresses(addressesRes.data);
            }

            setLoading(false);
        };
        fetchData();
    }, [customerId]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (loading) {
        return <div className="p-8 text-center">Yükleniyor...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <DashboardLayout user={user} onSignOut={handleSignOut}>
            {customer ? <CustomerDetailClient customer={customer} initialAddresses={addresses} /> : <p>Müşteri bulunamadı.</p>}
        </DashboardLayout>
    );
} 