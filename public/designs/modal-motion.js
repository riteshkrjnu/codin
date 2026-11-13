/* Move only the panel surface; text and media always retain their natural proportions. */
(() => {
  'use strict';
  let active = null;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sourceFor = trigger => trigger?.closest('.media-card, .follow-card, .feed-row, .progress-row, .diary-event') || trigger;
  const ease = 'cubic-bezier(.22,1,.36,1)';
  function sourceTransform(source, target) {
    if (!source?.isConnected) return null;
    const r = source.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return null;
    return `translate(${r.left - target.left}px, ${r.top - target.top}px) scale(${r.width / target.width}, ${r.height / target.height})`;
  }
  window.CoDINModal = {
    open(title, body, trigger = document.activeElement) {
      if (active) return active;
      const source = sourceFor(trigger);
      const dialog = document.createElement('dialog');
      dialog.className = 'media-dialog';
      dialog.dataset.motion = 'opening';
      dialog.setAttribute('aria-labelledby', 'dialog-title');
      dialog.innerHTML = `<div class="modal-content"><button class="dialog-close" autofocus aria-label="Close details">×</button><h2 id="dialog-title">${title}</h2>${body}</div>`;
      const content = dialog.querySelector('.modal-content');
      const previousOverflow = document.body.style.overflow;
      let surface = null, entry = [], closingPromise = null;
      document.body.append(dialog);
      document.body.style.overflow = 'hidden';
      dialog.showModal();
      // Native autofocus may scroll a long media dialog to its close control.
      dialog.scrollTop = 0;
      active = dialog;
      const bounds = dialog.getBoundingClientRect();
      const canAnimate = !reduced() && typeof dialog.animate === 'function';
      function makeSurface() {
        if (surface) return surface;
        surface = document.createElement('div');
        surface.className = 'modal-morph-surface';
        surface.setAttribute('aria-hidden', 'true');
        Object.assign(surface.style, {left:`${bounds.left}px`, top:`${bounds.top}px`, width:`${bounds.width}px`, height:`${bounds.height}px`});
        dialog.prepend(surface);
        return surface;
      }
      if (canAnimate) {
        dialog.classList.add('is-morphing', 'is-opening');
        const shell = makeSurface();
        entry.push(shell.animate([
          {transform:sourceTransform(source, bounds) || 'translate(0, 12px) scale(1, .98)', opacity:.55},
          {transform:'translate(0, 0) scale(1, 1)', opacity:1}
        ], {duration:440, easing:ease, fill:'both'}));
        // Content crossfades into a moving surface; never stretch letters, photos or controls.
        entry.push(content.animate([
          {opacity:0, transform:'translateY(6px)'}, {opacity:1, transform:'translateY(0)'}
        ], {duration:280, delay:160, easing:'ease-out', fill:'both'}));
        if (source) entry.push(source.animate([{opacity:1},{opacity:0}], {duration:180, easing:'ease-out', fill:'both'}));
        Promise.all(entry.map(a=>a.finished.catch(()=>{}))).then(()=>{
          if (closingPromise) return;
          source?.classList.add('is-modal-source');
          dialog.classList.remove('is-morphing', 'is-opening');
          surface?.remove(); surface = null;
          entry.forEach(a=>a.cancel()); entry = [];
          dialog.dataset.motion = 'open';
        });
      } else { source?.classList.add('is-modal-source'); dialog.dataset.motion = 'open'; }
      dialog.requestClose = () => {
        if (closingPromise) return closingPromise;
        closingPromise = (async () => {
          dialog.querySelectorAll('video,audio').forEach(media=>media.pause());
          const shell = canAnimate ? makeSurface() : null;
          // Capture an interrupted entry before cancelling so a rapid Escape cannot snap.
          const shellStyle = shell ? getComputedStyle(shell) : null;
          const shellTransform = shellStyle?.transform || 'none';
          const shellOpacity = shellStyle?.opacity || '1';
          const contentOpacity = getComputedStyle(content).opacity;
          const contentTransform = getComputedStyle(content).transform;
          const sourceOpacity = source ? getComputedStyle(source).opacity : '0';
          entry.forEach(a=>a.cancel()); entry = [];
          source?.classList.add('is-modal-source');
          dialog.classList.remove('is-opening');
          dialog.classList.add('is-closing', 'is-morphing');
          dialog.dataset.motion = 'closing';
          if (canAnimate && !reduced()) {
            const to = sourceTransform(source, bounds);
            const exit = [
              shell.animate([
                {transform:shellTransform === 'none' ? 'translate(0, 0) scale(1, 1)' : shellTransform, opacity:shellOpacity},
                {transform:to || 'translate(0, 12px) scale(1, .98)', opacity:0}
              ], {duration:360, easing:'cubic-bezier(.4,0,.2,1)', fill:'both'}),
              content.animate([
                {opacity:contentOpacity, transform:contentTransform}, {opacity:0, transform:'translateY(6px)'}
              ], {duration:140, easing:'ease-out', fill:'both'})
            ];
            if (source) exit.push(source.animate([{opacity:sourceOpacity},{opacity:1}], {duration:180, delay:180, easing:'ease-in-out', fill:'both'}));
            await Promise.all(exit.map(a=>a.finished.catch(()=>{})));
            source?.classList.remove('is-modal-source');
            exit.forEach(a=>a.cancel());
          }
          source?.classList.remove('is-modal-source');
          dialog.close(); dialog.remove();
          document.body.style.overflow = previousOverflow;
          active = null;
          const returnFocus = trigger?.isConnected ? trigger : source?.querySelector('button,a');
          returnFocus?.focus({preventScroll:true});
        })();
        return closingPromise;
      };
      dialog.querySelector('.dialog-close').onclick = () => dialog.requestClose();
      dialog.addEventListener('cancel', event=>{event.preventDefault();dialog.requestClose();});
      dialog.addEventListener('click', event=>{
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.requestClose();
      });
      return dialog;
    }
  };
})();
