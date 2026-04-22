import { BookOpen, MapPin } from 'lucide-react'
import { useApp } from '@/context/AppContext'

export function CoursesView() {
  const { state } = useApp()
  const { courses } = state

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
          <BookOpen className="h-10 w-10 text-emerald-500/50" />
        </div>
        <h3 className="font-outfit font-bold text-xl mb-1 text-foreground">No courses yet</h3>
        <p className="text-sm text-center max-w-xs">Admins can add Articulate Rise 360 courses from the admin panel</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-outfit font-bold text-3xl mb-6">Training Courses</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-border/40 hover:-translate-y-0.5 flex flex-col"
            onClick={() => window.open(course.riseUrl, '_blank')}
          >
            <div className="relative overflow-hidden">
              {course.image ? (
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full aspect-video object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-emerald-500/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3 className="font-bold text-base leading-snug">{course.title}</h3>
              {course.description && (
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-2">{course.description}</p>
              )}
              {course.location.name && (
                <p className="text-xs text-primary font-medium flex items-center gap-1 mt-auto">
                  <MapPin className="h-3 w-3" />
                  {course.location.name}
                </p>
              )}
              <button
                className="mt-2 w-full rounded-xl text-white text-sm font-semibold py-2 flex items-center justify-center transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, #064e5a 0%, #05979a 60%, #07c5b0 100%)' }}
                onClick={(e) => { e.stopPropagation(); window.open(course.riseUrl, '_blank') }}
              >
                Open Course
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
