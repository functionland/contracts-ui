import { Routes, Route } from 'react-router-dom'
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { useThemeContext } from './contexts/ThemeContext'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'

function ThemedApp() {
  const { isDarkMode } = useThemeContext()

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      background: {
        default: isDarkMode ? '#121212' : '#fff',
        paper: isDarkMode ? '#1e1e1e' : '#fff',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDarkMode ? '#121212' : '#fff',
            color: isDarkMode ? '#fff' : '#000',
          },
        },
      },
    },
  })

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </MuiThemeProvider>
  )
}

export default function App() {
  return <ThemedApp />
}
