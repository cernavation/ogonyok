export interface ProblemMediaItem {
  bg: string;
  poster: string;
  posterWebp?: string;
  mp4?: string;
  webm?: string;
  width: number;
  height: number;
}

export const PROBLEM_MEDIA: Record<'headThreads' | 'fadedDays' | 'treadmill', ProblemMediaItem> = {
  headThreads: {
    bg: '#000000',
    poster: '/media/landing/problem/problem-head-threads.jpg',
    posterWebp: '/media/landing/problem/problem-head-threads.webp',
    mp4: '/media/landing/problem/problem-head-threads.mp4',
    width: 2752,
    height: 1536,
  },
  fadedDays: {
    bg: '#000000',
    poster: '/media/landing/problem/problem-faded-days.jpg',
    posterWebp: '/media/landing/problem/problem-faded-days.webp',
    mp4: '/media/landing/problem/problem-faded-days.mp4',
    width: 2752,
    height: 1536,
  },
  treadmill: {
    bg: '#000000',
    poster: '/media/landing/problem/problem-treadmill.jpg',
    posterWebp: '/media/landing/problem/problem-treadmill.webp',
    width: 2752,
    height: 1536,
  },
};
