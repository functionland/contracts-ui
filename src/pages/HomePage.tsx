import { useState, useEffect } from 'react'
import { Tabs, Tab } from '@mui/material'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useContractContext } from '@/contexts/ContractContext'
import { ContractType } from '@/config/contracts'
import { useThemeContext } from '@/contexts/ThemeContext'
import { useAccount, useChainId, useWatchAsset } from 'wagmi'
import { VestingDashboard } from '@/components/vesting/VestingDashboard'
import { ConnectButton } from '@/components/common/ConnectButton'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Stack, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TokenIcon from '@mui/icons-material/Token'
import Shield from '@mui/icons-material/Shield'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { TOKEN_ADDRESSES } from '@/config/contracts'
import { CONTRACT_TYPES } from '@/config/constants'
import { getNetworkName } from '@/config/chains'

interface ManualImportInfo {
  contractAddress?: string;
  symbol: string;
  decimals: number;
  network: string;
}

export default function HomePage() {
  const { isConnected, connector } = useAccount()
  const chainId = useChainId()
  const theme = useTheme()
  const { isDarkMode, toggleTheme } = useThemeContext()
  const [showManualImportModal, setShowManualImportModal] = useState(false)
  const [manualImportInfo, setManualImportInfo] = useState<ManualImportInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { activeContract, setActiveContract } = useContractContext()
  const { watchAsset } = useWatchAsset()

  const getTitle = () => {
    return activeContract === CONTRACT_TYPES.VESTING 
      ? '$FULA Token Vesting Dashboard'
      : activeContract === CONTRACT_TYPES.TESTNET_MINING
        ? 'Testnet Mining Dashboard'
        : '$FULA Airdrop Dashboard'
  }

  const getInstructions = (contractType: typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES]) => {
    const baseInstructions = [
      {
        icon: <AccountBalanceWalletIcon />,
        text: contractType === CONTRACT_TYPES.VESTING 
          ? 'Connect your wallet on Ethereum Mainnet to view your vesting allocations'
          : contractType === CONTRACT_TYPES.TESTNET_MINING
          ? 'Connect your wallet on SKALE Network to view your testnet mining allocations'
          : 'Connect your wallet on IOTEX Network to view your airdrop allocations'
      },
      {
        icon: <AccessTimeIcon />,
        text: 'Import $FULA token in your wallet by clicking here',
        action: () => { 
          const tokenAddress = TOKEN_ADDRESSES[chainId] || "Unsupported"
          const networkName = getNetworkName(chainId)

          const manualInfo = {
            contractAddress: tokenAddress,
            symbol: 'FULA',
            decimals: 18,
            network: networkName
          }
    
          if (watchAsset && (connector?.name === 'MetaMask' || connector?.name === 'Injected')) { 
            return {
              type: 'watchAsset',
              handler: async (setManualImportInfoFn: Function, setShowManualImportModalFn: Function) => {
                try {
                  await watchAsset({
                    type: 'ERC20',
                    options: {
                      address: tokenAddress as `0x${string}`,
                      symbol: 'FULA',
                      decimals: 18,
                    },
                  })
                } catch (error) {
                  console.error('Error adding token via watchAsset:', error)
                  setManualImportInfoFn(manualInfo)
                  setShowManualImportModalFn(true)
                }
              }
            }
          }
          return {
            type: 'manual',
            info: manualInfo
          }
        }
      },
      {
        icon: <TokenIcon />,
        text: contractType === CONTRACT_TYPES.VESTING 
          ? 'Claim your vested tokens once they become available after the cliff period'
          : contractType === CONTRACT_TYPES.TESTNET_MINING
          ? 'Enter your Blox Account Id to claim your testnet mining rewards'
          : 'Claim your airdrop tokens according to the vesting schedule. Note that the maximum you can claim is equal to whatever $FULA you already have in your wallet.'
      },
      {
        icon: <Shield />,
        text: 'Transfer your tokens to a secure wallet after claiming'
      }
    ]

    return baseInstructions
  }

  useEffect(() => {
    const type = searchParams.get('type')
    if (type && (type === CONTRACT_TYPES.VESTING || type === CONTRACT_TYPES.AIRDROP || type === CONTRACT_TYPES.TESTNET_MINING) && type !== activeContract) {
      setActiveContract(type)
    } else if (!type && activeContract) {
      navigate(`?type=${activeContract}`, { replace: true })
    }
  }, [searchParams, activeContract, setActiveContract, navigate])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: theme.palette.background.default
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  const instructions = getInstructions(activeContract)
  const handleTabChange = (_: React.SyntheticEvent, newValue: typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES]) => {
    if (newValue !== activeContract) {
      setActiveContract(newValue)
      navigate(`?type=${newValue}`, { replace: true })
    }
  }  

  return (
    <ErrorBoundary>
      <Box sx={{ 
        bgcolor: theme.palette.background.default,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          flex: 1,
          py: 4,
          backgroundImage: `linear-gradient(to bottom, ${
            isDarkMode 
              ? 'rgba(18, 18, 18, 0.8), rgba(45, 45, 45, 0.9)'
              : 'rgba(243, 244, 246, 0.8), rgba(255, 255, 255, 0.9)'
          })`
        }}>
          <Container maxWidth="lg">
            <Paper sx={{ 
              p: 4,
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              boxShadow: theme.shadows[1]
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 4
              }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 'bold',
                    background: isDarkMode
                      ? 'linear-gradient(to right, #90caf9, #42a5f5)'
                      : 'linear-gradient(to right, #1976d2, #64b5f6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {getTitle()}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <IconButton 
                    onClick={toggleTheme}
                    sx={{ 
                      bgcolor: theme.palette.primary.main + '20',
                      '&:hover': {
                        bgcolor: theme.palette.primary.main + '30',
                      }
                    }}
                  >
                    {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                  <Box sx={{ position: 'relative', width: 40, height: 40 }}>
                    <img
                      src="/images/logo.png"
                      alt="Logo"
                      style={{ objectFit: 'contain', width: 40, height: 40 }}
                    />
                  </Box>
                </Box>
              </Box>
              
              <Divider sx={{ 
                mb: 4,
                borderColor: isDarkMode ? theme.palette.grey[700] : theme.palette.divider
              }} />

              <Box sx={{ mb: 4 }}>
                <Tabs 
                  value={activeContract}
                  onChange={handleTabChange}
                  centered
                  sx={{
                    '& .MuiTab-root': {
                      color: theme.palette.text.secondary,
                      '&.Mui-selected': {
                        color: theme.palette.primary.main
                      }
                    }
                  }}
                >
                  <Tab 
                    value={CONTRACT_TYPES.VESTING} 
                    label="Token Distribution" 
                  />
                  <Tab 
                    value={CONTRACT_TYPES.AIRDROP} 
                    label="Airdrop" 
                  />
                  <Tab 
                    value={CONTRACT_TYPES.TESTNET_MINING} 
                    label="Testnet Mining" 
                  />
                </Tabs>
              </Box>
              
              <ClientOnly>
                {!isConnected ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    px: 4,
                    bgcolor: theme.palette.background.default,
                    borderRadius: 2
                  }}>
                    <Stack spacing={3} alignItems="center">
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: theme.palette.text.secondary,
                          maxWidth: 'sm',
                          mb: 2
                        }}
                      >
                        Connect your wallet to view your vesting details
                      </Typography>
                      <ConnectButton />
                    </Stack>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 2,
                      px: 2,
                      bgcolor: theme.palette.background.default,
                      borderRadius: 2,
                      transition: 'opacity 0.3s ease-in-out'
                    }}>
                      <Stack spacing={0} alignItems="center">
                        <ConnectButton />
                      </Stack>
                    </Box>
                    <VestingDashboard />
                  </>
                )}
              </ClientOnly>
            </Paper>
          </Container>
        </Box>

        <Box sx={{ 
          bgcolor: isDarkMode ? theme.palette.grey[900] : theme.palette.primary.main,
          color: theme.palette.common.white,
          py: 6,
          mt: 4
        }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                How to Use the Vesting Dashboard
              </Typography>
              <Typography variant="subtitle1" color="rgba(255, 255, 255, 0.8)">
                Works on both desktop and mobile browsers with wallet extensions
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(4, 1fr)',
              },
              gap: 3
            }}>
              {instructions.map((instruction, index) => (
                <Paper 
                  key={index} 
                  sx={{ 
                    p: 4, 
                    bgcolor: isDarkMode 
                      ? theme.palette.grey[900]
                      : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: isDarkMode ? 'none' : 'blur(10px)',
                    color: theme.palette.common.white,
                    cursor: instruction.action ? 'pointer' : 'default',
                    transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
                    '&:hover': instruction.action ? {
                      transform: 'translateY(-2px)',
                      bgcolor: isDarkMode 
                        ? theme.palette.grey[800]
                        : 'rgba(255, 255, 255, 0.15)',
                    } : {}
                  }}
                  onClick={async () => {
                    if (instruction.action) {
                      const result = instruction.action() 
                      if (result.type === 'watchAsset' && result.handler) {
                        await result.handler(setManualImportInfo, setShowManualImportModal)
                      } else if (result.type === 'manual' && result.info) {
                        setManualImportInfo(result.info)
                        setShowManualImportModal(true)
                      }
                    }
                  }}
                >
                  <Stack 
                    direction="row" 
                    spacing={1} 
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Box sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      p: 1,
                      borderRadius: '50%'
                    }}>
                      {instruction.icon}
                    </Box>
                    <Typography variant="h6">
                      Step {index + 1}
                    </Typography>
                  </Stack>
                  <Typography>
                    {instruction.text}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Container>
        </Box>

        <Dialog 
          open={showManualImportModal} 
          onClose={() => setShowManualImportModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Manual Token Import</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
              To import FULA token manually, add these details to your wallet:
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Contract Address" 
                  secondary={manualImportInfo?.contractAddress} 
                  secondaryTypographyProps={{ 
                    sx: { wordBreak: 'break-all' } 
                  }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Symbol" 
                  secondary={manualImportInfo?.symbol} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Decimals" 
                  secondary={manualImportInfo?.decimals} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Network" 
                  secondary={manualImportInfo?.network} 
                />
              </ListItem>
            </List>
          </DialogContent>
        </Dialog>
      </Box>
    </ErrorBoundary>
  )
}
