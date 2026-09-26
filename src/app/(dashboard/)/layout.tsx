export const metadata = {
  title: 'Dashboard',
  description: 'Your task management dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}