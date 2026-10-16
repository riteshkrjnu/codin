import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function renderMarkdown(md: string, isInverted = false): string {
  if (!md) return "";
  let html = md;
  // Escape HTML tags to prevent XSS (we unescape and safely reconstruct supported elements like iframes, images, and links)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const textColor = isInverted ? "text-paper" : "text-ink";
  const textColorMuted = isInverted ? "text-paper/90" : "text-ink/90";
  const textColorPara = isInverted ? "text-paper/95" : "text-ink/95";
  const linkClass = isInverted
    ? "text-brand-acid hover:text-white underline underline-offset-2 font-medium transition-colors cursor-pointer break-words"
    : "text-brand-blue hover:text-brand-orange underline underline-offset-2 font-medium transition-colors cursor-pointer break-words";

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, `<code class="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[0.85em] ${textColor}">$1</code>`);

  // Bold (**text** or __text__)
  html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

  // Italics (*text* or _text_)
  html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

  // Underline
  html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, "<u>$1</u>");

  // Headings
  html = html.replace(/^### (.*?)$/gm, `<h4 class='font-serif text-lg sm:text-xl font-bold italic ${textColor} mt-4 mb-1.5'>$1</h4>`);
  html = html.replace(/^## (.*?)$/gm, `<h3 class='font-serif text-xl sm:text-2xl font-black italic ${textColor} mt-5 mb-2'>$1</h3>`);
  html = html.replace(/^# (.*?)$/gm, `<h2 class='font-serif text-2xl sm:text-3xl font-black italic ${textColor} mt-6 mb-2.5'>$1</h2>`);

  // Image Markdown: ![text](url) - MUST precede link markdown
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] my-4 flex mx-auto" referrerpolicy="no-referrer" />');

  // Video embed unescaping: restore iframe tags for video players
  html = html.replace(/&lt;iframe(.*?)&gt;&lt;\/iframe&gt;/gi, "<iframe$1></iframe>");

  // Restore safe user-written HTML <a> tags (e.g. <a href="https://...">label</a>)
  html = html.replace(/&lt;a\s+([^&>]*?)href=["']([^"']+)["']([^&>]*?)&gt;(.*?)&lt;\/a&gt;/gi, (_match, _before, rawHref, _after, text) => {
    let href = rawHref.trim().replace(/&amp;/g, "&");
    if (!/^(https?:|\/|#|mailto:|tel:)/i.test(href)) return text;
    const isExternal = /^https?:\/\//i.test(href);
    const targetRel = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${targetRel} class="${linkClass}">${text}</a>`;
  });

  // Markdown hyperlinks: [text](url) or [text](url "title")
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_match, text, rawUrl) => {
    let url = rawUrl.trim().replace(/&amp;/g, "&");
    let titleAttr = "";
    const titleMatch = url.match(/^([^\s]+)\s+["'](.*)["']$/);
    if (titleMatch) {
      url = titleMatch[1];
      titleAttr = ` title="${titleMatch[2]}"`;
    }
    if (/^www\./i.test(url)) {
      url = "https://" + url;
    }
    if (!/^(https?:|\/|#|mailto:|tel:)/i.test(url)) {
      return text;
    }
    const isExternal = /^https?:\/\//i.test(url);
    const targetRel = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${url}"${titleAttr}${targetRel} class="${linkClass}">${text || url}</a>`;
  });

  // Angle-bracket autolinks: <https://example.com> or <mailto:user@domain.com>
  html = html.replace(/&lt;(https?:\/\/[^\s&>]+)&gt;/gi, `<a href="$1" target="_blank" rel="noopener noreferrer" class="${linkClass}">$1</a>`);
  html = html.replace(/&lt;(mailto:[^\s&>]+)&gt;/gi, `<a href="$1" class="${linkClass}">$1</a>`);

  // Standalone bare URLs (e.g. https://domain.com) not preceded by href=" or src="
  html = html.replace(/(^|[^"'\w@])(https?:\/\/[^\s<>"')]+)/gi, (_match, prefix, rawUrl) => {
    let cleanUrl = rawUrl.replace(/&amp;/g, "&");
    let suffix = "";
    while (/[.,;:!?)]$/.test(cleanUrl)) {
      suffix = cleanUrl.slice(-1) + suffix;
      cleanUrl = cleanUrl.slice(0, -1);
    }
    return `${prefix}<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${cleanUrl}</a>${suffix}`;
  });

  // Bullet items
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, `<li class='list-disc ml-5 mb-0.5 font-sans text-sm sm:text-base leading-snug tracking-normal font-normal ${textColorMuted}'>$1</li>`);

  // Numbered list items
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, `<li class='list-decimal ml-5 mb-0.5 font-sans text-sm sm:text-base leading-snug tracking-normal font-normal ${textColorMuted}'>$1</li>`);

  // Handle empty lines as paragraphs or list groupings
  const paragraphs = html.split(/\n\n+/);
  return paragraphs.map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('<li') || trimmed.startsWith('<h') || trimmed.startsWith('<div')) {
      return p;
    }
    return `<p class="mb-2 leading-relaxed font-sans text-sm sm:text-base md:text-lg tracking-normal font-normal ${textColorPara}">${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
}

