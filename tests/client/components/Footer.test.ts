import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClientEnv } from "../../../src/client/ClientEnv";
import { Footer } from "../../../src/client/components/Footer";

const SHA = "bf739f86c4e1d2a3b5c6d7e8f90123456789abcd";

describe("page footer", () => {
  let footer: Footer;

  beforeEach(() => {
    if (!customElements.get("page-footer")) {
      customElements.define("page-footer", Footer);
    }
    ClientEnv.reset();
  });

  afterEach(() => {
    footer?.remove();
    delete (window as { BOOTSTRAP_CONFIG?: unknown }).BOOTSTRAP_CONFIG;
    ClientEnv.reset();
  });

  async function mount(): Promise<Footer> {
    footer = document.createElement("page-footer") as Footer;
    document.body.appendChild(footer);
    await footer.updateComplete;
    return footer;
  }

  it("renders the project disclaimer and upstream attribution", async () => {
    await mount();

    expect(footer.textContent).toContain(
      "Open War is an unofficial community fork based on OpenFront.",
    );
    expect(footer.textContent).toContain("© OpenFront and Contributors");
    expect(footer.querySelector(".footer-version")).toBeNull();
  });

  it("links to the project, license, asset credits and upstream source", async () => {
    await mount();

    const links = Array.from(footer.querySelectorAll("a")).map((link) => ({
      label: link.textContent?.trim(),
      href: link.getAttribute("href"),
    }));
    expect(links).toContainEqual({
      label: "Source Code",
      href: "https://github.com/parsa2951388/OpenWar",
    });
    expect(links).toContainEqual({
      label: "License",
      href: "https://github.com/parsa2951388/OpenWar/blob/open-war/independent-self-host/LICENSE",
    });
    expect(links).toContainEqual({
      label: "Asset Credits",
      href: "/asset-credits.html",
    });
    expect(links).toContainEqual({
      label: "Upstream Project",
      href: "https://github.com/openfrontio/OpenFrontIO",
    });
  });

  it("pins the source-code link to the current commit when bootstrap exists", async () => {
    (window as { BOOTSTRAP_CONFIG?: unknown }).BOOTSTRAP_CONFIG = {
      gameEnv: "prod",
      turnstileSiteKey: "",
      jwtAudience: "open-war-8o2.pages.dev",
      gitCommit: SHA,
    };
    await mount();

    expect(footer.querySelector<HTMLAnchorElement>('a[target="_blank"]')?.href).toBe(
      `https://github.com/parsa2951388/OpenWar/tree/${SHA}`,
    );
  });

  it("renders safely before bootstrap is injected", async () => {
    delete (window as { BOOTSTRAP_CONFIG?: unknown }).BOOTSTRAP_CONFIG;
    await expect(mount()).resolves.toBeInstanceOf(Footer);
  });
});
