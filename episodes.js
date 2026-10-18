// Loads episodes from the podcast RSS feed so new episodes appear on the site automatically.
// Usage: <div data-episodes="2"></div> (number = how many to show; "all" for every episode)

const FEED_URL = 'https://anchor.fm/s/111139180/podcast/rss';
const APPLE_LOOKUP_URL = 'https://itunes.apple.com/lookup?id=1890940874&entity=podcastEpisode&limit=200';
const APPLE_SHOW_URL = 'https://podcasts.apple.com/us/podcast/the-odds-against-us/id1890940874';

const SPOTIFY_ICON = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.373 12-12S18.6 0 12 0zm5.462 17.343a.748.748 0 01-1.028.249c-2.818-1.722-6.36-2.111-10.535-1.156a.75.75 0 01-.334-1.463c4.57-1.045 8.492-.595 11.648 1.34a.747.747 0 01.249 1.03zm1.469-3.267a.938.938 0 01-1.286.31c-3.226-1.983-8.148-2.557-11.966-1.4a.938.938 0 01-.543-1.795c4.36-1.323 9.783-.683 13.485 1.6a.937.937 0 01.31 1.285zm.126-3.402C15.784 8.4 8.224 8.161 3.85 9.508a1.125 1.125 0 11-.66-2.15c5.022-1.523 13.351-1.226 18.629 1.955a1.125 1.125 0 11-1.16 1.925z"/></svg>';
const APPLE_ICON = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11"/><circle cx="12" cy="9" r="2.6" fill="#a855f7"/><path d="M12 13c-2.4 0-4.3 1.7-4.3 3.2 0 .4.2.7.6.8 1.1.3 2.5.5 3.7.5s2.6-.2 3.7-.5c.4-.1.6-.4.6-.8 0-1.5-1.9-3.2-4.3-3.2z" fill="#a855f7"/></svg>';

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadEpisodes() {
  const [feedText, apple] = await Promise.all([
    fetch(FEED_URL).then(r => r.text()),
    fetch(APPLE_LOOKUP_URL).then(r => r.json()).catch(() => ({ results: [] })),
  ]);

  // Match Apple episode pages by title
  const appleLinks = {};
  apple.results.forEach(r => { if (r.trackName) appleLinks[r.trackName.trim()] = r.trackViewUrl.replace('&uo=4', ''); });

  const xml = new DOMParser().parseFromString(feedText, 'text/xml');
  const items = [...xml.querySelectorAll('item')];
  return items.map((item, i) => {
    const get = tag => item.getElementsByTagName(tag)[0];
    const title = get('title').textContent.trim();
    const descHtml = get('description')?.textContent || '';
    return {
      number: items.length - i,
      title,
      date: new Date(get('pubDate').textContent).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      description: new DOMParser().parseFromString(descHtml, 'text/html').body.textContent.trim(),
      image: get('itunes:image')?.getAttribute('href') || 'images/podcast-cover-art.jpg',
      spotify: get('link')?.textContent.trim(),
      apple: appleLinks[title] || APPLE_SHOW_URL,
    };
  });
}

function renderEpisode(ep) {
  return `
    <div class="flex gap-4 sm:gap-5 pb-6 border-b border-black/5 reveal in-view card-hover rounded-xl p-3 -m-3">
      <span class="hidden sm:block text-3xl font-black text-black/10 flex-shrink-0 self-center w-8 text-center">${ep.number}</span>
      <div class="img-zoom rounded-lg w-[90px] h-[90px] sm:w-[150px] sm:h-[150px] flex-shrink-0">
        <img src="${ep.image}" class="w-full h-full object-cover" alt="${escapeHtml(ep.title)} artwork" loading="lazy" onerror="this.onerror=null;this.src='images/podcast-cover-art.jpg'">
      </div>
      <div>
        <p class="text-xs text-[#767676] mb-1">${ep.date}</p>
        <h3 class="font-bold text-black text-[15px] mb-2">${escapeHtml(ep.title)}</h3>
        <p class="text-sm text-[#767676] leading-relaxed mb-3 line-clamp-4">${escapeHtml(ep.description)}</p>
        <div class="flex flex-wrap gap-2">
          <a href="${ep.spotify}" target="_blank" rel="noopener" class="btn-pop inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-green-600">${SPOTIFY_ICON}Spotify</a>
          <a href="${ep.apple}" target="_blank" rel="noopener" class="btn-pop inline-flex items-center gap-1.5 bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-purple-600">${APPLE_ICON}Apple Podcasts</a>
        </div>
      </div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const containers = document.querySelectorAll('[data-episodes]');
  if (!containers.length) return;
  try {
    const episodes = await loadEpisodes();
    containers.forEach(el => {
      const n = el.dataset.episodes;
      const list = n === 'all' ? episodes : episodes.slice(0, Number(n));
      el.innerHTML = list.map(renderEpisode).join('');
    });
  } catch (err) {
    containers.forEach(el => {
      el.innerHTML = `<p class="text-sm">Couldn't load episodes right now. <a href="https://open.spotify.com/show/7IZAwHh6cpKbdDobrGSlhC" target="_blank" rel="noopener" class="text-[#FFD900] font-semibold">Listen on Spotify &rarr;</a></p>`;
    });
  }
});
