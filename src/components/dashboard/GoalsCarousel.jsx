import GoalCard from './GoalCard'

export default function GoalsCarousel({ goals, onManageFunds, onDeleteGoal }) {
  if (goals.length === 0) return null

  return (
    <section className="w-full mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Caixinhas & Metas</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory custom-scrollbar">
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
