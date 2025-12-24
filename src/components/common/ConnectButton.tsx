import { useState } from 'react'
import { useConnection, useConnect, useDisconnect, useChainId, useSwitchChain, useConnectors, useChains } from 'wagmi'
import { 
  Button, 
  Menu, 
  MenuItem, 
  Box, 
  Typography, 
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import LogoutIcon from '@mui/icons-material/Logout'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { getNetworkName } from '@/config/chains'
import { formatAddress } from '@/utils/formatters'

export function ConnectButton() {
  const { address, isConnected, connector } = useConnection()
  const connect = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const connectors = useConnectors()
  const chains = useChains()
  const switchChain = useSwitchChain()
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [chainDialogOpen, setChainDialogOpen] = useState(false)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDisconnect = () => {
    disconnect()
    handleMenuClose()
  }

  const handleSwitchChain = (newChainId: number) => {
    switchChain.mutate({ chainId: newChainId })
    setChainDialogOpen(false)
  }

  if (!isConnected) {
    return (
      <>
        <Button
          variant="contained"
          startIcon={connect.isPending ? <CircularProgress size={20} color="inherit" /> : <AccountBalanceWalletIcon />}
          onClick={() => setWalletDialogOpen(true)}
          disabled={connect.isPending}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1,
          }}
        >
          {connect.isPending ? 'Connecting...' : 'Connect Wallet'}
        </Button>

        <Dialog open={walletDialogOpen} onClose={() => setWalletDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogContent>
            {connect.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {connect.error.message}
              </Alert>
            )}
            <List>
              {connectors.map((conn: any) => (
                <ListItem key={conn.uid} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      connect.mutate({ connector: conn })
                      setWalletDialogOpen(false)
                    }}
                    disabled={connect.isPending}
                  >
                    <ListItemIcon>
                      <AccountBalanceWalletIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={conn.name} 
                      secondary={conn.type === 'injected' ? 'Browser Wallet' : undefined}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
              By connecting, you agree to the Terms of Service
            </Typography>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={getNetworkName(chainId)}
          onClick={() => setChainDialogOpen(true)}
          icon={<SwapHorizIcon />}
          variant="outlined"
          sx={{ cursor: 'pointer' }}
        />
        <Button
          variant="outlined"
          onClick={handleMenuOpen}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          {formatAddress(address || '')}
        </Button>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            Connected with {connector?.name}
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => { setChainDialogOpen(true); handleMenuClose(); }}>
          <SwapHorizIcon sx={{ mr: 1 }} /> Switch Network
        </MenuItem>
        <MenuItem onClick={handleDisconnect}>
          <LogoutIcon sx={{ mr: 1 }} /> Disconnect
        </MenuItem>
      </Menu>

      <Dialog open={chainDialogOpen} onClose={() => setChainDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Switch Network</DialogTitle>
        <DialogContent>
          {switchChain.isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <List>
            {chains.map((chain: any) => (
              <ListItem key={chain.id} disablePadding>
                <ListItemButton
                  onClick={() => handleSwitchChain(chain.id)}
                  selected={chain.id === chainId}
                  disabled={switchChain.isPending}
                >
                  <ListItemText 
                    primary={chain.name} 
                    secondary={chain.id === chainId ? 'Connected' : undefined}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  )
}
