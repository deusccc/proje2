'use client'
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { User } from '@/types';
import CustomerManagementClient from '@/components/CustomerManagementClient';

export default function CustomersPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (loading) {
        return <p>Yükleniyor...</p>; // Or a proper loading spinner component
    }

    return (
        <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager']}>
            <CustomerManagementClient />
        </DashboardLayout>
    );
} 