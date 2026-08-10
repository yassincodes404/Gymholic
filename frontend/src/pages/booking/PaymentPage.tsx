import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentApi } from '../../api/payments';

export const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId;
  const [isLoading, setIsLoading] = useState(false);

  if (!bookingId) {
    return (
      <div className="text-center mt-20">
        <h1 className="text-xl">No booking found.</h1>
        <button onClick={() => navigate('/')} className="text-primary underline mt-4 block mx-auto">Return Home</button>
      </div>
    );
  }

  const handlePay = async () => {
    setIsLoading(true);
    try {
      const response = await paymentApi.create({
        bookingId: bookingId,
        amount: 500,
        currency: 'AED',
        provider: 'paymob'
      });
      
      // Redirect to Paymob checkout URL
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        alert('Payment URL not generated');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate payment');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card p-8 border rounded-lg shadow-sm text-center">
      <h1 className="text-2xl font-bold mb-4">Complete Payment</h1>
      <p className="text-muted-foreground mb-8">
        Your consultation requires a payment of <strong>500 AED</strong>.
      </p>
      
      <button 
        onClick={handlePay}
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Redirecting to secure checkout...' : 'Pay 500 AED'}
      </button>
    </div>
  );
};
