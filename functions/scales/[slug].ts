const SCALES: Record<string, { title: string; description: string }> = {
  "c-major": {
    title: "C Major Scale — Notes, Formula & Piano | Music Labs",
    description: "Explore the C major scale: its notes, interval formula and piano pattern in Music Labs' interactive Scale Explorer.",
  },
  "c-dorian": {
    title: "C Dorian Scale — Notes, Formula & Piano | Music Labs",
    description: "Explore the C Dorian scale: its notes, interval formula and piano pattern in Music Labs' interactive Scale Explorer.",
  },
};

export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/\/+$/, "").split("/").pop() || "";
  const seo = SCALES[slug];
  const response = await next();

  if (!seo || !response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }

  const pageUrl = `https://music-labs.pages.dev${url.pathname}`;
  const content = (value: string) => ({
    element(element: Element) {
      element.setAttribute("content", value);
    },
  });

  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(seo.title);
      },
    })
    .on('meta[name="description"]', content(seo.description))
    .on('meta[property="og:title"]', content(seo.title))
    .on('meta[property="og:description"]', content(seo.description))
    .on('meta[property="og:url"]', content(pageUrl))
    .on('meta[name="twitter:title"]', content(seo.title))
    .on('meta[name="twitter:description"]', content(seo.description))
    .on('link[rel="canonical"]', {
      element(element) {
        element.setAttribute("href", pageUrl);
      },
    })
    .transform(response);
};
