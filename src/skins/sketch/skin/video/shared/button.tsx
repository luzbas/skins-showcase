/** @jsxImportSource react */

import { useCallback, useRef, type ComponentProps } from 'react';

import { cn } from '../../lib/resolve-class-name';

import { BoilContext, SketchScribble, SketchSurface, useBoil } from '../sketch/drawing';

export type ButtonProps = ComponentProps<'button'> & {
  /** Sit the button on its own paper disc, for controls over the video. */
  disc?: boolean;
  /** Sit the button on a paper scrap, for text buttons such as a dialog's. */
  paper?: boolean;
  /** Draw the button as a board connector: a paper square with an inner frame. */
  connector?: boolean;
  /** Draw the button as a chip with pin stubs on its sides. */
  chip?: boolean;
  /** Draw the button as a test pad: a paper disc with a second, finer ring inside. */
  pad?: boolean;
};

/**
 * Every control's button. Its lines boil while it is hovered or focused, a pencil loop is drawn
 * around it on hover (red for keyboard focus), and `disc` or `paper` puts it on its own paper.
 */
export function Button({ className, children, disc = false, paper = false, connector = false, chip = false, pad = false, ref, ...props }: ButtonProps) {
  const local = useRef<HTMLButtonElement>(null);
  const frame = useBoil(local);
  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      local.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  return (
    <button
      ref={setRef}
      className={cn(
        'media-button',
        disc && 'media-button-disc',
        paper && 'media-button-paper',
        connector && 'media-button-connector',
        chip && 'media-button-chip',
        pad && 'media-button-disc media-button-pad',
        className
      )}
      {...props}
    >
      <BoilContext.Provider value={frame}>
        {disc && <SketchSurface shape="disc" />}
        {paper && <SketchSurface />}
        {connector && <SketchSurface shape="connector" />}
        {chip && <SketchSurface shape="chip" />}
        {pad && <SketchSurface shape="pad" />}
        <SketchScribble />
        {children}
      </BoilContext.Provider>
    </button>
  );
}
