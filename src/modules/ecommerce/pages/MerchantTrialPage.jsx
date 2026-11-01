import React from 'react';
import { useNavigate } from 'react-router-dom';
import MerchantTrialAuthModal from '../components/MerchantTrialAuthModal';

export default function MerchantTrialPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center overflow-hidden">
      <MerchantTrialAuthModal 
        isOpen={true} 
        onClose={() => navigate('/')} 
        initialMode="register" 
      />
    </div>
  );
}
