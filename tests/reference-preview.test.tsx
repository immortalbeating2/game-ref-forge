// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReferencePreview } from "../app/workspace/reference-preview";
import { makeReference } from "./fixtures/backup";

afterEach(cleanup);

describe("ReferencePreview", () => {
  it("keeps category art under an available remote preview", () => {
    const { container } = render(
      <ReferencePreview
        reference={makeReference({
          preview_url: "https://example.com/preview.jpg",
          asset_category: "character",
        })}
        language="en"
      />,
    );

    expect(
      container
        .querySelector('[data-reference-art="character"] img.reference-preview__local')
        ?.getAttribute("src"),
    ).toBe("/art/reference-character.svg");
    expect(
      container
        .querySelector("img.reference-preview__remote")
        ?.getAttribute("src"),
    ).toBe("https://example.com/preview.jpg");
  });

  it("uses category art when the remote preview is absent", () => {
    const { container } = render(
      <ReferencePreview
        reference={makeReference({
          preview_url: null,
          asset_category: "ui_hud",
        })}
        language="en"
      />,
    );

    expect(
      container
        .querySelector('[data-reference-art="ui_hud"] img')
        ?.getAttribute("src"),
    ).toBe("/art/reference-ui-hud.svg");
    expect(container.querySelector("img.reference-preview__remote")).toBeNull();
  });

  it("falls back after an error and retries when the URL changes", () => {
    const broken = makeReference({
      preview_url: "https://example.com/broken.jpg",
      asset_category: "material_texture",
    });
    const { container, rerender } = render(
      <ReferencePreview reference={broken} language="en" />,
    );

    fireEvent.error(
      container.querySelector("img.reference-preview__remote") as HTMLImageElement,
    );

    expect(container.querySelector("img.reference-preview__remote")).toBeNull();
    expect(
      container
        .querySelector("img.reference-preview__local")
        ?.getAttribute("src"),
    ).toBe("/art/reference-material-texture.svg");

    rerender(
      <ReferencePreview
        reference={{
          ...broken,
          preview_url: "https://example.com/fixed.jpg",
        }}
        language="en"
      />,
    );

    expect(
      container
        .querySelector("img.reference-preview__remote")
        ?.getAttribute("src"),
    ).toBe("https://example.com/fixed.jpg");
  });

  it("shows the category badge only when requested and keeps overlay last", () => {
    const reference = makeReference({
      preview_url: null,
      asset_category: "environment",
    });
    const { container, rerender } = render(
      <ReferencePreview reference={reference} language="en" />,
    );

    expect(screen.queryByText("Environment")).toBeNull();

    rerender(
      <ReferencePreview
        reference={reference}
        language="en"
        categoryLabelVisible
        overlay={<span data-testid="preview-overlay">overlay</span>}
      />,
    );

    expect(screen.getByText("Environment")).toBeTruthy();
    expect(
      container.querySelector('[data-reference-art="environment"]')?.lastElementChild,
    ).toBe(screen.getByTestId("preview-overlay"));
  });
});
