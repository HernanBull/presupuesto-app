import React from 'react';
import { useNavigate } from 'react-router-dom';
import MerchantTrialAuthModal from '../components/MerchantTrialAuthModal';

export default function MerchantTrialPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center">
      <MerchantTrialAuthModal 
        isOpen={true} 
        onClose={() => navigate('/')} 
        initialMode="register" 
      />
    </div>
  );
}
