import { useState } from 'react';

/** Optional cover/portrait. Failed external media falls back without changing the stored URL. */
export default function RecordImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState<string | undefined>();
  return src && failed !== src
    ? <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={() => setFailed(src)}/>
    : <span className="record-image-fallback" role="img" aria-label={`${alt} — image unavailable`}><span aria-hidden="true">{alt.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('')}</span></span>;
}
