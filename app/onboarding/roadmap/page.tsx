import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

export default function OnboardingRutaPage() {
  return (
    <ScaffoldPlaceholder
      routeLabel="Onboarding · Revisión de ruta"
      title="Tu ruta de aprendizaje"
      description="Carrusel horizontal de los nodos generados. Es la primera vez que el user ve su roadmap — puede revisar antes de confirmar."
      actions={[{ label: 'Confirmar ruta de aprendizaje', href: '/onboarding/ready' }]}
    />
  )
}
