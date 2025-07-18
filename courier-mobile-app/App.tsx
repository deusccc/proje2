import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import OrderDetailScreen from './screens/OrderDetailScreen'

import { User, Courier, DeliveryAssignment } from './types'

// Navigation parameter types
export type RootStackParamList = {
  Login: undefined
  Dashboard: {
    user: User
    courier: Courier
  }
  OrderDetail: {
    assignment: DeliveryAssignment
    user: User
    courier: Courier
  }
}

const Stack = createStackNavigator<RootStackParamList>()

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen 
            name="OrderDetail" 
            component={OrderDetailScreen}
            options={{
              headerShown: true,
              title: 'Sipariş Detayı',
              headerStyle: {
                backgroundColor: '#3B82F6',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  )
}
