import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, AlertTriangle, CheckCircle, ExternalLink, Copy, Loader2, Search } from 'lucide-react';
import { Wallet } from '../types/wallet';
import { registerDomain, lookupDomain, lookupAddress, isValidDomainFormat, getAddressDomains } from '../utils/domainApi';
import { fetchBalance } from '../utils/api';
import { useToast } from '@/hooks/use-toast';

interface RegisterDomainProps {
  wallet: Wallet | null;
  onTransactionSuccess: () => void;
}

export function RegisterDomain({ wallet, onTransactionSuccess }: RegisterDomainProps) {
  const [domainName, setDomainName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [domainStatus, setDomainStatus] = useState<'available' | 'taken' | 'invalid' | null>(null);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [registeredDomains, setRegisteredDomains] = useState<Array<{ domain: string; registeredAt: number }>>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [result, setResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const { toast } = useToast();

  // Fetch registered domains when wallet changes
  useEffect(() => {
    const fetchRegisteredDomains = async () => {
      if (!wallet) return;
      
      setIsLoadingDomains(true);
      try {
        const [domainsData, balanceData] = await Promise.all([
          getAddressDomains(wallet.address),
          fetchBalance(wallet.address)
        ]);
        setRegisteredDomains(domainsData.domains);
        setCurrentBalance(balanceData.balance);
      } catch (error) {
        console.error('Failed to fetch registered domains:', error);
      } finally {
        setIsLoadingDomains(false);
      }
    };

    fetchRegisteredDomains();
  }, [wallet]);

  const fullDomain = domainName ? `${domainName}.oct` : '';

  const checkDomainAvailability = async (domain: string) => {
    if (!domain) {
      setDomainStatus(null);
      return;
    }

    const fullDomainName = `${domain}.oct`;
    
    if (!isValidDomainFormat(fullDomainName)) {
      setDomainStatus('invalid');
      return;
    }

    setIsChecking(true);
    try {
      const lookup = await lookupDomain(fullDomainName);
      setDomainStatus(lookup.found ? 'taken' : 'available');
    } catch (error) {
      console.error('Error checking domain:', error);
      setDomainStatus(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDomainChange = (value: string) => {
    setDomainName(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setResult(null);
    
    // Debounce domain check
    const timeoutId = setTimeout(() => {
      checkDomainAvailability(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleRegister = async () => {
    if (!wallet) {
      toast({
        title: "Error",
        description: "No wallet connected",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough balance (0.5 OCT + fee)
    if (currentBalance !== null && currentBalance < 0.501) {
      toast({
        title: "Insufficient Balance",
        description: "You need at least 0.501 OCT to register a domain (0.5 OCT fee + transaction cost)",
        variant: "destructive",
      });
      return;
    }

    if (!domainName || domainStatus !== 'available') {
      toast({
        title: "Error",
        description: "Please enter a valid and available domain name",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    setResult(null);

    try {
      const registrationResult = await registerDomain({
        domain: fullDomain,
        ownerAddress: wallet.address,
        privateKey: wallet.privateKey
      });

      setResult(registrationResult);

      if (registrationResult.success) {
        toast({
          title: "Domain Registered!",
          description: `Successfully registered ${fullDomain}`,
        });
        
        // Reset form
        setDomainName('');
        setDomainStatus(null);
        
        // Refresh registered domains list
        const domainsData = await getAddressDomains(wallet.address);
        setRegisteredDomains(domainsData.domains);
        
        // Update balance
        const balanceData = await fetchBalance(wallet.address);
        setCurrentBalance(balanceData.balance);
        
        onTransactionSuccess();
      } else {
        toast({
          title: "Registration Failed",
          description: registrationResult.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: "Failed to register domain",
        variant: "destructive",
      });
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupInput.trim()) return;

    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const input = lookupInput.trim();
      
      if (input.endsWith('.oct')) {
        // Domain lookup
        const result = await lookupDomain(input);
        setLookupResult({
          type: 'domain',
          input: input,
          found: result.found,
          address: result.address
        });
      } else if (input.startsWith('oct')) {
        // Address lookup (reverse)
        const result = await lookupAddress(input);
        setLookupResult({
          type: 'address',
          input: input,
          found: result.found,
          domain: result.domain
        });
      } else {
        toast({
          title: "Invalid Input",
          description: "Please enter a valid OCT domain (.oct) or OCT address",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: "Failed to lookup domain/address",
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

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

  const getStatusColor = () => {
    switch (domainStatus) {
      case 'available': return 'text-green-600';
      case 'taken': return 'text-red-600';
      case 'invalid': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (domainStatus) {
      case 'available': return 'Available';
      case 'taken': return 'Already taken';
      case 'invalid': return 'Invalid format';
      default: return '';
    }
  };

  if (!wallet) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No wallet available. Please generate or import a wallet first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollArea className="max-h-[80vh]">
      <div className="space-y-6 pr-4">
      {/* Registered Domains List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            My Registered Domains
            {registeredDomains.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {registeredDomains.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDomains ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Loading your domains...</div>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : registeredDomains.length === 0 ? (
            <Alert>
              <div className="flex items-start space-x-3">
                <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <AlertDescription>
                  You haven't registered any domains yet. Register your first domain below!
                </AlertDescription>
              </div>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                You have {registeredDomains.length} registered domain{registeredDomains.length !== 1 ? 's' : ''}
              </div>
              
              {registeredDomains.map((domainData, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <div className="font-mono font-medium text-lg">
                      {domainData.domain}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Registered: {new Date(domainData.registeredAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(domainData.domain, 'Domain')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Register OCT Domain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <div className="flex items-start space-x-3">
              <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <AlertDescription>
                Register a memorable domain name for your OCT address. Domain registration costs 0.5 OCT plus a small transaction fee.
              </AlertDescription>
            </div>
          </Alert>

          {/* Balance Check and Faucet Link */}
          {currentBalance !== null && currentBalance < 0.501 && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/50 dark:border-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <div className="space-y-2">
                  <div>
                    Insufficient balance for domain registration. You need at least 0.501 OCT.
                  </div>
                  <div>
                    Current balance: <span className="font-mono font-bold">{currentBalance.toFixed(8)} OCT</span>
                  </div>
                  <div>
                    <a 
                      href="https://oct-faucet.xme.my.id" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
                    >
                      Get free OCT from faucet
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  id="domain"
                  placeholder="myname"
                  value={domainName}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  .oct
                </span>
              </div>
              {isChecking && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            
            {domainStatus && (
              <div className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              • 3-32 characters • Letters, numbers, and hyphens only • Cannot start/end with hyphen
            </div>
          </div>

          {/* Preview */}
          {fullDomain && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-2">Preview:</div>
              <div className="font-mono text-lg">{fullDomain}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Will resolve to: {wallet.address}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Registration cost: <span className="font-bold">0.5 OCT</span> + transaction fee
              </div>
            </div>
          )}

          {/* Registration Result */}
          {result && (
            <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200 dark:bg-green-950/50 dark:border-green-800' : 'bg-red-50 border border-red-200 dark:bg-red-950/50 dark:border-red-800'}`}>
              <div className="flex items-start space-x-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {result.success ? 'Domain Registered Successfully!' : 'Registration Failed'}
                  </p>
                  {result.success && result.txHash && (
                    <div className="mt-2">
                      <p className="text-green-700 dark:text-green-300 text-sm">Transaction Hash:</p>
                      <div className="flex flex-col sm:flex-row sm:items-center mt-1 space-y-1 sm:space-y-0 sm:space-x-2">
                        <code className="text-xs bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded font-mono break-all text-green-800 dark:text-green-200 flex-1">
                          {result.txHash}
                        </code>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(result.txHash!, 'Transaction Hash')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <a
                            href={`https://octrascan.io/tx/${result.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-6 w-6 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="View on OctraScan"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {result.error && (
                    <p className="text-red-700 dark:text-red-300 text-sm mt-1 break-words">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleRegister}
            disabled={
              isRegistering || 
              !domainName || 
              domainStatus !== 'available' ||
              (currentBalance !== null && currentBalance < 0.501)
            }
            className="w-full"
            size="lg"
          >
            {isRegistering ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering Domain...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Register {fullDomain} (0.5 OCT)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Domain Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Domain Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lookup">Search Domain or Address</Label>
            <div className="flex space-x-2">
              <Input
                id="lookup"
                placeholder="example.oct or oct1234..."
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleLookup}
                disabled={isLookingUp || !lookupInput.trim()}
                variant="outline"
              >
                {isLookingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {lookupResult && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-2">
                {lookupResult.type === 'domain' ? 'Domain Lookup Result:' : 'Address Lookup Result:'}
              </div>
              
              {lookupResult.found ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Found</span>
                  </div>
                  
                  {lookupResult.type === 'domain' && (
                    <div>
                      <div className="text-xs text-muted-foreground">Resolves to:</div>
                      <div className="font-mono text-sm break-all">{lookupResult.address}</div>
                    </div>
                  )}
                  
                  {lookupResult.type === 'address' && lookupResult.domain && (
                    <div>
                      <div className="text-xs text-muted-foreground">Domain:</div>
                      <div className="font-mono text-sm">{lookupResult.domain}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-600">
                    {lookupResult.type === 'domain' ? 'Domain not registered' : 'No domain found for this address'}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </ScrollArea>
  );
}