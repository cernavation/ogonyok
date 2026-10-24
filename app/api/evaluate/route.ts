import { POST as aiEvaluatePost } from '@/app/api/ai/evaluate/route'

export async function POST(request: Request) {
  return aiEvaluatePost(request)
}
