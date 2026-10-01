import { Routes, Route, Navigate } from 'react-router-dom';
import { CustomerProvider } from '../context/CustomerContext.jsx';
import CustomerLayout from '../components/CustomerLayout.jsx';
import CustomerDashboard from '../pages/customer/CustomerDashboard.jsx';
import Products from '../pages/customer/Products.jsx';
import ProductDetails from '../pages/customer/ProductDetails.jsx';
import Categories from '../pages/customer/Categories.jsx';
import Wishlist from '../pages/customer/Wishlist.jsx';
import Cart from '../pages/customer/Cart.jsx';
import Checkout from '../pages/customer/Checkout.jsx';
import Profile from '../pages/customer/Profile.jsx';
import RequestDemo from '../pages/customer/RequestDemo.jsx';
import ContactSales from '../pages/customer/ContactSales.jsx';

export default function CustomerRoutes() {
  return (
    <CustomerProvider>
      <CustomerLayout>
        <Routes>
          <Route index element={<CustomerDashboard />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="shop" element={<Products />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:productId" element={<ProductDetails />} />
          <Route path="categories" element={<Categories />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="profile" element={<Profile />} />
          <Route path="request-demo" element={<RequestDemo />} />
          <Route path="contact" element={<ContactSales />} />
          <Route path="*" element={<Navigate to="/customer" replace />} />
        </Routes>
      </CustomerLayout>
    </CustomerProvider>
  );
}
