
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import PostListing from './pages/PostListing';
import Explore from './pages/Explore';
import Chat from './pages/Chat';
import ChatDetail from './pages/ChatDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Wallet from './pages/Wallet';
import Storefront from './pages/Storefront';
import Shops from './pages/Shops';
import SavedItems from './pages/SavedItems';
import Clips from './pages/Clips';
import MeshMap from './pages/MeshMap';
import Notifications from './pages/Notifications';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/explore" element={<Layout><Explore /></Layout>} />
          <Route path="/map" element={<Layout><MeshMap /></Layout>} />
          <Route path="/vibes" element={<Layout hideNav><Clips /></Layout>} />
          <Route path="/shops" element={<Layout><Shops /></Layout>} />
          <Route path="/saved" element={<Layout><SavedItems /></Layout>} />
          <Route path="/post" element={<Layout><PostListing /></Layout>} />
          <Route path="/chats" element={<Layout><Chat /></Layout>} />
          <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
          <Route path="/chat/:id" element={<ChatDetail />} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/wallet" element={<Layout><Wallet /></Layout>} />
          <Route path="/shop/:id" element={<Layout hideNav><Storefront /></Layout>} />
          <Route path="/listing/:id" element={<Layout hideNav><ListingDetail /></Layout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
