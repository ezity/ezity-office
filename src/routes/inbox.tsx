import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { InboxScreen } from '@/screens/inbox/inbox-screen'

export const Route = createFileRoute('/inbox')({
  component: function InboxRoute() {
    usePageTitle('Work Inbox')
    return <InboxScreen />
  },
})
