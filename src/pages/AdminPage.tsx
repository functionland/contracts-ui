import { useState } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Tabs,
  Tab,
} from '@mui/material'
import { VestingAdmin } from '@/components/admin/VestingAdmin'
import { AirdropAdmin } from '@/components/admin/AirdropAdmin'
import { TestnetMiningAdmin } from '@/components/admin/TestnetMiningAdmin'
import { TokenAdmin } from '@/components/admin/TokenAdmin'
import { StakingAdmin } from '@/components/admin/StakingAdmin'
import { StakingEngineLinearAdmin } from '@/components/admin/StakingEngineLinearAdmin'
import { StoragePoolAdmin } from '@/components/admin/StoragePoolAdmin'
import { RewardEngineAdmin } from '@/components/admin/RewardEngineAdmin'
import { CONTRACT_TYPES, ContractType } from '@/config/constants'
import { useContractContext } from '@/contexts/ContractContext'
import { ConnectButton } from '@/components/common/ConnectButton'
import { useConnection } from 'wagmi'
import { VersionFooter } from '@/components/common/VersionFooter'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('token')
  const { setActiveContract } = useContractContext()
  const { isConnected } = useConnection()

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue)
    if (newValue !== 'token') {
      setActiveContract(newValue as ContractType)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 8, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Contract Administration
          </Typography>
          <ConnectButton />
        </Box>

        {!isConnected ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Please connect your wallet to access the admin panel
            </Typography>
          </Paper>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="contract admin tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Token" value="token" />
                <Tab label="Distribution" value={CONTRACT_TYPES.VESTING} />
                <Tab label="Airdrop" value={CONTRACT_TYPES.AIRDROP} />
                <Tab label="Testnet Mining" value={CONTRACT_TYPES.TESTNET_MINING} />
                <Tab label="Staking" value={CONTRACT_TYPES.STAKING} />
                <Tab label="VIP Staking" value={CONTRACT_TYPES.STAKING_ENGINE_LINEAR} />
                <Tab label="Storage Pool" value={CONTRACT_TYPES.STORAGE_POOL} />
                <Tab label="Reward Engine" value={CONTRACT_TYPES.REWARD_ENGINE} />
              </Tabs>
            </Box>

            <Paper sx={{ p: 3 }}>
              {activeTab === 'token' && <TokenAdmin />}
              {activeTab === CONTRACT_TYPES.VESTING && <VestingAdmin />}
              {activeTab === CONTRACT_TYPES.AIRDROP && <AirdropAdmin />}
              {activeTab === CONTRACT_TYPES.TESTNET_MINING && <TestnetMiningAdmin />}
              {activeTab === CONTRACT_TYPES.STAKING && <StakingAdmin />}
              {activeTab === CONTRACT_TYPES.STAKING_ENGINE_LINEAR && <StakingEngineLinearAdmin />}
              {activeTab === CONTRACT_TYPES.STORAGE_POOL && <StoragePoolAdmin />}
              {activeTab === CONTRACT_TYPES.REWARD_ENGINE && <RewardEngineAdmin />}
            </Paper>
          </>
        )}
      </Container>

      <VersionFooter />
    </Box>
  )
}
