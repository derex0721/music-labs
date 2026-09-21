type ContentType = 'courses' | 'events' | 'notes';

type CommunityItem = {
  id: string;
  slug: string;
  creatorId: string;
  creatorName?: string;
  coverImage?: string;
  title: string;
  status: 'published';
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

// Public V3.0 content is intentionally small while submissions are reviewed by email.
// When volume requires it, this API boundary can read the same fields from D1 without
// changing the directory clients. Do not put unpublished submissions in this response.
const published: Record<ContentType, CommunityItem[]> = { courses: [], events: [], notes: [] };
const types = new Set<ContentType>(['courses', 'events', 'notes']);

export const onRequestGet: PagesFunction = async ({request}) => {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as ContentType;
  if (!types.has(type)) return Response.json({ok:false,message:'Unknown content type.'},{status:400});
  const rawLimit = Number(url.searchParams.get('limit') || 12);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(24, Math.floor(rawLimit))) : 12;
  const slug = url.searchParams.get('slug') || '';
  let items = published[type].filter((item) => item.status === 'published');
  if (type === 'events') items = items.filter((item) => new Date(String(item.startDateTime)) > new Date()).sort((a,b) => String(a.startDateTime).localeCompare(String(b.startDateTime)));
  else items = [...items].sort((a,b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  if (slug) items = items.filter((item) => item.slug === slug);
  return Response.json({ok:true,items:items.slice(0,limit),meta:{limit,nextCursor:null}},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
};
