import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CustomerContext = createContext(null);
export const useCustomer = () => useContext(CustomerContext);

export function CustomerProvider({ children }) {
  const { user, token } = useAuth();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [demoProduct, setDemoProduct] = useState(null);

  const showToast = useCallback((text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const openDemoModal = useCallback((product) => {
    setDemoProduct(product);
  }, []);

  const closeDemoModal = useCallback(() => {
    setDemoProduct(null);
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!token || user?.role !== 'customer') return;
    try {
      const data = await api('/customer/wishlist', { token });
      const ids = new Set((data.wishlist || []).map((item) => String(item.productId)));
      setWishlistIds(ids);
      setWishlistCount(ids.size);
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  }, [token, user]);

  const refreshCart = useCallback(async () => {
    if (!token || user?.role !== 'customer') return;
    try {
      const data = await api('/customer/cart', { token });
      const count = data.cart?.itemCount || 0;
      setCartCount(count);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user?.role === 'customer') {
      refreshWishlist();
      refreshCart();
    } else {
      setWishlistCount(0);
      setWishlistIds(new Set());
      setCartCount(0);
    }
  }, [token, user, refreshWishlist, refreshCart]);

  const toggleWishlist = async (productId, productName = 'Product') => {
    if (!token) return false;
    const isSaved = wishlistIds.has(String(productId));
    try {
      if (isSaved) {
        await api(`/customer/wishlist/${productId}`, { method: 'DELETE', token });
        const next = new Set(wishlistIds);
        next.delete(String(productId));
        setWishlistIds(next);
        setWishlistCount(next.size);
        showToast(`Removed from wishlist`, 'info');
      } else {
        await api(`/customer/wishlist/${productId}`, { method: 'POST', token });
        const next = new Set(wishlistIds);
        next.add(String(productId));
        setWishlistIds(next);
        setWishlistCount(next.size);
        showToast(`${productName} added to wishlist!`, 'success');
      }
      return !isSaved;
    } catch (err) {
      showToast(err.message || 'Error updating wishlist', 'error');
      return isSaved;
    }
  };

  const addToCart = async (productId, quantity = 1, productName = 'Product') => {
    if (!token) return false;
    try {
      await api('/customer/cart', {
        method: 'POST',
        token,
        body: { productId, quantity },
      });
      await refreshCart();
      showToast(`${quantity}x ${productName} added to cart!`, 'success');
      return true;
    } catch (err) {
      showToast(err.message || 'Error adding to cart', 'error');
      return false;
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        wishlistCount,
        wishlistIds,
        cartCount,
        toast,
        showToast,
        demoProduct,
        openDemoModal,
        closeDemoModal,
        refreshWishlist,
        refreshCart,
        toggleWishlist,
        addToCart,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}
