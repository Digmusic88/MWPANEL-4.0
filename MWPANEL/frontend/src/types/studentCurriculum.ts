// Espeja backend student-curriculum.service.ts (CourseCurriculumGroup, SubjectCurriculumView).
export interface CriterionView { id: string; code: string; description: string }
export interface SaberView { id: string; code: string | null; title: string | null; description: string }
export interface CompetencyGroup { id: string; code: string; name: string; criteria: CriterionView[] }
export interface CourseCurriculumGroup { courseId: string; courseName: string; competencies: CompetencyGroup[]; saberes: SaberView[] }
export interface ActiveCourse { courseId: string; courseName: string; validFrom: string }
export interface SubjectCurriculumView { activeCourses: ActiveCourse[]; catalog: CourseCurriculumGroup[] }
export interface CourseOption { id: string; name: string }
