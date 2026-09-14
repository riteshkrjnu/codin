import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function renderMarkdown(md: string, isInverted = false): string {
  if (!md) return "";
  let html = md;
  // Escape HTML tags to prevent XSS (but we will unescape custom supported iframe tags and image tags later)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const textColor = isInverted ? "text-paper" : "text-ink";
  const textColorMuted = isInverted ? "text-paper/90" : "text-ink/90";
  const textColorPara = isInverted ? "text-paper/95" : "text-ink/95";

  // Bold (**text** or __text__)
  html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

  // Italics (*text* or _text_)
  html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

  // Underline
  html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, "<u>$1</u>");

  // Headings
  html = html.replace(/^### (.*?)$/gm, `<h4 class='font-serif text-lg sm:text-xl font-bold italic \${textColor} mt-4 mb-1.5'>$1</h4>`);
  html = html.replace(/^## (.*?)$/gm, `<h3 class='font-serif text-xl sm:text-2xl font-black italic \${textColor} mt-5 mb-2'>$1</h3>`);
  html = html.replace(/^# (.*?)$/gm, `<h2 class='font-serif text-2xl sm:text-3xl font-black italic \${textColor} mt-6 mb-2.5'>$1</h2>`);

  // Image Markdown: ![text](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg border border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] my-4 flex mx-auto" referrerpolicy="no-referrer" />');

  // Video embed unescaping: restore iframe tags for video players
  html = html.replace(/&lt;iframe(.*?)&gt;&lt;\/iframe&gt;/gi, "<iframe$1></iframe>");

  // Bullet items
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, `<li class='list-disc ml-5 mb-0.5 font-sans text-sm sm:text-base leading-snug tracking-normal font-normal \${textColorMuted}'>$1</li>`);

  // Numbered list items
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, `<li class='list-decimal ml-5 mb-0.5 font-sans text-sm sm:text-base leading-snug tracking-normal font-normal \${textColorMuted}'>$1</li>`);

  // Handle empty lines as paragraphs or list groupings
  const paragraphs = html.split(/\n\n+/);
  return paragraphs.map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('<li') || trimmed.startsWith('<h') || trimmed.startsWith('<div')) {
      return p;
    }
    return `<p class="mb-2 leading-relaxed font-sans text-sm sm:text-base md:text-lg tracking-normal font-normal \${textColorPara}">${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
}

