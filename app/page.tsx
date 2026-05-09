import { AppProvider } from '@/lib/app-context'
import HomePage from '@/components/home-page'

export default function Page() {
  return (
    <AppProvider>
      <HomePage />
    </AppProvider>
  )
}
