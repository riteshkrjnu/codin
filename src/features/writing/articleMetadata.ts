export const licenceOptions=[
 {value:'CC BY 4.0',label:'Creative Commons Attribution 4.0',url:'https://creativecommons.org/licenses/by/4.0/'},
 {value:'CC BY-SA 4.0',label:'Creative Commons Attribution–ShareAlike 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'},
 {value:'CC BY-ND 4.0',label:'Creative Commons Attribution–NoDerivatives 4.0',url:'https://creativecommons.org/licenses/by-nd/4.0/'},
 {value:'CC BY-NC 4.0',label:'Creative Commons Attribution–NonCommercial 4.0',url:'https://creativecommons.org/licenses/by-nc/4.0/'},
 {value:'CC BY-NC-SA 4.0',label:'Creative Commons Attribution–NonCommercial–ShareAlike 4.0',url:'https://creativecommons.org/licenses/by-nc-sa/4.0/'},
 {value:'CC BY-NC-ND 4.0',label:'Creative Commons Attribution–NonCommercial–NoDerivatives 4.0',url:'https://creativecommons.org/licenses/by-nc-nd/4.0/'},
 {value:'CC0 1.0',label:'CC0 1.0 — Public Domain Dedication',url:'https://creativecommons.org/publicdomain/zero/1.0/'},
 {value:'All rights reserved',label:'All rights reserved',url:''},
 {value:'MIT',label:'MIT (software)',url:'https://opensource.org/license/mit'},
 {value:'Apache-2.0',label:'Apache License 2.0 (software)',url:'https://www.apache.org/licenses/LICENSE-2.0'},
 {value:'ODbL-1.0',label:'Open Database License 1.0 (databases)',url:'https://opendatacommons.org/licenses/odbl/1-0/'},
];
export function suggestedCitation(article:Record<string,any>,origin:string){
 const date=article.articleDate||article.publishedAt||article.createdAt;
 const parsed=date?new Date(date):undefined;
 const year=parsed&&Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('en-IN',{year:'numeric',timeZone:'Asia/Kolkata'}).format(parsed):'n.d.';
 const title=String(article.title||'Untitled article').trim();
 const author=String(article.authors||'CoDIN').trim();
 const url=article.slug?`${origin.replace(/\/$/,'')}/resources/${encodeURIComponent(article.slug)}`:'';
 return `${author} (${year}). ${title}${/[.!?]$/.test(title)?'':'.'} CoDIN Commons.${url?' '+url:''}`;
}
export const indiaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
