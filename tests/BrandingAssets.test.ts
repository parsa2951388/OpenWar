import fs from "fs";
import path from "path";
import { expect, test } from "vitest";

const ROOT = path.join(__dirname, "..");
const manifestPath = path.join(ROOT, "resources", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  name: string;
  short_name: string;
  icons: Array<{ src: string }>;
};

test("PWA manifest uses the Open War product identity", () => {
  expect(manifest.name).toBe("Open War");
  expect(manifest.short_name).toBe("Open War");
});

test("every PWA icon path resolves to a shipped asset", () => {
  for (const icon of manifest.icons) {
    const relativePath = icon.src.replace(/^\\/+/, "");
    const assetPath = path.join(ROOT, "resources", relativePath);
    expect(fs.existsSync(assetPath), `Missing PWA icon asset: ${icon.src}`).toBe(true);
  }
});

test("the browser favicon points to the shipped Open War mark", () => {
  const renderHtmlPath = path.join(ROOT, "src", "server", "RenderHtml.ts");
  const renderHtml = fs.readFileSync(renderHtmlPath, "utf8");
  const markPath = path.join(ROOT, "resources", "images", "OpenWarMark.svg");

  expect(renderHtml).toContain('buildAssetUrl("images/OpenWarMark.svg"');
  expect(fs.existsSync(markPath)).toBe(true);
});
