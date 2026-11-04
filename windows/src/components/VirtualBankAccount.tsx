import React from 'react';
import { BankIcon } from './Icons';

interface VirtualBankAccountProps {
  bankName: string;
  accountHolder: string;
  maskedAccountNumber: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  accountType?: string;
  revealed?: boolean;
}

export const VirtualBankAccount: React.FC<VirtualBankAccountProps> = ({
  bankName,
  accountHolder,
  maskedAccountNumber,
  accountNumber,
  routingNumber,
  swiftBic,
  iban,
  accountType = 'Checking',
  revealed = false,
}) => {
  const displayAccount = revealed && accountNumber ? accountNumber : maskedAccountNumber;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
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
      {/* Background shapes */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }}
      />

      {/* Header: Bank name & Account Type */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BankIcon size={24} color="#A7F3D0" />
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{bankName || 'BANK ACCOUNT'}</div>
        </div>
        <div
          style={{
            fontSize: '11px',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '4px 8px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {accountType}
        </div>
      </div>

      {/* Account Number */}
      <div style={{ margin: '14px 0' }}>
        <div style={{ fontSize: '9px', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>
          Account Number
        </div>
        <div
          style={{
            fontSize: '18px',
            letterSpacing: '1.5px',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          {displayAccount}
        </div>
      </div>

      {/* Details: Routing & SWIFT/IBAN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px' }}>
        <div>
          <div style={{ fontSize: '9px', opacity: 0.7, textTransform: 'uppercase' }}>Account Holder</div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{accountHolder || 'ACCOUNT HOLDER'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {routingNumber && (
            <div>
              <span style={{ opacity: 0.7 }}>RTN: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{routingNumber}</span>
            </div>
          )}
          {swiftBic && (
            <div>
              <span style={{ opacity: 0.7 }}>SWIFT: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{swiftBic}</span>
            </div>
          )}
          {iban && (
            <div>
              <span style={{ opacity: 0.7 }}>IBAN: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{iban}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
