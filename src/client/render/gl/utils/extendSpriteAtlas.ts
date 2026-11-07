/**
 * Append square SVG sprite cells to a horizontal atlas without changing any
 * existing columns. The source atlases are one-row strips; cell height is the
 * source atlas height and cell width is derived from its original column count.
 */
export async function appendSpriteColumnsToAtlas(
  atlasUrl: string,
  sourceColumns: number,
  spriteUrls: readonly string[],
  imageSmoothingEnabled: boolean,
): Promise<HTMLCanvasElement> {
  if (!Number.isInteger(sourceColumns) || sourceColumns < 1) {
    throw new Error("Sprite atlas must have at least one source column");
  }

  const decode = async (url: string): Promise<HTMLImageElement> => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    await image.decode();
    return image;
  };

  const [atlas, ...sprites] = await Promise.all([
    decode(atlasUrl),
    ...spriteUrls.map(decode),
  ]);
  const cellWidth = atlas.width / sourceColumns;
  if (!Number.isInteger(cellWidth) || cellWidth <= 0 || atlas.height <= 0) {
    throw new Error(
      `Sprite atlas dimensions ${atlas.width}x${atlas.height} do not fit ${sourceColumns} columns`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = atlas.width + cellWidth * sprites.length;
  canvas.height = atlas.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the sprite atlas canvas");
  context.imageSmoothingEnabled = imageSmoothingEnabled;
  context.drawImage(atlas, 0, 0);

  for (let index = 0; index < sprites.length; index++) {
    // Preserve the sprite's aspect ratio (the structure atlas cells are
    // intentionally taller than they are wide). Center it in the cell.
    const sprite = sprites[index];
    const scale = Math.min(
      cellWidth / sprite.naturalWidth,
      atlas.height / sprite.naturalHeight,
    );
    const width = sprite.naturalWidth * scale;
    const height = sprite.naturalHeight * scale;
    const x = atlas.width + index * cellWidth + (cellWidth - width) / 2;
    const y = (atlas.height - height) / 2;
    context.drawImage(sprite, x, y, width, height);
  }

  return canvas;
}
