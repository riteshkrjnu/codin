/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LoaderProps {
  fullScreen?: boolean;
}

export function BrutalistLoader({ fullScreen = false }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative w-16 h-16 flex items-center justify-center bg-brand-acid border-2 border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity }}
          className="absolute inset-0 border-2 border-dashed border-ink m-1"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-4 h-4 bg-ink"
        />
      </div>
      <motion.div 
        animate={{ opacity: [1, 0.5, 1] }} 
        transition={{ duration: 1.5, repeat: Infinity }}
        className="font-mono text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden whitespace-nowrap"
      >
        Processing...
      </motion.div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-paper/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
