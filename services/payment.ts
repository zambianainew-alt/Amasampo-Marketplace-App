
import { storage } from './storage';
import { Transaction } from '../types';

export class PaymentService {
  private readonly PLATFORM_FEE_PERCENT = 0.02; // 2% Deal Commission
  private readonly WITHDRAWAL_FLAT_FEE = 5;      // 5 ZK flat fee
  private readonly BOOST_PRICE = 25;             // 25 ZK per boost

  private generateChecksum(tx: Transaction): string {
    const raw = `${tx.id}-${tx.userId}-${tx.amount}-${tx.timestamp}`;
    return btoa(raw).split('').reverse().join('');
  }

  async processDeposit(userId: string, amount: number, provider: 'MTN' | 'AIRTEL', phone: string): Promise<Transaction> {
    const txId = `tx_${Math.random().toString(36).substr(2, 9)}`;
    const tx: Transaction = {
      id: txId,
      userId,
      amount,
      type: 'DEPOSIT',
      status: 'SUCCESS',
      provider,
      description: `Mobile Money Top-up (${provider})`,
      timestamp: new Date().toISOString()
    };
    
    await storage.saveTransaction(tx);
    const currentBalance = await storage.getBalance(userId);
    await storage.updateBalance(userId, currentBalance + amount);

    storage.broadcast('GLOBAL_ALERT', {
      message: `Vault Sync: +${amount} ZK`,
      type: 'SUCCESS'
    });

    return tx;
  }

  async processWithdrawal(userId: string, amount: number, provider: 'MTN' | 'AIRTEL', phone: string): Promise<Transaction> {
    const currentBalance = await storage.getBalance(userId);
    const totalDeduction = amount + this.WITHDRAWAL_FLAT_FEE;
    
    if (currentBalance < totalDeduction) {
      throw new Error(`Insufficient mesh funds. Need ${totalDeduction} ZK (incl. ${this.WITHDRAWAL_FLAT_FEE} ZK fee).`);
    }

    const tx: Transaction = {
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amount: totalDeduction,
      type: 'WITHDRAWAL',
      status: 'SUCCESS',
      provider,
      description: `Withdrawal (Inc. ${this.WITHDRAWAL_FLAT_FEE} ZK Service Fee)`,
      timestamp: new Date().toISOString()
    };

    await storage.updateBalance(userId, currentBalance - totalDeduction);
    await storage.saveTransaction(tx);

    // Track Revenue for Admin
    const rev = await storage.getMetadata('platform_revenue') || 0;
    await storage.setMetadata('platform_revenue', rev + this.WITHDRAWAL_FLAT_FEE);

    return tx;
  }

  async finalizeHandshake(userId: string, sellerId: string, amount: number): Promise<void> {
    const commission = amount * this.PLATFORM_FEE_PERCENT;
    const sellerBalance = await storage.getBalance(sellerId);
    
    if (sellerBalance < commission) {
      // If seller has no funds, we mark it as a pending debt or allow it but track it.
      // For this MVP, we simply log the service fee transaction.
    }

    const tx: Transaction = {
      id: `tx_fee_${Date.now()}`,
      userId: sellerId,
      amount: commission,
      type: 'PAYMENT',
      status: 'SUCCESS',
      provider: 'WALLET',
      description: `Deal Commission (2%) - Handshake Protocol`,
      timestamp: new Date().toISOString()
    };

    await storage.saveTransaction(tx);
    
    // Log platform revenue
    const rev = await storage.getMetadata('platform_revenue') || 0;
    await storage.setMetadata('platform_revenue', rev + commission);
  }

  async payForBoost(userId: string, listingId: string): Promise<void> {
    const currentBalance = await storage.getBalance(userId);
    
    if (currentBalance < this.BOOST_PRICE) {
       throw new Error(`Insufficient funds for Mesh Boost. Need ${this.BOOST_PRICE} ZK.`);
    }

    const tx: Transaction = {
      id: `tx_boost_${Date.now()}`,
      userId,
      amount: this.BOOST_PRICE,
      type: 'BOOST',
      status: 'SUCCESS',
      provider: 'WALLET',
      description: `Mesh Visibility Upgrade (24h)`,
      timestamp: new Date().toISOString()
    };

    await storage.updateBalance(userId, currentBalance - this.BOOST_PRICE);
    await storage.saveTransaction(tx);
    
    // Apply boost to listing
    const listing = await storage.getListingById(listingId);
    if (listing) {
      listing.isBoosted = true;
      await storage.saveListing(listing);
    }

    // Log revenue
    const rev = await storage.getMetadata('platform_revenue') || 0;
    await storage.setMetadata('platform_revenue', rev + this.BOOST_PRICE);

    storage.broadcast('GLOBAL_ALERT', { message: 'Node Boosted! Visibility increased by 500%.', type: 'SUCCESS' });
  }
}

export const payments = new PaymentService();
