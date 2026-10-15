/** One drawing from the cast: its name, its viewBox (x, y, width, height) and the SVG inside it. */
export type Art = {id: string; vb: readonly number[]; svg: string};
