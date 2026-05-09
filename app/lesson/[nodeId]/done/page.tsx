import ScaffoldPlaceholder from '@/components/scaffold/scaffold-placeholder'

export default function LessonDonePage() {
  return (
    <ScaffoldPlaceholder
      routeLabel="Lección · Completa"
      title="Lección completada"
      description="Pantalla de cierre con el reward visual y la opción de continuar a la siguiente lección o volver al roadmap."
      actions={[{ label: 'Volver al inicio', href: '/' }]}
    />
  )
}
