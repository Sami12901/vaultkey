import React from 'react';

interface VirtualCardProps {
  cardholderName: string;
  maskedNumber: string;
  cardNumber?: string;
  expiryMonth: string;
  expiryYear: string;
  cvv?: string;
  cardBrand: string;
  cardType?: string;
  revealed?: boolean;
}

export const VirtualCard: React.FC<VirtualCardProps> = ({
  cardholderName,
  maskedNumber,
  cardNumber,
  expiryMonth,
  expiryYear,
  cvv,
  cardBrand,
  cardType = 'Credit',
  revealed = false,
}) => {
  const getBrandGradient = () => {
    switch (cardBrand.toLowerCase()) {
      case 'visa':
        return 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)';
      case 'mastercard':
        return 'linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)';
      case 'amex':
      case 'american express':
        return 'linear-gradient(135deg, #065F46 0%, #10B981 100%)';
      default:
        return 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)';
    }
  };

  const displayNumber = revealed && cardNumber ? cardNumber : maskedNumber;

  return (
    <div
      style={{
        background: getBrandGradient(),
        borderRadius: '16px',
        padding: '24px',
        color: '#FFFFFF',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '190px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '360px',
        margin: '0 auto',
      }}
    >
      {/* Background aesthetic circles */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-50px',
          left: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none',
        }}
      />

      {/* Header: Chip & Brand */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Chip */}
        <div
          style={{
            width: '42px',
            height: '32px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            border: '1px solid #B45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '28px', height: '18px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '3px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {cardBrand}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase' }}>{cardType}</div>
        </div>
      </div>

      {/* Card Number */}
      <div
        style={{
          fontSize: '18px',
          letterSpacing: '2px',
          fontFamily: 'monospace',
          fontWeight: 600,
          margin: '16px 0',
        }}
      >
        {displayNumber}
      </div>

      {/* Footer: Cardholder, Expiry, CVV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '9px', opacity: 0.7, textTransform: 'uppercase' }}>Cardholder</div>
          <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
            {cardholderName || 'CARDHOLDER NAME'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '9px', opacity: 0.7, textTransform: 'uppercase' }}>Expires</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>
              {expiryMonth && expiryYear ? `${expiryMonth}/${expiryYear}` : 'MM/YY'}
            </div>
          </div>
          {cvv && (
            <div>
              <div style={{ fontSize: '9px', opacity: 0.7, textTransform: 'uppercase' }}>CVV</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{revealed ? cvv : '•••'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
