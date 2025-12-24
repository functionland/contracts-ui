import { Box, Typography, useTheme } from '@mui/material'
import { useThemeContext } from '@/contexts/ThemeContext'
import packageJson from '../../../package.json'

const version = packageJson.version

export function VersionFooter() {
  const theme = useTheme()
  const { isDarkMode } = useThemeContext()

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        textAlign: 'center',
        bgcolor: isDarkMode ? theme.palette.grey[900] : theme.palette.grey[100],
        borderTop: `1px solid ${isDarkMode ? theme.palette.grey[800] : theme.palette.grey[300]}`,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.text.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <span>Version {version}</span>
        <span>•</span>
        <span suppressHydrationWarning>
          {new Date().toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}{' '}
          UTC
        </span>
      </Typography>
    </Box>
  )
}
