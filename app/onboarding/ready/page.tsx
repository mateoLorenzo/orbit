import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

export default function OnboardingListoPage() {
  return (
    <ScaffoldPlaceholder
      routeLabel="Onboarding · Completo"
      title="¡Bien hecho! Ya podés comenzar a aprender"
      description="Pantalla de cierre del onboarding. Dos CTAs: arrancar la primera lección o ir a Mis materias."
      actions={[
        { label: 'Comenzar ahora', href: '/lesson/demo/start' },
        {
          label: 'Ir a Mis materias',
          href: '/',
          variant: 'secondary',
          withArrow: false,
        },
      ]}
    />
  )
}
