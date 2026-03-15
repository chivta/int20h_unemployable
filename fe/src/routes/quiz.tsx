import { createFileRoute } from '@tanstack/react-router'
import { QuizPage } from '../modules/user'

export const Route = createFileRoute('/quiz')({
  component: QuizPage,
})
