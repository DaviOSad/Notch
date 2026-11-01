import GoalCard from './GoalCard'

export default function GoalsCarousel({ goals, onManageFunds, onDeleteGoal }) {
  if (goals.length === 0) return null

  return (
    <section aria-labelledby="metas-titulo" className="w-full min-w-0">
      <h2 id="metas-titulo" className="mb-4 font-display text-xl font-bold tracking-tight">Caixinhas & Metas</h2>
      <div className="custom-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-3 md:mx-0 md:scroll-px-0 md:px-0">
        {goals.map((goal, idx) => (
          <GoalCard
            key={`goal-${goal.id}-${idx}`}
            goal={goal}
            onManageFunds={onManageFunds}
            onDeleteGoal={onDeleteGoal}
          />
        ))}
      </div>
    </section>
  )
}
