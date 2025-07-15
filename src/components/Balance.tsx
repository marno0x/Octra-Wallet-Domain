import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, RefreshCw, Wallet, Eye, EyeOff, Lock, Unlock, ArrowUpDown } from 'lucide-react';
import { Wallet as WalletType } from '../types/wallet';
import { fetchBalance, fetchEncryptedBalance, encryptBalance, decryptBalance, getPendingPrivateTransfers } from '../utils/api';
import { useToast } from '@/hooks/use-toast';
import { EncryptBalanceDialog } from './EncryptBalanceDialog';
import { DecryptBalanceDialog } from './DecryptBalanceDialog';

interface BalanceProps {
  wallet: WalletType | null;
  balance: number | null;
  onBalanceUpdate: (balance: number) => void;
  isLoading?: boolean;
}

export function Balance({ wallet, balance, onBalanceUpdate, isLoading = false }: BalanceProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [encryptedBalance, setEncryptedBalance] = useState<any>(null);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [showEncryptDialog, setShowEncryptDialog] = useState(false);
  const [showDecryptDialog, setShowDecryptDialog] = useState(false);
  const { toast } = useToast();

  const fetchWalletBalance = async () => {
    if (!wallet) return;
    
    setRefreshing(true);
    try {
      const balanceData = await fetchBalance(wallet.address);
      onBalanceUpdate(balanceData.balance);
      
      // Fetch encrypted balance
      const encData = await fetchEncryptedBalance(wallet.address, wallet.privateKey);
      setEncryptedBalance(encData);
      
      // Fetch pending private transfers
      const pending = await getPendingPrivateTransfers(wallet.address, wallet.privateKey);
      setPendingTransfers(pending);
      
      toast({
        title: "Balance Updated",
        description: "Balance has been refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error 500",
        description: "Failed to refresh balance",
        variant: "destructive",
      });
      console.error('Balance fetch error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial fetch of encrypted balance
  useEffect(() => {
    if (wallet) {
      fetchEncryptedBalance(wallet.address, wallet.privateKey).then(setEncryptedBalance);
      getPendingPrivateTransfers(wallet.address, wallet.privateKey).then(setPendingTransfers);
    }
  }, [wallet]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Copy failed",
        variant: "destructive",
      });
    }
  };

  const handleEncryptSuccess = () => {
    setShowEncryptDialog(false);
    fetchWalletBalance();
  };

  const handleDecryptSuccess = () => {
    setShowDecryptDialog(false);
    fetchWalletBalance();
  };

  if (!wallet) {
    return (
      <Alert>
        <div className="flex items-start space-x-3">
          <Wallet className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <AlertDescription>
            No wallet available. Please generate or import a wallet first.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <ScrollArea className="max-h-[80vh]">
      <div className="space-y-6 pr-4">
      {/* Balance Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Wallet Overview</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWalletBalance}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Public Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Public Balance</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-center gap-x-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {balance !== null ? `${balance.toFixed(8)}` : '0.00000000'}
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold mt-0.5">
                    OCT
                  </Badge>
                </div>
              )}
            </div>

            {/* Encrypted Balance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-muted-foreground">Private Balance</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-center gap-x-2">
                  <div className="text-2xl font-bold text-yellow-600">
                    {encryptedBalance ? `${encryptedBalance.encrypted.toFixed(8)}` : '0.00000000'}
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold mt-0.5">
                    OCT
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Total Balance */}
          {encryptedBalance && (
            <div className="pt-5 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
                <div className="text-lg font-bold text-green-600">
                  {encryptedBalance.total.toFixed(8)} OCT
                </div>
              </div>
            </div>
          )}

          {/* Pending Transfers */}
          {pendingTransfers.length > 0 && (
            <div className="pt-5 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Claimable Transfers</span>
                <Badge variant="outline" className="text-green-600 pb-1">
                  {pendingTransfers.length} pending
                </Badge>
              </div>
            </div>
          )}

          {/* Balance Actions */}
          <div className="flex flex-wrap justify-center gap-2 pt-5 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEncryptDialog(true)}
              disabled={!balance || balance <= 1}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Encrypt Balance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDecryptDialog(true)}
              disabled={!encryptedBalance || encryptedBalance.encrypted <= 0}
              className="flex items-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              Decrypt Balance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Information */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Wallet Address</label>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-xs sm:text-sm break-all">
                {wallet.address}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(wallet.address, 'Address')}
                className="self-start sm:self-auto"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Private Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Private Key (Base64)</label>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-xs sm:text-sm break-all">
                {showPrivateKey ? wallet.privateKey : '•'.repeat(44)}
              </div>
              <div className="flex space-x-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {showPrivateKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(wallet.privateKey, 'Private Key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Public Key */}
          {wallet.publicKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Public Key (Hex)</label>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex-1 p-3 bg-muted rounded-md font-mono text-xs sm:text-sm break-all">
                  {wallet.publicKey}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(wallet.publicKey!, 'Public Key')}
                  className="self-start sm:self-auto"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Mnemonic */}
          {wallet.mnemonic && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Mnemonic Phrase</label>
              <div className="p-3 bg-muted rounded-md">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {wallet.mnemonic.split(' ').map((word, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <span className="font-mono text-xs sm:text-sm">{word}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(wallet.mnemonic!, 'Mnemonic')}
                className="w-full mt-2"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Mnemonic Phrase
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EncryptBalanceDialog
        open={showEncryptDialog}
        onOpenChange={setShowEncryptDialog}
        wallet={wallet}
        publicBalance={balance || 0}
        onSuccess={handleEncryptSuccess}
      />

      <DecryptBalanceDialog
        open={showDecryptDialog}
        onOpenChange={setShowDecryptDialog}
        wallet={wallet}
        encryptedBalance={encryptedBalance?.encrypted || 0}
        onSuccess={handleDecryptSuccess}
      />
    </div>
    </ScrollArea>
  );
}