import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GenerateWallet } from './GenerateWallet';
import { ImportWallet } from './ImportWallet';
import { PasswordSetup } from './PasswordSetup';
import { Wallet as WalletIcon, Plus, Download, Info } from 'lucide-react';
import { Wallet } from '../types/wallet';

interface WelcomeScreenProps {
  onWalletCreated: (wallet: Wallet) => void;
}

export function WelcomeScreen({ onWalletCreated }: WelcomeScreenProps) {
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [pendingWallet, setPendingWallet] = useState<Wallet | null>(null);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  
  // Check if there are existing wallets
  const hasExistingWallets = () => {
    const storedWallets = localStorage.getItem('wallets');
    return storedWallets && JSON.parse(storedWallets).length > 0;
  };

  const handleWalletGenerated = (wallet: Wallet) => {
    setPendingWallet(wallet);
    setShowPasswordSetup(true);
  };

  const handlePasswordSet = (wallet: Wallet) => {
    setShowPasswordSetup(false);
    setPendingWallet(null);
    onWalletCreated(wallet);
  };

  const handleBackToWalletCreation = () => {
    setShowPasswordSetup(false);
    setPendingWallet(null);
  };

  if (showPasswordSetup && pendingWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <PasswordSetup
          wallet={pendingWallet}
          onPasswordSet={handlePasswordSet}
          onBack={handleBackToWalletCreation}
        />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <WalletIcon className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome to Octra Wallet</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Your secure gateway to the Octra blockchain
          </p>
          {hasExistingWallets() && (
            <Alert className="max-w-md mx-auto mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have existing wallets. Creating or importing a new wallet will add it to your collection.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm max-h-[80vh] flex flex-col">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">
              {hasExistingWallets() ? 'Add Another Wallet' : 'Get Started'}
            </CardTitle>
            <p className="text-muted-foreground">
              {hasExistingWallets() 
                ? 'Create a new wallet or import an existing one to add to your collection'
                : 'Create a new wallet or import an existing one to begin'
              }
            </p>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="generate" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Wallet
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Import Wallet
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generate" className="flex-1 min-h-0">
                <ScrollArea className="h-full max-h-[50vh]">
                  <div className="space-y-4 pr-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-2">Create New Wallet</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate a brand new wallet with a secure mnemonic phrase
                      </p>
                    </div>
                    <GenerateWallet onWalletGenerated={handleWalletGenerated} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="import" className="flex-1 min-h-0">
                <ScrollArea className="h-full max-h-[50vh]">
                  <div className="space-y-4 pr-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-2">Import Existing Wallet</h3>
                      <p className="text-sm text-muted-foreground">
                        Restore your wallet using a private key or mnemonic phrase
                      </p>
                    </div>
                    <ImportWallet onWalletImported={handleWalletGenerated} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            By using Octra Wallet, you agree to our terms of service and privacy policy.
          </p>
          <p className="mt-2">
            Always keep your private keys and mnemonic phrase secure and never share them with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}