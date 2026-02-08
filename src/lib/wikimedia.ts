/** Récupère une URL d'image Wikimedia Commons pour un sujet éducatif (SVT, etc.) */
export async function fetchImageUrlForTopic(topic: string): Promise<string | null> {
  const query = encodeURIComponent(topic);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${query}&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages || typeof pages !== 'object') return null;
    const first = Object.values(pages)[0] as { imageinfo?: { 0?: { url?: string } } };
    return first?.imageinfo?.[0]?.url ?? null;
  } catch {
    return null;
  }
}
